import { registerUser, loginUser, logoutUser } from "@/services/authService";
import * as userRepository from "@/infrastructure/repositories/userRepository";
import * as sessionRepository from "@/infrastructure/repositories/sessionRepository";
import * as securityLogRepository from "@/infrastructure/repositories/securityLogRepository";
import * as securityService from "@/services/securityService";
import { hashPassword } from "@/infrastructure/security/passwordHasher";
import { verifyToken } from "@/infrastructure/security/jwtManager";

// Mock all repositories and services
jest.mock("@/infrastructure/repositories/userRepository");
jest.mock("@/infrastructure/repositories/sessionRepository");
jest.mock("@/infrastructure/repositories/securityLogRepository");
jest.mock("@/services/securityService");

describe("auth-flow 整合測試", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("註冊流程 (T028)", () => {
    it("應該成功註冊新使用者並建立 session", async () => {
      const email = "newuser@example.com";
      const password = "Password123";

      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (userRepository.createUser as jest.Mock).mockResolvedValue({
        id: "user-123",
        email,
        role: "user",
        status: "active",
        createdAt: new Date(),
      });
      (sessionRepository.createSession as jest.Mock).mockResolvedValue({
        id: "session-123",
        userId: "user-123",
        token: "mock-token",
      });
      (securityLogRepository.createLog as jest.Mock).mockResolvedValue(
        undefined
      );

      const result = await registerUser(email, password);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.session).toBeDefined();
      expect(userRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(userRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email,
          role: "user",
          status: "active",
        })
      );
      expect(sessionRepository.createSession).toHaveBeenCalled();
      expect(securityLogRepository.createLog).toHaveBeenCalled();
    });

    it("應該拒絕重複的 email", async () => {
      const email = "existing@example.com";
      const password = "Password123";

      (userRepository.findByEmail as jest.Mock).mockResolvedValue({
        id: "existing-user",
        email,
      });

      const result = await registerUser(email, password);

      expect(result.success).toBe(false);
      expect(result.error).toContain("已存在");
      expect(userRepository.createUser).not.toHaveBeenCalled();
    });

    it("應該拒絕無效的 email 格式", async () => {
      const email = "invalid-email";
      const password = "Password123";

      const result = await registerUser(email, password);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(userRepository.findByEmail).not.toHaveBeenCalled();
    });

    it("應該拒絕弱密碼", async () => {
      const email = "user@example.com";
      const password = "weak";

      const result = await registerUser(email, password);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(userRepository.findByEmail).not.toHaveBeenCalled();
    });

    it("應該記錄註冊成功的安全事件", async () => {
      const email = "newuser@example.com";
      const password = "Password123";

      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (userRepository.createUser as jest.Mock).mockResolvedValue({
        id: "user-123",
        email,
      });
      (sessionRepository.createSession as jest.Mock).mockResolvedValue({});
      (securityLogRepository.createLog as jest.Mock).mockResolvedValue(
        undefined
      );

      await registerUser(email, password);

      expect(securityLogRepository.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          eventType: expect.stringContaining("REGISTER"),
        })
      );
    });
  });

  describe("登入流程 (T037)", () => {
    it("應該成功登入並建立 session", async () => {
      const email = "user@example.com";
      const password = "Password123";
      const hashedPassword = await hashPassword(password);

      (securityService.isAccountLocked as jest.Mock).mockResolvedValue(false);
      (userRepository.findByEmail as jest.Mock).mockResolvedValue({
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
      });
      (securityService.clearFailedAttempts as jest.Mock).mockResolvedValue(
        undefined
      );
      (securityLogRepository.createLog as jest.Mock).mockResolvedValue(
        undefined
      );

      const result = await loginUser(email, password, false);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.session).toBeDefined();
      expect(securityService.clearFailedAttempts).toHaveBeenCalledWith(email);
    });

    it("應該拒絕錯誤的密碼", async () => {
      const email = "user@example.com";
      const password = "WrongPassword123";
      const correctPassword = "Password123";
      const hashedPassword = await hashPassword(correctPassword);

      (securityService.isAccountLocked as jest.Mock).mockResolvedValue(false);
      (userRepository.findByEmail as jest.Mock).mockResolvedValue({
        id: "user-123",
        email,
        passwordHash: hashedPassword,
      });
      (securityService.recordFailedLogin as jest.Mock).mockResolvedValue(
        undefined
      );

      const result = await loginUser(email, password, false);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(securityService.recordFailedLogin).toHaveBeenCalledWith(email);
    });

    it("應該拒絕不存在的使用者", async () => {
      const email = "nonexistent@example.com";
      const password = "Password123";

      (securityService.isAccountLocked as jest.Mock).mockResolvedValue(false);
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      const result = await loginUser(email, password, false);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("應該拒絕被鎖定的帳號", async () => {
      const email = "locked@example.com";
      const password = "Password123";

      (securityService.isAccountLocked as jest.Mock).mockResolvedValue(true);
      (securityService.getFailedAttempts as jest.Mock).mockResolvedValue(5);

      const result = await loginUser(email, password, false);

      expect(result.success).toBe(false);
      expect(result.error).toContain("鎖定");
      expect(userRepository.findByEmail).not.toHaveBeenCalled();
    });

    it("應該正確處理 rememberMe 選項", async () => {
      const email = "user@example.com";
      const password = "Password123";
      const hashedPassword = await hashPassword(password);

      (securityService.isAccountLocked as jest.Mock).mockResolvedValue(false);
      (userRepository.findByEmail as jest.Mock).mockResolvedValue({
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
      });
      (securityService.clearFailedAttempts as jest.Mock).mockResolvedValue(
        undefined
      );
      (securityLogRepository.createLog as jest.Mock).mockResolvedValue(
        undefined
      );

      const resultWithRemember = await loginUser(email, password, true);
      const resultWithoutRemember = await loginUser(email, password, false);

      expect(resultWithRemember.success).toBe(true);
      expect(resultWithoutRemember.success).toBe(true);
      // Session 建立參數應該反映 rememberMe 選項
      expect(sessionRepository.createSession).toHaveBeenCalledTimes(2);
    });

    it("應該記錄登入成功的安全事件", async () => {
      const email = "user@example.com";
      const password = "Password123";
      const hashedPassword = await hashPassword(password);

      (securityService.isAccountLocked as jest.Mock).mockResolvedValue(false);
      (userRepository.findByEmail as jest.Mock).mockResolvedValue({
        id: "user-123",
        email,
        passwordHash: hashedPassword,
        role: "user",
        status: "active",
      });
      (sessionRepository.createSession as jest.Mock).mockResolvedValue({});
      (securityService.clearFailedAttempts as jest.Mock).mockResolvedValue(
        undefined
      );
      (securityLogRepository.createLog as jest.Mock).mockResolvedValue(
        undefined
      );

      await loginUser(email, password, false);

      expect(securityLogRepository.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          eventType: expect.stringContaining("LOGIN"),
        })
      );
    });
  });

  describe("登出流程 (T044)", () => {
    it("應該成功登出並撤銷 session", async () => {
      const sessionId = "session-123";
      const userId = "user-123";

      (sessionRepository.findById as jest.Mock).mockResolvedValue({
        id: sessionId,
        userId,
        token: "mock-token",
      });
      (sessionRepository.revokeSession as jest.Mock).mockResolvedValue(
        undefined
      );
      (securityLogRepository.createLog as jest.Mock).mockResolvedValue(
        undefined
      );

      const result = await logoutUser(sessionId);

      expect(result.success).toBe(true);
      expect(sessionRepository.revokeSession).toHaveBeenCalledWith(sessionId);
      expect(securityLogRepository.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          eventType: expect.stringContaining("LOGOUT"),
        })
      );
    });

    it("應該處理不存在的 session", async () => {
      const sessionId = "nonexistent-session";

      (sessionRepository.findById as jest.Mock).mockResolvedValue(null);

      const result = await logoutUser(sessionId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(sessionRepository.revokeSession).not.toHaveBeenCalled();
    });

    it("應該記錄登出的安全事件", async () => {
      const sessionId = "session-123";
      const userId = "user-123";

      (sessionRepository.findById as jest.Mock).mockResolvedValue({
        id: sessionId,
        userId,
      });
      (sessionRepository.revokeSession as jest.Mock).mockResolvedValue(
        undefined
      );
      (securityLogRepository.createLog as jest.Mock).mockResolvedValue(
        undefined
      );

      await logoutUser(sessionId);

      expect(securityLogRepository.createLog).toHaveBeenCalled();
    });
  });

  describe("完整使用者旅程", () => {
    it("應該完成：註冊 → 登出 → 登入 → 登出", async () => {
      const email = "journey@example.com";
      const password = "Password123";

      // 1. 註冊
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
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
      });
      (securityLogRepository.createLog as jest.Mock).mockResolvedValue(
        undefined
      );

      const registerResult = await registerUser(email, password);
      expect(registerResult.success).toBe(true);

      // 2. 登出
      (sessionRepository.findById as jest.Mock).mockResolvedValue({
        id: "session-1",
        userId: "user-journey",
      });
      (sessionRepository.revokeSession as jest.Mock).mockResolvedValue(
        undefined
      );

      const logoutResult1 = await logoutUser("session-1");
      expect(logoutResult1.success).toBe(true);

      // 3. 登入
      const hashedPassword = await hashPassword(password);
      (securityService.isAccountLocked as jest.Mock).mockResolvedValue(false);
      (userRepository.findByEmail as jest.Mock).mockResolvedValue({
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
      });
      (securityService.clearFailedAttempts as jest.Mock).mockResolvedValue(
        undefined
      );

      const loginResult = await loginUser(email, password, false);
      expect(loginResult.success).toBe(true);

      // 4. 再次登出
      (sessionRepository.findById as jest.Mock).mockResolvedValue({
        id: "session-2",
        userId: "user-journey",
      });

      const logoutResult2 = await logoutUser("session-2");
      expect(logoutResult2.success).toBe(true);

      // 驗證所有操作都被記錄
      expect(securityLogRepository.createLog).toHaveBeenCalledTimes(4);
    });
  });
});
