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
        lastFailedLoginAt: null,
        lockoutUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (userRepository.updateUser as jest.Mock).mockResolvedValue(undefined);
      (securityLogRepository.createLog as jest.Mock).mockResolvedValue(
        undefined
      );

      await recordFailedLogin(mockEmail);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(mockEmail);
      expect(userRepository.updateUser).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          failedLoginAttempts: 1,
          lastFailedLoginAt: expect.any(Date),
        })
      );
      expect(securityLogRepository.createLog).toHaveBeenCalledWith({
        userId: mockUserId,
        eventType: SecurityEventType.LOGIN_FAILED,
        details: expect.any(String),
      });
    });

    it("應該在達到 5 次失敗後鎖定帳號", async () => {
      const mockUser = {
        id: mockUserId,
        email: mockEmail,
        passwordHash: "hash",
        role: "user" as const,
        status: "active" as const,
        failedLoginAttempts: 4,
        lastFailedLoginAt: new Date(),
        lockoutUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (userRepository.updateUser as jest.Mock).mockResolvedValue(undefined);
      (securityLogRepository.createLog as jest.Mock).mockResolvedValue(
        undefined
      );

      await recordFailedLogin(mockEmail);

      expect(userRepository.updateUser).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          failedLoginAttempts: 5,
          lockoutUntil: expect.any(Date),
        })
      );
      expect(securityLogRepository.createLog).toHaveBeenCalledWith({
        userId: mockUserId,
        eventType: SecurityEventType.ACCOUNT_LOCKED,
        details: expect.stringContaining("5"),
      });
    });

    it("應該處理不存在的使用者", async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      await recordFailedLogin(mockEmail);

      expect(userRepository.updateUser).not.toHaveBeenCalled();
      expect(securityLogRepository.createLog).not.toHaveBeenCalled();
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
        lastFailedLoginAt: new Date(),
        lockoutUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);

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
        lastFailedLoginAt: new Date(),
        lockoutUntil: futureDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);

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
        lastFailedLoginAt: new Date(),
        lockoutUntil: pastDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (userRepository.updateUser as jest.Mock).mockResolvedValue(undefined);

      const isLocked = await isAccountLocked(mockEmail);

      expect(isLocked).toBe(false);
      expect(userRepository.updateUser).toHaveBeenCalledWith(mockUserId, {
        failedLoginAttempts: 0,
        lockoutUntil: null,
      });
    });

    it("應該處理不存在的使用者", async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);

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
        lastFailedLoginAt: new Date(),
        lockoutUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (userRepository.updateUser as jest.Mock).mockResolvedValue(undefined);

      await clearFailedAttempts(mockEmail);

      expect(userRepository.updateUser).toHaveBeenCalledWith(mockUserId, {
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockoutUntil: null,
      });
    });

    it("應該處理不存在的使用者", async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      await clearFailedAttempts(mockEmail);

      expect(userRepository.updateUser).not.toHaveBeenCalled();
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
        lastFailedLoginAt: new Date(),
        lockoutUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      const attempts = await getFailedAttempts(mockEmail);

      expect(attempts).toBe(3);
    });

    it("應該回傳 0 當使用者不存在", async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);

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
        lastFailedLoginAt: new Date(),
        lockoutUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (userRepository.updateUser as jest.Mock).mockResolvedValue(undefined);

      const beforeTime = Date.now();
      await recordFailedLogin(mockEmail);
      const afterTime = Date.now();

      const updateCall = (userRepository.updateUser as jest.Mock).mock.calls[0];
      const lockoutTime = updateCall[1].lockoutUntil;
      const lockoutDuration = lockoutTime.getTime() - beforeTime;

      // 鎖定時間應該在 15 分鐘左右（考慮執行時間誤差）
      expect(lockoutDuration).toBeGreaterThanOrEqual(15 * 60 * 1000 - 1000);
      expect(lockoutDuration).toBeLessThanOrEqual(15 * 60 * 1000 + 1000);
    });
  });
});
