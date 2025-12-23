import {
  generateToken,
  verifyToken,
  getTokenPayload,
} from "@/infrastructure/security/jwtManager";

describe("jwtManager", () => {
  const mockUserId = "user-123";
  const mockEmail = "test@example.com";
  const mockRole = "user" as const;

  describe("generateToken", () => {
    it("應該成功產生 JWT token", () => {
      const token = generateToken(mockUserId, mockEmail, mockRole);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("應該產生包含三個部分的 JWT（header.payload.signature）", () => {
      const token = generateToken(mockUserId, mockEmail, mockRole);
      const parts = token.split(".");

      expect(parts).toHaveLength(3);
    });

    it("應該為不同使用者產生不同的 token", () => {
      const token1 = generateToken("user-1", "user1@example.com", "user");
      const token2 = generateToken("user-2", "user2@example.com", "user");

      expect(token1).not.toBe(token2);
    });

    it("應該支援 admin 角色", () => {
      const token = generateToken(mockUserId, mockEmail, "admin");

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
    });

    it("應該在指定時間後過期", () => {
      const expiresIn = "1s"; // 1 秒
      const token = generateToken(mockUserId, mockEmail, mockRole, expiresIn);

      expect(token).toBeDefined();

      // 驗證 token 包含過期時間
      const payload = getTokenPayload(token);
      expect(payload).toHaveProperty("exp");
      expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });

  describe("verifyToken", () => {
    it("應該成功驗證有效的 token", () => {
      const token = generateToken(mockUserId, mockEmail, mockRole);
      const payload = verifyToken(token);

      expect(payload).toBeDefined();
      expect(payload).toHaveProperty("userId");
      expect(payload).toHaveProperty("email");
      expect(payload).toHaveProperty("role");
    });

    it("應該正確解析 token payload", () => {
      const token = generateToken(mockUserId, mockEmail, mockRole);
      const payload = verifyToken(token) as any;

      expect(payload.userId).toBe(mockUserId);
      expect(payload.email).toBe(mockEmail);
      expect(payload.role).toBe(mockRole);
    });

    it("應該拒絕無效的 token", () => {
      const invalidToken = "invalid.token.here";

      expect(() => verifyToken(invalidToken)).toThrow();
    });

    it("應該拒絕篡改過的 token", () => {
      const token = generateToken(mockUserId, mockEmail, mockRole);
      const parts = token.split(".");
      const tamperedToken = parts[0] + ".tampered." + parts[2];

      expect(() => verifyToken(tamperedToken)).toThrow();
    });

    it("應該拒絕過期的 token", async () => {
      const token = generateToken(mockUserId, mockEmail, mockRole, "1ms");

      // 等待 token 過期
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(() => verifyToken(token)).toThrow();
    });

    it("應該處理空字串", () => {
      expect(() => verifyToken("")).toThrow();
    });

    it("應該處理格式不正確的 token", () => {
      expect(() => verifyToken("notavalidtoken")).toThrow();
    });
  });

  describe("getTokenPayload", () => {
    it("應該成功解析 token payload", () => {
      const token = generateToken(mockUserId, mockEmail, mockRole);
      const payload = getTokenPayload(token);

      expect(payload).toBeDefined();
      expect(payload.userId).toBe(mockUserId);
      expect(payload.email).toBe(mockEmail);
      expect(payload.role).toBe(mockRole);
    });

    it("payload 應該包含標準 JWT 欄位", () => {
      const token = generateToken(mockUserId, mockEmail, mockRole);
      const payload = getTokenPayload(token);

      expect(payload).toHaveProperty("iat"); // issued at
      expect(payload).toHaveProperty("exp"); // expires at
    });

    it("應該處理不同角色", () => {
      const adminToken = generateToken(mockUserId, mockEmail, "admin");
      const userToken = generateToken(mockUserId, mockEmail, "user");

      const adminPayload = getTokenPayload(adminToken);
      const userPayload = getTokenPayload(userToken);

      expect(adminPayload.role).toBe("admin");
      expect(userPayload.role).toBe("user");
    });

    it("應該處理無效的 token 格式", () => {
      expect(() => getTokenPayload("invalid")).toThrow();
    });

    it("應該處理空字串", () => {
      expect(() => getTokenPayload("")).toThrow();
    });
  });

  describe("token 安全性", () => {
    it("token 應該包含簽名", () => {
      const token = generateToken(mockUserId, mockEmail, mockRole);
      const parts = token.split(".");

      // 第三部分是簽名
      expect(parts[2]).toBeDefined();
      expect(parts[2].length).toBeGreaterThan(0);
    });

    it("相同輸入在不同時間產生的 token 應該不同（因為 iat 不同）", async () => {
      const token1 = generateToken(mockUserId, mockEmail, mockRole);

      // 等待至少 1 秒確保 iat 不同
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const token2 = generateToken(mockUserId, mockEmail, mockRole);

      expect(token1).not.toBe(token2);
    });

    it("應該正確設定過期時間", () => {
      const expiresIn = "2h";
      const token = generateToken(mockUserId, mockEmail, mockRole, expiresIn);
      const payload = getTokenPayload(token);

      const now = Math.floor(Date.now() / 1000);
      const expectedExpiry = now + 2 * 60 * 60; // 2 小時後

      // 允許 10 秒的誤差
      expect(payload.exp).toBeGreaterThanOrEqual(expectedExpiry - 10);
      expect(payload.exp).toBeLessThanOrEqual(expectedExpiry + 10);
    });

    it("payload 不應該包含敏感資訊（如密碼雜湊）", () => {
      const token = generateToken(mockUserId, mockEmail, mockRole);
      const payload = getTokenPayload(token);

      expect(payload).not.toHaveProperty("password");
      expect(payload).not.toHaveProperty("passwordHash");
    });
  });

  describe("不同過期時間設定", () => {
    it("應該支援秒為單位", () => {
      const token = generateToken(mockUserId, mockEmail, mockRole, "60s");
      const payload = getTokenPayload(token);

      expect(payload.exp).toBeDefined();
    });

    it("應該支援分鐘為單位", () => {
      const token = generateToken(mockUserId, mockEmail, mockRole, "30m");
      const payload = getTokenPayload(token);

      expect(payload.exp).toBeDefined();
    });

    it("應該支援小時為單位", () => {
      const token = generateToken(mockUserId, mockEmail, mockRole, "24h");
      const payload = getTokenPayload(token);

      expect(payload.exp).toBeDefined();
    });

    it("應該支援天為單位", () => {
      const token = generateToken(mockUserId, mockEmail, mockRole, "7d");
      const payload = getTokenPayload(token);

      expect(payload.exp).toBeDefined();
    });
  });
});
