import {
  hashPassword,
  verifyPassword,
} from "@/infrastructure/security/passwordHasher";

describe("passwordHasher", () => {
  describe("hashPassword", () => {
    it("應該成功雜湊密碼", async () => {
      const password = "TestPassword123";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
      expect(hash).not.toBe(password);
    });

    it("應該為相同密碼產生不同的雜湊值（使用 salt）", async () => {
      const password = "TestPassword123";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it("應該處理空字串", async () => {
      const hash = await hashPassword("");
      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
    });

    it("應該處理特殊字元", async () => {
      const password = "P@ssw0rd!#$%^&*()";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
    });

    it("應該處理長密碼", async () => {
      const password = "A".repeat(100) + "a1";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
    });
  });

  describe("verifyPassword", () => {
    it("應該成功驗證正確的密碼", async () => {
      const password = "TestPassword123";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it("應該拒絕錯誤的密碼", async () => {
      const password = "TestPassword123";
      const wrongPassword = "WrongPassword456";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    it("應該區分大小寫", async () => {
      const password = "TestPassword123";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword("testpassword123", hash);

      expect(isValid).toBe(false);
    });

    it("應該處理空字串密碼", async () => {
      const password = "";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword("", hash);

      expect(isValid).toBe(true);
    });

    it("應該拒絕空字串與非空字串", async () => {
      const password = "TestPassword123";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword("", hash);

      expect(isValid).toBe(false);
    });

    it("應該處理特殊字元密碼", async () => {
      const password = "P@ssw0rd!#$%^&*()";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it("應該拒絕無效的雜湊值格式", async () => {
      const password = "TestPassword123";
      const invalidHash = "not-a-valid-bcrypt-hash";

      await expect(verifyPassword(password, invalidHash)).rejects.toThrow();
    });

    it("應該處理長密碼", async () => {
      const password = "A".repeat(100) + "a1";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });
  });

  describe("安全性測試", () => {
    it("雜湊應該以 $2b$ 開頭（bcrypt 格式）", async () => {
      const password = "TestPassword123";
      const hash = await hashPassword(password);

      expect(hash).toMatch(/^\$2[aby]\$/);
    });

    it("雜湊長度應該符合 bcrypt 標準（約 60 字元）", async () => {
      const password = "TestPassword123";
      const hash = await hashPassword(password);

      expect(hash.length).toBe(60);
    });

    it("應該具有抗暴力破解的時間成本", async () => {
      const password = "TestPassword123";
      const startTime = Date.now();
      await hashPassword(password);
      const duration = Date.now() - startTime;

      // bcrypt 應該要有明顯的計算成本（至少 10ms）
      expect(duration).toBeGreaterThanOrEqual(10);
    });
  });
});
