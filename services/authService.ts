import {
  User,
  CreateUserData,
  toPublicInfo,
  UserPublicInfo,
} from "@/domain/models/User";
import { CreateSessionData } from "@/domain/models/Session";
import { UserStatus } from "@/domain/enums/UserStatus";
import { validateRegistrationData } from "@/domain/validators/userValidator";
import { validateLoginData } from "@/domain/validators/authValidator";
import {
  getUserByEmail,
  createUser,
  updateLastLoginAt,
} from "@/infrastructure/repositories/userRepository";
import {
  createSession,
  revokeSession,
} from "@/infrastructure/repositories/sessionRepository";
import { verifyPassword } from "@/infrastructure/security/passwordHasher";
import { verifyToken, JwtPayload } from "@/infrastructure/security/jwtManager";
import {
  validateLoginAttempt,
  recordLoginFailure,
  recordLoginSuccess,
  recordLogout,
  recordRegistration,
} from "@/services/securityService";
import { logger } from "@/infrastructure/logging/logger";

/**
 * 身份驗證服務（Auth Service）
 * 協調註冊、登入、登出的業務邏輯
 */

export interface RegisterResult {
  success: boolean;
  user?: UserPublicInfo;
  session?: { token: string; rememberMe: boolean };
  error?: string;
}

export interface LoginResult {
  success: boolean;
  user?: UserPublicInfo;
  session?: { token: string; rememberMe: boolean };
  error?: string;
  lockTimeRemaining?: number;
}

export interface LogoutResult {
  success: boolean;
  error?: string;
}

export interface VerifySessionResult {
  valid: boolean;
  user?: UserPublicInfo;
  error?: string;
}

/**
 * 使用者註冊（含自動登入）
 */
export async function register(
  email: string,
  password: string,
  rememberMe: boolean = false,
  ipAddress?: string,
  userAgent?: string
): Promise<RegisterResult> {
  try {
    // 驗證輸入
    const validation = validateRegistrationData(email, password);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors[0] || "註冊資料不正確",
      };
    }

    // 檢查 email 是否已存在
    const existing = await getUserByEmail(email);
    if (existing) {
      return {
        success: false,
        error: "Email already exists",
      };
    }

    // 建立使用者
    const user = await createUser({ email, password });

    // 記錄註冊事件
    await recordRegistration(user.id, user.email, ipAddress, userAgent);

    // 自動登入：建立會話
    const jwtPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const session = await createSession(
      { userId: user.id, rememberMe },
      jwtPayload
    );

    // 更新最後登入時間
    await updateLastLoginAt(user.id);

    logger.info(`User registered and auto-logged in: ${email}`);

    return {
      success: true,
      user: toPublicInfo(user),
      session: {
        token: session.token,
        rememberMe: session.rememberMe,
      },
    };
  } catch (error: any) {
    logger.error("Registration error:", error);
    return {
      success: false,
      error: "Registration failed",
    };
  }
}

/**
 * 使用者登入
 */
export async function login(
  email: string,
  password: string,
  rememberMe: boolean = false,
  ipAddress?: string,
  userAgent?: string
): Promise<LoginResult> {
  try {
    // 驗證輸入
    const validation = validateLoginData(email, password);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors[0] || "登入資料不正確",
      };
    }

    // 檢查登入嘗試是否允許
    const attemptCheck = await validateLoginAttempt(email);
    if (!attemptCheck.allowed) {
      if (attemptCheck.reason === "account_locked") {
        return {
          success: false,
          error: "Account is locked",
          lockTimeRemaining: attemptCheck.remainingLockTimeSeconds,
        };
      }
      return {
        success: false,
        error: "Too many failed login attempts",
      };
    }

    // 取得使用者
    const user = await getUserByEmail(email);
    if (!user) {
      await recordLoginFailure(email, "User not found", ipAddress, userAgent);
      return {
        success: false,
        error: "Invalid credentials",
      };
    }

    // 檢查帳號狀態
    if (user.status === UserStatus.DISABLED) {
      await recordLoginFailure(email, "Account disabled", ipAddress, userAgent);
      return {
        success: false,
        error: "Account is disabled",
      };
    }

    // 驗證密碼
    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      await recordLoginFailure(email, "Invalid password", ipAddress, userAgent);
      return {
        success: false,
        error: "Invalid credentials",
      };
    }

    // 登入成功：建立會話
    const jwtPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const session = await createSession(
      { userId: user.id, rememberMe },
      jwtPayload
    );

    // 更新最後登入時間
    await updateLastLoginAt(user.id);

    // 記錄登入成功
    await recordLoginSuccess(user.id, user.email, ipAddress, userAgent);

    return {
      success: true,
      user: toPublicInfo(user),
      session: {
        token: session.token,
        rememberMe: session.rememberMe,
      },
    };
  } catch (error: any) {
    logger.error("Login error:", error);
    return {
      success: false,
      error: "Login failed",
    };
  }
}

/**
 * 使用者登出
 */
export async function logout(
  token: string,
  ipAddress?: string,
  userAgent?: string
): Promise<LogoutResult> {
  try {
    // 驗證 token
    const payload = verifyToken(token);
    if (!payload) {
      return {
        success: false,
        error: "Invalid token",
      };
    }

    // 撤銷會話（找到會話並刪除）
    // 注意：這裡簡化處理，實際應該根據 token 找到對應的 session
    // 由於我們在 cookie 中儲存 token，需要從 sessionRepository 找到對應的 session
    const { getSessionByToken } = await import(
      "@/infrastructure/repositories/sessionRepository"
    );
    const session = await getSessionByToken(token);

    if (session) {
      await revokeSession(session.id);
    }

    // 記錄登出事件
    await recordLogout(payload.userId, payload.email, ipAddress, userAgent);

    return {
      success: true,
    };
  } catch (error: any) {
    logger.error("Logout error:", error);
    return {
      success: false,
      error: "Logout failed",
    };
  }
}

/**
 * 驗證會話（用於 middleware）
 */
export async function verifySession(
  token: string
): Promise<VerifySessionResult> {
  try {
    // 驗證 token
    const payload = verifyToken(token);
    if (!payload) {
      return {
        valid: false,
        error: "Invalid or expired token",
      };
    }

    // 取得使用者
    const user = await getUserByEmail(payload.email);
    if (!user) {
      return {
        valid: false,
        error: "User not found",
      };
    }

    // 檢查帳號狀態
    if (user.status !== UserStatus.ACTIVE) {
      return {
        valid: false,
        error: "Account is not active",
      };
    }

    return {
      valid: true,
      user: toPublicInfo(user),
    };
  } catch (error: any) {
    logger.error("Session verification error:", error);
    return {
      valid: false,
      error: "Session verification failed",
    };
  }
}

/**
 * 簡化的註冊函式（測試用）
 */
export async function registerUser(
  email: string,
  password: string
): Promise<RegisterResult> {
  return register(email, password, false);
}

/**
 * 簡化的登入函式（測試用）
 */
export async function loginUser(
  email: string,
  password: string,
  rememberMe: boolean
): Promise<LoginResult> {
  return login(email, password, rememberMe);
}

/**
 * 簡化的登出函式（測試用）
 */
export async function logoutUser(sessionId: string): Promise<LogoutResult> {
  return logout(sessionId);
}
