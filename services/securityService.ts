import { SecurityEventType } from "@/domain/enums/SecurityEventType";
import { UserStatus } from "@/domain/enums/UserStatus";
import {
  getUserByEmail,
  lockUser,
  unlockUser,
  incrementFailedLoginAttempts,
  resetFailedLoginAttempts,
} from "@/infrastructure/repositories/userRepository";
import {
  createSecurityLog,
  getRecentFailedLoginAttempts,
} from "@/infrastructure/repositories/securityLogRepository";
import { logger } from "@/infrastructure/logging/logger";

/**
 * 安全服務（Security Service）
 * 處理安全相關業務邏輯：登入嘗試追蹤、帳號鎖定等
 */

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 分鐘
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 分鐘內的嘗試次數

export interface LoginAttemptResult {
  allowed: boolean;
  reason?: "account_locked" | "too_many_attempts";
  remainingLockTimeSeconds?: number;
}

/**
 * 驗證是否允許登入嘗試
 */
export async function validateLoginAttempt(
  email: string
): Promise<LoginAttemptResult> {
  const user = await getUserByEmail(email);

  // 檢查帳號是否被鎖定
  if (user && user.status === UserStatus.LOCKED) {
    if (user.lockedUntil) {
      const now = new Date();
      const lockedUntil = new Date(user.lockedUntil);

      if (now < lockedUntil) {
        // 仍在鎖定期間
        const remainingMs = lockedUntil.getTime() - now.getTime();
        const remainingSeconds = Math.ceil(remainingMs / 1000);

        logger.warn(`Login attempt for locked account: ${email}`);
        return {
          allowed: false,
          reason: "account_locked",
          remainingLockTimeSeconds: remainingSeconds,
        };
      } else {
        // 鎖定期已過，自動解鎖
        await unlockUser(user.id);
        await resetFailedLoginAttempts(user.id);
        logger.info(`Auto-unlocked account: ${email}`);
      }
    }
  }

  // 檢查最近的失敗嘗試次數
  const recentFailures = await getRecentFailedLoginAttempts(
    email,
    ATTEMPT_WINDOW_MS
  );

  if (recentFailures >= MAX_LOGIN_ATTEMPTS) {
    logger.warn(`Too many failed login attempts: ${email}`);
    return {
      allowed: false,
      reason: "too_many_attempts",
    };
  }

  return { allowed: true };
}

/**
 * 記錄登入失敗
 */
export async function recordLoginFailure(
  email: string,
  message: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  // 記錄安全日誌
  await createSecurityLog({
    email,
    eventType: SecurityEventType.LOGIN_FAILED,
    success: false,
    message,
    ipAddress,
    userAgent,
  });

  // 取得使用者
  const user = await getUserByEmail(email);
  if (!user) {
    return;
  }

  // 增加失敗次數
  await incrementFailedLoginAttempts(user.id);

  // 檢查是否需要鎖定帳號
  const updatedUser = await getUserByEmail(email);
  if (updatedUser && updatedUser.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
    await lockUser(updatedUser.id, LOCKOUT_DURATION_MS);

    // 記錄鎖定事件
    await createSecurityLog({
      userId: updatedUser.id,
      email: updatedUser.email,
      eventType: SecurityEventType.ACCOUNT_LOCKED,
      success: true,
      message: `Account locked due to ${MAX_LOGIN_ATTEMPTS} failed login attempts`,
      ipAddress,
      userAgent,
    });

    logger.warn(`Account locked: ${email}`);
  }
}

/**
 * 記錄登入成功
 */
export async function recordLoginSuccess(
  userId: string,
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  // 重置失敗次數
  await resetFailedLoginAttempts(userId);

  // 記錄安全日誌
  await createSecurityLog({
    userId,
    email,
    eventType: SecurityEventType.LOGIN_SUCCESS,
    success: true,
    message: "Login successful",
    ipAddress,
    userAgent,
  });

  logger.info(`Login successful: ${email}`);
}

/**
 * 記錄登出事件
 */
export async function recordLogout(
  userId: string,
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await createSecurityLog({
    userId,
    email,
    eventType: SecurityEventType.LOGOUT,
    success: true,
    message: "User logged out",
    ipAddress,
    userAgent,
  });

  logger.info(`Logout: ${email}`);
}

/**
 * 記錄註冊事件
 */
export async function recordRegistration(
  userId: string,
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await createSecurityLog({
    userId,
    email,
    eventType: SecurityEventType.REGISTRATION,
    success: true,
    message: "New user registered",
    ipAddress,
    userAgent,
  });

  logger.info(`New registration: ${email}`);
}

/**
 * 記錄失敗的登入（測試用簡化版本）
 */
export async function recordFailedLogin(email: string): Promise<void> {
  await recordLoginFailure(email, "Invalid credentials");
}

/**
 * 檢查帳號是否被鎖定
 */
export async function isAccountLocked(email: string): Promise<boolean> {
  const user = await getUserByEmail(email);

  if (!user) {
    return false;
  }

  if (user.lockedUntil) {
    const now = new Date();
    const lockoutUntil = new Date(user.lockedUntil);

    if (now < lockoutUntil) {
      return true;
    } else {
      // 鎖定時間已過，清除鎖定
      await unlockUser(user.id);
      await resetFailedLoginAttempts(user.id);
      return false;
    }
  }

  return false;
}

/**
 * 清除失敗的登入嘗試
 */
export async function clearFailedAttempts(email: string): Promise<void> {
  const user = await getUserByEmail(email);

  if (user) {
    await resetFailedLoginAttempts(user.id);
  }
}

/**
 * 取得失敗嘗試次數
 */
export async function getFailedAttempts(email: string): Promise<number> {
  const user = await getUserByEmail(email);

  if (!user) {
    return 0;
  }

  return user.failedLoginAttempts || 0;
}
