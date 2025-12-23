import { writeJsonFile } from "@/infrastructure/database/jsonDb";
import path from "path";

/**
 * AuthService Register 測試
 * 測試重點：
 * 1. 完整註冊流程不會造成死鎖
 * 2. 驗證邏輯正確（使用 success 而非 valid）
 * 3. 自動登入功能正常
 */

const TEST_USERS_PATH = path.join(
  process.cwd(),
  "tests",
  "fixtures",
  "temp",
  "test-users.json"
);
const TEST_SESSIONS_PATH = path.join(
  process.cwd(),
  "tests",
  "fixtures",
  "temp",
  "test-sessions.json"
);
const TEST_LOGS_PATH = path.join(
  process.cwd(),
  "tests",
  "fixtures",
  "temp",
  "test-security-logs.json"
);

// Mock DB_CONFIG - 必須在 import 之前
jest.mock("@/infrastructure/database/dbConfig", () => ({
  DB_CONFIG: {
    usersPath: path.join(
      process.cwd(),
      "tests",
      "fixtures",
      "temp",
      "test-users.json"
    ),
    sessionsPath: path.join(
      process.cwd(),
      "tests",
      "fixtures",
      "temp",
      "test-sessions.json"
    ),
    securityLogsPath: path.join(
      process.cwd(),
      "tests",
      "fixtures",
      "temp",
      "test-security-logs.json"
    ),
  },
}));

// Import 必須在 mock 之後
import { register } from "@/services/authService";

describe("authService - register", () => {
  beforeEach(async () => {
    // 清空測試資料
    await writeJsonFile(TEST_USERS_PATH, []);
    await writeJsonFile(TEST_SESSIONS_PATH, []);
    await writeJsonFile(TEST_LOGS_PATH, []);
  });

  describe("成功註冊流程", () => {
    it("應該成功註冊並自動登入", async () => {
      const result = await register(
        "newuser@example.com",
        "Password123",
        false
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe("newuser@example.com");
      expect(result.session).toBeDefined();
      expect(result.session?.token).toBeDefined();
      expect(result.session?.rememberMe).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it("應該支援「記住我」功能", async () => {
      const result = await register(
        "rememberme@example.com",
        "Password123",
        true
      );

      expect(result.success).toBe(true);
      expect(result.session?.rememberMe).toBe(true);
    });

    it("應該不會造成死鎖", async () => {
      // 設定 10 秒超時，如果有死鎖會超時失敗
      const promise = register("nodeadlock@example.com", "Password123", false);

      const result = await Promise.race([
        promise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout - possible deadlock")), 10000)
        ),
      ]);

      expect(result.success).toBe(true);
    }, 15000);
  });

  describe("驗證邏輯", () => {
    it("應該拒絕無效的 email", async () => {
      const result = await register("invalid-email", "Password123", false);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // 錯誤訊息包含 "email" (不分大小寫)
      expect(result.error?.toLowerCase()).toMatch(/email|電子郵件/);
    });

    it("應該拒絕弱密碼", async () => {
      const result = await register("weak@example.com", "weak", false);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("應該拒絕沒有大寫字母的密碼", async () => {
      const result = await register("test@example.com", "password123", false);

      expect(result.success).toBe(false);
      expect(result.error).toContain("大寫");
    });

    it("應該拒絕沒有小寫字母的密碼", async () => {
      const result = await register("test@example.com", "PASSWORD123", false);

      expect(result.success).toBe(false);
      expect(result.error).toContain("小寫");
    });

    it("應該拒絕沒有數字的密碼", async () => {
      const result = await register("test@example.com", "PasswordABC", false);

      expect(result.success).toBe(false);
      expect(result.error).toContain("數字");
    });

    it("應該拒絕太短的密碼", async () => {
      const result = await register("test@example.com", "Pass1", false);

      expect(result.success).toBe(false);
      expect(result.error).toContain("8");
    });

    it("驗證結果應該使用 success 而非 valid", async () => {
      // 這個測試確保我們修正了 ValidationResult 介面不一致的問題
      // 如果還在使用 valid，這個測試會失敗（因為會讀取到 undefined）
      const result = await register("valid@example.com", "Password123", false);

      expect(result.success).toBe(true);
      // 如果 ValidationResult 使用 valid 而程式碼檢查 success，
      // 這裡會是 false（驗證失敗）
    });
  });

  describe("重複註冊", () => {
    it("應該拒絕重複的 email", async () => {
      // 第一次註冊
      await register("duplicate@example.com", "Password123", false);

      // 第二次註冊應該失敗
      const result = await register("duplicate@example.com", "Password123", false);

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
    });
  });

  describe("會話建立", () => {
    it("應該建立有效的 JWT token", async () => {
      const result = await register("jwt@example.com", "Password123", false);

      expect(result.session?.token).toBeDefined();
      expect(typeof result.session?.token).toBe("string");
      expect(result.session?.token.length).toBeGreaterThan(20);
    });

    it("應該在資料庫中建立會話記錄", async () => {
      await register("session@example.com", "Password123", false);

      const sessions = await import("@/infrastructure/database/jsonDb").then((m) =>
        m.readJsonFile(TEST_SESSIONS_PATH)
      );

      expect(sessions.length).toBeGreaterThan(0);
    });
  });

  describe("錯誤處理", () => {
    it("應該正確處理重複的 email", async () => {
      // 建立第一個使用者
      await register("duplicate@example.com", "Password123", false);

      // 嘗試建立重複的使用者應該失敗
      const result = await register("duplicate@example.com", "Password123", false);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("並發註冊", () => {
    it("應該正確處理多個同時註冊", async () => {
      const users = Array.from({ length: 5 }, (_, i) => ({
        email: `concurrent${i}@example.com`,
        password: "Password123",
      }));

      const promises = users.map((user) =>
        register(user.email, user.password, false)
      );

      const results = await Promise.all(promises);

      // 所有註冊都應該成功
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.user).toBeDefined();
        expect(result.session).toBeDefined();
      });

      // 驗證資料庫中的使用者數量（可能包含之前測試的資料）
      const allUsers = await import("@/infrastructure/database/jsonDb").then((m) =>
        m.readJsonFile(TEST_USERS_PATH)
      );
      expect(allUsers.length).toBeGreaterThanOrEqual(5);
    }, 15000);
  });
});
