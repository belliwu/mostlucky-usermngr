import { register, login, logout } from "@/services/authService";
import * as userRepository from "@/infrastructure/repositories/userRepository";
import * as sessionRepository from "@/infrastructure/repositories/sessionRepository";
import * as securityLogRepository from "@/infrastructure/repositories/securityLogRepository";
import * as securityService from "@/services/securityService";
import * as jwtManager from "@/infrastructure/security/jwtManager";
import { hashPassword } from "@/infrastructure/security/passwordHasher";
import { SecurityEventType } from "@/domain/enums/SecurityEventType";

// Mock all repositories and services
jest.mock("@/infrastructure/repositories/userRepository");
jest.mock("@/infrastructure/repositories/sessionRepository");
jest.mock("@/infrastructure/repositories/securityLogRepository");
jest.mock("@/services/securityService");
jest.mock("@/infrastructure/security/jwtManager");

describe("auth-flow 整合測試", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // 預設情境：允許登入嘗試
    (securityService.validateLoginAttempt as jest.Mock).mockResolvedValue({
      allowed: true,
    });
    (securityService.recordRegistration as jest.Mock).mockResolvedValue(
      undefined
    );
    (securityService.recordLoginFailure as jest.Mock).mockResolvedValue(
      undefined
    );
    (securityService.recordLoginSuccess as jest.Mock).mockResolvedValue(
      undefined
    );
    (securityService.recordLogout as jest.Mock).mockResolvedValue(undefined);
  });

  describe("註冊流程 (T028)", () => {
    it("應該成功註冊新使用者並建立 session", async () => {
      const email = "newuser@example.com";
      const password = "Password123";

      (userRepository.getUserByEmail as jest.Mock).mockResolvedValue(null);
      (userRepository.createUser as jest.Mock).mockResolvedValue({
        id: "user-123",
        email,
        role: "user",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      (sessionRepository.createSession as jest.Mock).mockResolvedValue({
        id: "session-123",
        userId: "user-123",
        token: "mock-token",
        rememberMe: false,
      });
      (securityLogRepository.createSecurityLog as jest.Mock).mockResolvedValue(
        undefined
      );

      const result = await register(email, password, false);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.session).toBeDefined();
      expect(userRepository.getUserByEmail).toHaveBeenCalledWith(email);
      expect(userRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email,
        })
      );
      expect(sessionRepository.createSession).toHaveBeenCalled();
      expect(securityService.recordRegistration).toHaveBeenCalledWith(
        "user-123",
        email,
        undefined,
        undefined
      );
    });

    it("應該拒絕重複的 email", async () => {
      const email = "existing@example.com";
      const password = "Password123";

      (userRepository.getUserByEmail as jest.Mock).mockResolvedValue({
        id: "existing-user",
        email,
      });

      const result = await register(email, password, false);

      expect(result.success).toBe(false);
      expect(result.error).toContain("exists");
      expect(userRepository.createUser).not.toHaveBeenCalled();
    });

    it("應該拒絕無效的 email 格式", async () => {
      const email = "invalid-email";
      const password = "Password123";

      const result = await register(email, password, false);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(userRepository.getUserByEmail).not.toHaveBeenCalled();
    });

    it("應該拒絕弱密碼", async () => {
      const email = "user@example.com";
      const password = "weak";

      const result = await register(email, password, false);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(userRepository.getUserByEmail).not.toHaveBeenCalled();
    });

    it("應該記錄註冊成功的安全事件", async () => {
      const email = "newuser@example.com";
      const password = "Password123";

      (userRepository.getUserByEmail as jest.Mock).mockResolvedValue(null);
      (userRepository.createUser as jest.Mock).mockResolvedValue({
        id: "user-123",
        email,
      });
      (sessionRepository.createSession as jest.Mock).mockResolvedValue({
        id: "session-123",
        userId: "user-123",
        token: "mock-token",
        rememberMe: false,
      });
      (securityLogRepository.createSecurityLog as jest.Mock).mockResolvedValue(
        undefined
      );

      await register(email, password, false);

      expect(securityService.recordRegistration).toHaveBeenCalledWith(
        "user-123",
        email,
        undefined,
        undefined
      );
    });
  });

  describe("登入流程 (T037)", () => {
    it("應該成功登入並建立 session", async () => {
      const email = "user@example.com";
      const password = "Password123";
      const hashedPassword = await hashPassword(password);

      (userRepository.getUserByEmail as jest.Mock).mockResolvedValue({
        id: "user-123",
        email,
        passwordHash: hashedPassword,
        role: "user",
        status: "active",
      });
      (sessionRepository.createSession as jest.Mock).mockResolvedValue({
        id: "session-123",
        userId: "user-123",
        token: "mock-token",
        rememberMe: false,
      });
      (securityLogRepository.createSecurityLog as jest.Mock).mockResolvedValue(
        undefined
      );

      const result = await login(email, password, false);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.session).toBeDefined();
      expect(securityService.recordLoginSuccess).toHaveBeenCalledWith(
        "user-123",
        email,
        undefined,
        undefined
      );
    });

    it("應該拒絕錯誤的密碼", async () => {
      const email = "user@example.com";
      const password = "WrongPassword123";
      const correctPassword = "Password123";
      const hashedPassword = await hashPassword(correctPassword);

      (userRepository.getUserByEmail as jest.Mock).mockResolvedValue({
        id: "user-123",
        email,
        passwordHash: hashedPassword,
      });

      const result = await login(email, password, false);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(securityService.recordLoginFailure).toHaveBeenCalledWith(
        email,
        expect.any(String),
        undefined,
        undefined
      );
    });

    it("應該拒絕不存在的使用者", async () => {
      const email = "nonexistent@example.com";
      const password = "Password123";

      (userRepository.getUserByEmail as jest.Mock).mockResolvedValue(null);

      const result = await login(email, password, false);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("應該拒絕被鎖定的帳號", async () => {
      const email = "locked@example.com";
      const password = "Password123";

      (securityService.validateLoginAttempt as jest.Mock).mockResolvedValue({
        allowed: false,
        reason: "account_locked",
        remainingLockTimeSeconds: 60,
      });

      const result = await login(email, password, false);

      expect(result.success).toBe(false);
      expect(result.error).toContain("locked");
      expect(userRepository.getUserByEmail).not.toHaveBeenCalled();
    });

    it("應該正確處理 rememberMe 選項", async () => {
      const email = "user@example.com";
      const password = "Password123";
      const hashedPassword = await hashPassword(password);

      (userRepository.getUserByEmail as jest.Mock).mockResolvedValue({
        id: "user-123",
        email,
        passwordHash: hashedPassword,
        role: "user",
        status: "active",
      });
      (sessionRepository.createSession as jest.Mock).mockResolvedValue({
        id: "session-123",
        userId: "user-123",
        token: "mock-token",
        rememberMe: false,
      });
      (securityLogRepository.createSecurityLog as jest.Mock).mockResolvedValue(
        undefined
      );

      const resultWithRemember = await login(email, password, true);
      const resultWithoutRemember = await login(email, password, false);

      expect(resultWithRemember.success).toBe(true);
      expect(resultWithoutRemember.success).toBe(true);
      // Session 建立參數應該反映 rememberMe 選項
      expect(sessionRepository.createSession).toHaveBeenCalledTimes(2);
      expect(
        (sessionRepository.createSession as jest.Mock).mock.calls[0][0]
      ).toEqual(expect.objectContaining({ rememberMe: true }));
      expect(
        (sessionRepository.createSession as jest.Mock).mock.calls[1][0]
      ).toEqual(expect.objectContaining({ rememberMe: false }));
    });

    it("應該記錄登入成功的安全事件", async () => {
      const email = "user@example.com";
      const password = "Password123";
      const hashedPassword = await hashPassword(password);

      (userRepository.getUserByEmail as jest.Mock).mockResolvedValue({
        id: "user-123",
        email,
        passwordHash: hashedPassword,
        role: "user",
        status: "active",
      });
      (sessionRepository.createSession as jest.Mock).mockResolvedValue({
        id: "session-123",
        userId: "user-123",
        token: "mock-token",
        rememberMe: false,
      });
      (securityLogRepository.createSecurityLog as jest.Mock).mockResolvedValue(
        undefined
      );

      await login(email, password, false);

      expect(securityService.recordLoginSuccess).toHaveBeenCalledWith(
        "user-123",
        email,
        undefined,
        undefined
      );
    });
  });

  describe("登出流程 (T044)", () => {
    it("應該成功登出並撤銷 session", async () => {
      const token = "mock-token";
      const userId = "user-123";

      (jwtManager.verifyToken as jest.Mock).mockReturnValue({
        userId,
        email: "user@example.com",
      });

      (sessionRepository.getSessionByToken as jest.Mock).mockResolvedValue({
        id: "session-123",
        userId,
        token,
      });
      (sessionRepository.revokeSession as jest.Mock).mockResolvedValue(
        undefined
      );
      (securityLogRepository.createSecurityLog as jest.Mock).mockResolvedValue(
        undefined
      );

      const result = await logout(token);

      expect(result.success).toBe(true);
      expect(sessionRepository.revokeSession).toHaveBeenCalledWith(
        "session-123"
      );
      expect(securityService.recordLogout).toHaveBeenCalledWith(
        userId,
        "user@example.com",
        undefined,
        undefined
      );
    });

    it("應該處理不存在的 session", async () => {
      const token = "nonexistent-token";

      (jwtManager.verifyToken as jest.Mock).mockReturnValue({
        userId: "user-123",
        email: "user@example.com",
      });

      (sessionRepository.getSessionByToken as jest.Mock).mockResolvedValue(
        null
      );

      const result = await logout(token);

      // session 不存在也視為已完成登出（冪等）
      expect(result.success).toBe(true);
      expect(sessionRepository.revokeSession).not.toHaveBeenCalled();
    });

    it("應該記錄登出的安全事件", async () => {
      const token = "mock-token";
      const userId = "user-123";

      (jwtManager.verifyToken as jest.Mock).mockReturnValue({
        userId,
        email: "user@example.com",
      });

      (sessionRepository.getSessionByToken as jest.Mock).mockResolvedValue({
        id: "session-123",
        userId,
      });
      (sessionRepository.revokeSession as jest.Mock).mockResolvedValue(
        undefined
      );
      (securityLogRepository.createSecurityLog as jest.Mock).mockResolvedValue(
        undefined
      );

      await logout(token);

      expect(securityService.recordLogout).toHaveBeenCalled();
    });
  });

  describe("完整使用者旅程", () => {
    it("應該完成：註冊 → 登出 → 登入 → 登出", async () => {
      const email = "journey@example.com";
      const password = "Password123";

      // 1. 註冊
      (userRepository.getUserByEmail as jest.Mock).mockResolvedValue(null);
      (userRepository.createUser as jest.Mock).mockResolvedValue({
        id: "user-journey",
        email,
        role: "user",
        status: "active",
      });
      (sessionRepository.createSession as jest.Mock).mockResolvedValue({
        id: "session-1",
        userId: "user-journey",
        token: "token-1",
        rememberMe: false,
      });
      (securityLogRepository.createSecurityLog as jest.Mock).mockResolvedValue(
        undefined
      );

      const registerResult = await register(email, password, false);
      expect(registerResult.success).toBe(true);

      // 2. 登出
      (jwtManager.verifyToken as jest.Mock).mockImplementation((t: string) => {
        if (t === "token-1" || t === "token-2") {
          return { userId: "user-journey", email };
        }
        return null;
      });

      (sessionRepository.getSessionByToken as jest.Mock).mockResolvedValue({
        id: "session-1",
        userId: "user-journey",
      });
      (sessionRepository.revokeSession as jest.Mock).mockResolvedValue(
        undefined
      );

      const logoutResult1 = await logout("token-1");
      expect(logoutResult1.success).toBe(true);

      // 3. 登入
      const hashedPassword = await hashPassword(password);
      (userRepository.getUserByEmail as jest.Mock).mockResolvedValue({
        id: "user-journey",
        email,
        passwordHash: hashedPassword,
        role: "user",
        status: "active",
      });
      (sessionRepository.createSession as jest.Mock).mockResolvedValue({
        id: "session-2",
        userId: "user-journey",
        token: "token-2",
        rememberMe: false,
      });

      const loginResult = await login(email, password, false);
      expect(loginResult.success).toBe(true);

      // 4. 再次登出
      (sessionRepository.getSessionByToken as jest.Mock).mockResolvedValue({
        id: "session-2",
        userId: "user-journey",
      });

      const logoutResult2 = await logout("token-2");
      expect(logoutResult2.success).toBe(true);

      // 驗證所有操作都被記錄
      expect(securityService.recordRegistration).toHaveBeenCalledTimes(1);
      expect(securityService.recordLoginSuccess).toHaveBeenCalledTimes(1);
      expect(securityService.recordLogout).toHaveBeenCalledTimes(2);
    });
  });
});
