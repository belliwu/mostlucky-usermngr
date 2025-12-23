import {
  recordFailedLogin,
  isAccountLocked,
  clearFailedAttempts,
  getFailedAttempts,
} from "@/services/securityService";
import * as userRepository from "@/infrastructure/repositories/userRepository";
import * as securityLogRepository from "@/infrastructure/repositories/securityLogRepository";
import { SecurityEventType } from "@/domain/enums/SecurityEventType";

// Mock repositories
jest.mock("@/infrastructure/repositories/userRepository");
jest.mock("@/infrastructure/repositories/securityLogRepository");

describe("securityService", () => {
  const mockEmail = "test@example.com";
  const mockUserId = "user-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("recordFailedLogin", () => {
    it("應該記錄失敗的登入嘗試", async () => {
      const mockUser = {
        id: mockUserId,
        email: mockEmail,
        passwordHash: "hash",
        role: "user" as const,
        status: "active" as const,
        failedLoginAttempts: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (securityLogRepository.createSecurityLog as jest.Mock).mockResolvedValue(
        undefined
      );
      (userRepository.getUserByEmail as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, failedLoginAttempts: 1 });
      (
        userRepository.incrementFailedLoginAttempts as jest.Mock
      ).mockResolvedValue(undefined);

      await recordFailedLogin(mockEmail);

      expect(securityLogRepository.createSecurityLog).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockEmail,
          eventType: SecurityEventType.LOGIN_FAILED,
          success: false,
          message: expect.any(String),
        })
      );

      expect(userRepository.getUserByEmail).toHaveBeenCalledWith(mockEmail);
      expect(userRepository.incrementFailedLoginAttempts).toHaveBeenCalledWith(
        mockUserId
      );
    });

    it("應該在達到 5 次失敗後鎖定帳號", async () => {
      const mockUser = {
        id: mockUserId,
        email: mockEmail,
        passwordHash: "hash",
        role: "user" as const,
        status: "active" as const,
        failedLoginAttempts: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (securityLogRepository.createSecurityLog as jest.Mock).mockResolvedValue(
        undefined
      );

      (userRepository.getUserByEmail as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, failedLoginAttempts: 5 });
      (
        userRepository.incrementFailedLoginAttempts as jest.Mock
      ).mockResolvedValue(undefined);
      (userRepository.lockUser as jest.Mock).mockResolvedValue(undefined);

      await recordFailedLogin(mockEmail);

      expect(userRepository.lockUser).toHaveBeenCalledWith(
        mockUserId,
        15 * 60 * 1000
      );

      expect(securityLogRepository.createSecurityLog).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          email: mockEmail,
          eventType: SecurityEventType.LOGIN_FAILED,
          success: false,
        })
      );
      expect(securityLogRepository.createSecurityLog).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          userId: mockUserId,
          email: mockEmail,
          eventType: SecurityEventType.ACCOUNT_LOCKED,
          success: true,
        })
      );
    });

    it("應該處理不存在的使用者", async () => {
      (securityLogRepository.createSecurityLog as jest.Mock).mockResolvedValue(
        undefined
      );
      (userRepository.getUserByEmail as jest.Mock).mockResolvedValue(null);

      await recordFailedLogin(mockEmail);

      // 即使使用者不存在，也會記錄安全日誌（email 維度）
      expect(securityLogRepository.createSecurityLog).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockEmail,
          eventType: SecurityEventType.LOGIN_FAILED,
          success: false,
        })
      );
      expect(
        userRepository.incrementFailedLoginAttempts
      ).not.toHaveBeenCalled();
      expect(userRepository.lockUser).not.toHaveBeenCalled();
    });
  });

  describe("isAccountLocked", () => {
    it("應該回傳 false 當帳號未被鎖定", async () => {
      const mockUser = {
        id: mockUserId,
        email: mockEmail,
        passwordHash: "hash",
        role: "user" as const,
        status: "active" as const,
        failedLoginAttempts: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (userRepository.getUserByEmail as jest.Mock).mockResolvedValue(mockUser);

      const isLocked = await isAccountLocked(mockEmail);

      expect(isLocked).toBe(false);
    });

    it("應該回傳 true 當帳號在鎖定期間內", async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 未來 10 分鐘
      const mockUser = {
        id: mockUserId,
        email: mockEmail,
        passwordHash: "hash",
        role: "user" as const,
        status: "active" as const,
        failedLoginAttempts: 5,
        lockedUntil: futureDate.toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (userRepository.getUserByEmail as jest.Mock).mockResolvedValue(mockUser);

      const isLocked = await isAccountLocked(mockEmail);

      expect(isLocked).toBe(true);
    });

    it("應該回傳 false 並清除鎖定當鎖定時間已過", async () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 過去 10 分鐘
      const mockUser = {
        id: mockUserId,
        email: mockEmail,
        passwordHash: "hash",
        role: "user" as const,
        status: "active" as const,
        failedLoginAttempts: 5,
        lockedUntil: pastDate.toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (userRepository.getUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      (userRepository.unlockUser as jest.Mock).mockResolvedValue(undefined);
      (userRepository.resetFailedLoginAttempts as jest.Mock).mockResolvedValue(
        undefined
      );

      const isLocked = await isAccountLocked(mockEmail);

      expect(isLocked).toBe(false);
      expect(userRepository.unlockUser).toHaveBeenCalledWith(mockUserId);
      expect(userRepository.resetFailedLoginAttempts).toHaveBeenCalledWith(
        mockUserId
      );
    });

    it("應該處理不存在的使用者", async () => {
      (userRepository.getUserByEmail as jest.Mock).mockResolvedValue(null);

      const isLocked = await isAccountLocked(mockEmail);

      expect(isLocked).toBe(false);
    });
  });

  describe("clearFailedAttempts", () => {
    it("應該清除失敗的登入嘗試", async () => {
      const mockUser = {
        id: mockUserId,
        email: mockEmail,
        passwordHash: "hash",
        role: "user" as const,
        status: "active" as const,
        failedLoginAttempts: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (userRepository.getUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      (userRepository.resetFailedLoginAttempts as jest.Mock).mockResolvedValue(
        undefined
      );

      await clearFailedAttempts(mockEmail);

      expect(userRepository.resetFailedLoginAttempts).toHaveBeenCalledWith(
        mockUserId
      );
    });

    it("應該處理不存在的使用者", async () => {
      (userRepository.getUserByEmail as jest.Mock).mockResolvedValue(null);

      await clearFailedAttempts(mockEmail);

      expect(userRepository.resetFailedLoginAttempts).not.toHaveBeenCalled();
    });
  });

  describe("getFailedAttempts", () => {
    it("應該回傳失敗嘗試次數", async () => {
      const mockUser = {
        id: mockUserId,
        email: mockEmail,
        passwordHash: "hash",
        role: "user" as const,
        status: "active" as const,
        failedLoginAttempts: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (userRepository.getUserByEmail as jest.Mock).mockResolvedValue(mockUser);

      const attempts = await getFailedAttempts(mockEmail);

      expect(attempts).toBe(3);
    });

    it("應該回傳 0 當使用者不存在", async () => {
      (userRepository.getUserByEmail as jest.Mock).mockResolvedValue(null);

      const attempts = await getFailedAttempts(mockEmail);

      expect(attempts).toBe(0);
    });
  });

  describe("鎖定時間計算", () => {
    it("鎖定時間應該是 15 分鐘", async () => {
      const mockUser = {
        id: mockUserId,
        email: mockEmail,
        passwordHash: "hash",
        role: "user" as const,
        status: "active" as const,
        failedLoginAttempts: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (securityLogRepository.createSecurityLog as jest.Mock).mockResolvedValue(
        undefined
      );
      (userRepository.getUserByEmail as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, failedLoginAttempts: 5 });
      (
        userRepository.incrementFailedLoginAttempts as jest.Mock
      ).mockResolvedValue(undefined);
      (userRepository.lockUser as jest.Mock).mockResolvedValue(undefined);

      await recordFailedLogin(mockEmail);

      expect(userRepository.lockUser).toHaveBeenCalledWith(
        mockUserId,
        15 * 60 * 1000
      );
    });
  });
});
