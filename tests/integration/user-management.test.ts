import { getUserInfo } from "@/services/userService";
import * as userRepository from "@/infrastructure/repositories/userRepository";
import { UserRole } from "@/domain/enums/UserRole";
import { UserStatus } from "@/domain/enums/UserStatus";

jest.mock("@/infrastructure/repositories/userRepository");

describe("user-management 整合測試 (T050)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getUserInfo", () => {
    it("應該成功取得使用者資訊", async () => {
      const mockUser = {
        id: "user-123",
        email: "user@example.com",
        passwordHash: "hash",
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockoutUntil: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-02"),
      };

      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await getUserInfo("user-123");

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe("user-123");
      expect(result.user?.email).toBe("user@example.com");
      expect(result.user?.role).toBe(UserRole.USER);
      expect(userRepository.findById).toHaveBeenCalledWith("user-123");
    });

    it("應該處理不存在的使用者", async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      const result = await getUserInfo("nonexistent-user");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.user).toBeUndefined();
    });

    it("應該回傳使用者的 createdAt 資訊", async () => {
      const createdDate = new Date("2024-01-15T10:30:00Z");
      const mockUser = {
        id: "user-123",
        email: "user@example.com",
        passwordHash: "hash",
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockoutUntil: null,
        createdAt: createdDate,
        updatedAt: new Date(),
      };

      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await getUserInfo("user-123");

      expect(result.success).toBe(true);
      expect(result.user?.createdAt).toEqual(createdDate);
    });

    it("應該支援 admin 角色的使用者", async () => {
      const mockAdmin = {
        id: "admin-123",
        email: "admin@example.com",
        passwordHash: "hash",
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockoutUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (userRepository.findById as jest.Mock).mockResolvedValue(mockAdmin);

      const result = await getUserInfo("admin-123");

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe(UserRole.ADMIN);
    });

    it("應該回傳使用者狀態", async () => {
      const mockUser = {
        id: "user-123",
        email: "user@example.com",
        passwordHash: "hash",
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockoutUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await getUserInfo("user-123");

      expect(result.success).toBe(true);
      expect(result.user?.status).toBe(UserStatus.ACTIVE);
    });

    it("應該處理 LOCKED 狀態的使用者", async () => {
      const mockUser = {
        id: "user-123",
        email: "locked@example.com",
        passwordHash: "hash",
        role: UserRole.USER,
        status: UserStatus.LOCKED,
        failedLoginAttempts: 5,
        lastFailedLoginAt: new Date(),
        lockoutUntil: new Date(Date.now() + 15 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await getUserInfo("user-123");

      expect(result.success).toBe(true);
      expect(result.user?.status).toBe(UserStatus.LOCKED);
      expect(result.user?.failedLoginAttempts).toBe(5);
    });

    it("應該處理 INACTIVE 狀態的使用者", async () => {
      const mockUser = {
        id: "user-123",
        email: "inactive@example.com",
        passwordHash: "hash",
        role: UserRole.USER,
        status: UserStatus.INACTIVE,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockoutUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await getUserInfo("user-123");

      expect(result.success).toBe(true);
      expect(result.user?.status).toBe(UserStatus.INACTIVE);
    });

    it("不應該回傳密碼雜湊給前端", async () => {
      const mockUser = {
        id: "user-123",
        email: "user@example.com",
        passwordHash: "super-secret-hash",
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockoutUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await getUserInfo("user-123");

      expect(result.success).toBe(true);
      // 確保回傳的使用者物件不包含 passwordHash
      const userObj = JSON.parse(JSON.stringify(result.user));
      expect(userObj).not.toHaveProperty("passwordHash");
    });

    it("應該處理資料庫錯誤", async () => {
      (userRepository.findById as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      const result = await getUserInfo("user-123");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("應該處理無效的 userId", async () => {
      const result = await getUserInfo("");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("應該處理 null userId", async () => {
      const result = await getUserInfo(null as any);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("儀表板資料完整性", () => {
    it("應該包含所有必要的顯示欄位", async () => {
      const mockUser = {
        id: "user-123",
        email: "display@example.com",
        passwordHash: "hash",
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockoutUntil: null,
        createdAt: new Date("2024-06-15"),
        updatedAt: new Date(),
      };

      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await getUserInfo("user-123");

      expect(result.success).toBe(true);
      expect(result.user).toHaveProperty("id");
      expect(result.user).toHaveProperty("email");
      expect(result.user).toHaveProperty("role");
      expect(result.user).toHaveProperty("status");
      expect(result.user).toHaveProperty("createdAt");
    });

    it("email 格式應該正確", async () => {
      const mockUser = {
        id: "user-123",
        email: "test.user+tag@example.co.uk",
        passwordHash: "hash",
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockoutUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await getUserInfo("user-123");

      expect(result.success).toBe(true);
      expect(result.user?.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it("createdAt 應該是有效的日期", async () => {
      const mockUser = {
        id: "user-123",
        email: "user@example.com",
        passwordHash: "hash",
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockoutUntil: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date(),
      };

      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await getUserInfo("user-123");

      expect(result.success).toBe(true);
      expect(result.user?.createdAt).toBeInstanceOf(Date);
      expect(result.user?.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
});
