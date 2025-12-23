import {
  validateEmail,
  validatePassword,
} from "@/domain/validators/userValidator";

describe("userValidator", () => {
  describe("validateEmail", () => {
    it("應該接受有效的 email 格式", () => {
      const validEmails = [
        "user@example.com",
        "test.user@example.com",
        "user+tag@example.co.uk",
        "user_name@example-domain.com",
      ];

      validEmails.forEach((email) => {
        const result = validateEmail(email);
        expect(result.success).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it("應該拒絕無效的 email 格式", () => {
      const invalidEmails = [
        "notanemail",
        "@example.com",
        "user@",
        "user @example.com",
        "user@example",
        "",
      ];

      invalidEmails.forEach((email) => {
        const result = validateEmail(email);
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it("應該拒絕過長的 email", () => {
      const longEmail = "a".repeat(300) + "@example.com";
      const result = validateEmail(longEmail);
      expect(result.success).toBe(false);
      expect(result.errors).toContain("電子郵件長度不可超過 255 字元");
    });

    it("應該處理 null 或 undefined", () => {
      const result1 = validateEmail(null as any);
      const result2 = validateEmail(undefined as any);

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
    });
  });

  describe("validatePassword", () => {
    it("應該接受符合所有要求的密碼", () => {
      const validPasswords = [
        "Password123",
        "MyP@ssw0rd",
        "Secure1234",
        "Abcdefgh1",
      ];

      validPasswords.forEach((password) => {
        const result = validatePassword(password);
        expect(result.success).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it("應該拒絕過短的密碼", () => {
      const shortPasswords = ["Pass1", "Ab1", "1234567"];

      shortPasswords.forEach((password) => {
        const result = validatePassword(password);
        expect(result.success).toBe(false);
        expect(result.errors).toContain("密碼至少需要 8 個字元");
      });
    });

    it("應該拒絕沒有大寫字母的密碼", () => {
      const result = validatePassword("password123");
      expect(result.success).toBe(false);
      expect(result.errors).toContain("密碼必須包含至少一個大寫字母");
    });

    it("應該拒絕沒有小寫字母的密碼", () => {
      const result = validatePassword("PASSWORD123");
      expect(result.success).toBe(false);
      expect(result.errors).toContain("密碼必須包含至少一個小寫字母");
    });

    it("應該拒絕沒有數字的密碼", () => {
      const result = validatePassword("PasswordOnly");
      expect(result.success).toBe(false);
      expect(result.errors).toContain("密碼必須包含至少一個數字");
    });

    it("應該拒絕過長的密碼", () => {
      const longPassword = "A" + "a".repeat(100) + "1";
      const result = validatePassword(longPassword);
      expect(result.success).toBe(false);
      expect(result.errors).toContain("密碼長度不可超過 100 字元");
    });

    it("應該同時報告多個錯誤", () => {
      const result = validatePassword("short");
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it("應該處理 null 或 undefined", () => {
      const result1 = validatePassword(null as any);
      const result2 = validatePassword(undefined as any);

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
    });

    it("應該處理空字串", () => {
      const result = validatePassword("");
      expect(result.success).toBe(false);
      expect(result.errors).toContain("密碼至少需要 8 個字元");
    });
  });
});
