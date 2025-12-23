import { UserRole, UserStatus } from "@/domain/enums";
import { readJsonFile, writeJsonFile } from "@/infrastructure/database/jsonDb";
import path from "path";

/**
 * UserRepository 測試
 * 測試重點：
 * 1. createUser 不會造成死鎖
 * 2. 正確處理 email 重複
 * 3. 密碼正確雜湊
 */

const TEST_USERS_PATH = path.join(
  process.cwd(),
  "tests",
  "fixtures",
  "temp",
  `test-users.userRepository.jest-${process.env.JEST_WORKER_ID ?? "0"}.json`
);
const TEST_SESSIONS_PATH = path.join(
  process.cwd(),
  "tests",
  "fixtures",
  "temp",
  `test-sessions.userRepository.jest-${process.env.JEST_WORKER_ID ?? "0"}.json`
);
const TEST_LOGS_PATH = path.join(
  process.cwd(),
  "tests",
  "fixtures",
  "temp",
  `test-security-logs.userRepository.jest-${
    process.env.JEST_WORKER_ID ?? "0"
  }.json`
);

// Mock DB_CONFIG - 必須在 import repository 之前
jest.mock("@/infrastructure/database/dbConfig", () => ({
  DB_CONFIG: {
    usersPath: path.join(
      process.cwd(),
      "tests",
      "fixtures",
      "temp",
      `test-users.userRepository.jest-${process.env.JEST_WORKER_ID ?? "0"}.json`
    ),
    sessionsPath: path.join(
      process.cwd(),
      "tests",
      "fixtures",
      "temp",
      `test-sessions.userRepository.jest-${
        process.env.JEST_WORKER_ID ?? "0"
      }.json`
    ),
    securityLogsPath: path.join(
      process.cwd(),
      "tests",
      "fixtures",
      "temp",
      `test-security-logs.userRepository.jest-${
        process.env.JEST_WORKER_ID ?? "0"
      }.json`
    ),
  },
}));

// Import 必須在 mock 之後
import {
  createUser,
  getUserByEmail,
  updateUser,
} from "@/infrastructure/repositories/userRepository";

describe("userRepository", () => {
  beforeEach(async () => {
    // 清空測試資料
    await writeJsonFile(TEST_USERS_PATH, []);
  });

  describe("createUser", () => {
    it("應該成功建立使用者", async () => {
      const userData = {
        email: "test@example.com",
        password: "Password123",
      };

      const user = await createUser(userData);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.passwordHash).not.toBe(userData.password); // 應該被雜湊
      expect(user.role).toBe(UserRole.USER);
      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
      expect(user.failedLoginAttempts).toBe(0);
    });

    it("應該拋出錯誤當 email 已存在", async () => {
      const userData = {
        email: "duplicate@example.com",
        password: "Password123",
      };

      // 第一次建立成功
      await createUser(userData);

      // 第二次應該失敗
      await expect(createUser(userData)).rejects.toThrow(
        "Email already exists"
      );
    });

    it("應該正確設定自訂角色", async () => {
      const userData = {
        email: "admin@example.com",
        password: "Password123",
        role: UserRole.ADMIN,
      };

      const user = await createUser(userData);

      expect(user.role).toBe(UserRole.ADMIN);
    });

    it("應該不會造成死鎖 - 測試並發建立使用者", async () => {
      const users = Array.from({ length: 5 }, (_, i) => ({
        email: `user${i}@example.com`,
        password: "Password123",
      }));

      const promises = users.map((userData) => createUser(userData));

      // 如果有死鎖，這會超時
      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((user, i) => {
        expect(user.email).toBe(`user${i}@example.com`);
      });

      // 驗證所有使用者都被寫入
      const allUsers = await readJsonFile(TEST_USERS_PATH);
      expect(allUsers).toHaveLength(5);
    }, 10000); // 10 秒超時
  });

  describe("getUserByEmail", () => {
    it("應該找到存在的使用者", async () => {
      const userData = {
        email: "find@example.com",
        password: "Password123",
      };
      await createUser(userData);

      const user = await getUserByEmail(userData.email);

      expect(user).toBeDefined();
      expect(user?.email).toBe(userData.email);
    });

    it("應該回傳 null 當使用者不存在", async () => {
      const user = await getUserByEmail("notfound@example.com");

      expect(user).toBeNull();
    });
  });

  describe("updateUser", () => {
    it("應該成功更新使用者資料", async () => {
      const userData = {
        email: "update@example.com",
        password: "Password123",
      };
      const user = await createUser(userData);

      const updated = await updateUser(user.id, {
        status: UserStatus.INACTIVE,
        failedLoginAttempts: 3,
      });

      expect(updated).toBeDefined();
      expect(updated?.status).toBe(UserStatus.INACTIVE);
      expect(updated?.failedLoginAttempts).toBe(3);
      expect(updated?.email).toBe(userData.email); // 其他欄位不變
      expect(updated?.updatedAt).not.toBe(user.updatedAt); // updatedAt 應該更新
    });

    it("應該回傳 null 當使用者不存在", async () => {
      const updated = await updateUser("nonexistent-id", {
        status: UserStatus.INACTIVE,
      });

      expect(updated).toBeNull();
    });

    it("應該不允許修改使用者 ID", async () => {
      const userData = {
        email: "protect-id@example.com",
        password: "Password123",
      };
      const user = await createUser(userData);
      const originalId = user.id;

      const updated = await updateUser(user.id, {
        id: "new-id-should-not-work",
      } as any);

      expect(updated?.id).toBe(originalId); // ID 不應該改變
    });
  });
});
