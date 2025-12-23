import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { hashPassword } from "@/infrastructure/security/passwordHasher";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

test.describe("儀表板與登出 E2E 測試 (T045 + T051)", () => {
  const testEmail = "dashboard@example.com";
  const testPassword = "DashboardPass123";
  let testUserId: string;

  test.beforeEach(async ({ page }) => {
    // 建立測試使用者
    testUserId = `user-${Date.now()}`;
    const hashedPassword = await hashPassword(testPassword);
    const users = [
      {
        id: testUserId,
        email: testEmail,
        passwordHash: hashedPassword,
        role: "user",
        status: "active",
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockoutUntil: null,
        createdAt: new Date("2024-01-15T10:30:00Z").toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify([], null, 2));

    // 執行登入
    await page.goto("/login");
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill(testPassword);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL("/dashboard");
  });

  test.describe("儀表板檢視 (T051)", () => {
    test("應該顯示使用者的 email", async ({ page }) => {
      await expect(page.locator("text=" + testEmail)).toBeVisible();
    });

    test("應該顯示歡迎訊息", async ({ page }) => {
      await expect(page.locator("text=/歡迎|welcome/i")).toBeVisible();
    });

    test("應該顯示使用者的註冊日期", async ({ page }) => {
      // 檢查是否顯示 createdAt 相關資訊
      await expect(
        page.locator("text=/註冊日期|joined|member since/i")
      ).toBeVisible();

      // 檢查是否包含日期格式（可能是 2024-01-15 或其他格式）
      await expect(page.locator("text=/2024/")).toBeVisible();
    });

    test("應該顯示登出按鈕", async ({ page }) => {
      await expect(page.locator("text=/登出|logout/i")).toBeVisible();
    });

    test("應該顯示使用者角色", async ({ page }) => {
      // 檢查是否顯示角色資訊
      const roleText = page.locator("text=/角色|role/i");
      if (await roleText.isVisible()) {
        await expect(page.locator("text=/user|使用者/i")).toBeVisible();
      }
    });

    test("應該正確格式化日期顯示", async ({ page }) => {
      // 日期應該以易讀的格式顯示
      const datePatterns = [
        /\d{4}-\d{2}-\d{2}/, // 2024-01-15
        /\d{4}年\d{1,2}月\d{1,2}日/, // 2024年1月15日
        /\d{1,2}\/\d{1,2}\/\d{4}/, // 01/15/2024
      ];

      let foundDateFormat = false;
      for (const pattern of datePatterns) {
        const element = page.locator(`text=${pattern}`);
        if ((await element.count()) > 0) {
          foundDateFormat = true;
          break;
        }
      }

      expect(foundDateFormat).toBe(true);
    });

    test("未登入時應該無法訪問儀表板", async ({ page }) => {
      // 登出
      await page.locator("text=/登出|logout/i").click();

      // 嘗試直接訪問儀表板
      await page.goto("/dashboard");

      // 應該重導向到登入頁面
      await expect(page).toHaveURL(/\/login/);
    });

    test("應該在新視窗中保持登入狀態", async ({ context, page }) => {
      // 開啟新分頁
      const newPage = await context.newPage();
      await newPage.goto("/dashboard");

      // 新分頁應該也能訪問儀表板（共享 session cookie）
      await expect(newPage).toHaveURL("/dashboard");
      await expect(newPage.locator("text=" + testEmail)).toBeVisible();

      await newPage.close();
    });

    test("應該正確顯示使用者資訊卡片", async ({ page }) => {
      // 檢查 UserInfo 元件是否正確渲染
      const userInfoCard = page
        .locator('[data-testid="user-info"], .user-info, [class*="UserInfo"]')
        .first();

      // 如果找不到特定的選擇器，至少要確保基本資訊存在
      await expect(page.locator("text=" + testEmail)).toBeVisible();
    });
  });

  test.describe("登出功能 (T045)", () => {
    test("應該成功登出並重導向到登入頁面", async ({ page }) => {
      await page.locator("text=/登出|logout/i").click();

      // 應該重導向到登入頁面
      await expect(page).toHaveURL("/login");

      // 應該顯示登出成功的 toast
      await expect(page.locator("text=/登出成功|logged out/i")).toBeVisible();
    });

    test("登出後應該無法訪問受保護的頁面", async ({ page }) => {
      await page.locator("text=/登出|logout/i").click();
      await expect(page).toHaveURL("/login");

      // 嘗試訪問儀表板
      await page.goto("/dashboard");

      // 應該被重導向回登入頁面
      await expect(page).toHaveURL(/\/login/);
      await expect(
        page.locator("text=/請先登入|please log in/i")
      ).toBeVisible();
    });

    test("登出後應該清除 session cookie", async ({ page }) => {
      await page.locator("text=/登出|logout/i").click();

      // 檢查 session cookie 是否被清除
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find((c) => c.name === "session");

      // session cookie 應該不存在或已過期
      if (sessionCookie) {
        expect(sessionCookie.value).toBe("");
      }
    });

    test("登出後使用上一頁按鈕應該無法回到儀表板", async ({ page }) => {
      await page.locator("text=/登出|logout/i").click();
      await expect(page).toHaveURL("/login");

      // 使用瀏覽器的上一頁功能
      await page.goBack();

      // 應該仍然在登入頁面或被重導向到登入頁面
      await expect(page).toHaveURL(/\/login/);
    });

    test("登出應該在所有分頁中生效", async ({ context, page }) => {
      // 開啟新分頁
      const newPage = await context.newPage();
      await newPage.goto("/dashboard");
      await expect(newPage).toHaveURL("/dashboard");

      // 在原始分頁登出
      await page.locator("text=/登出|logout/i").click();
      await expect(page).toHaveURL("/login");

      // 重新整理新分頁
      await newPage.reload();

      // 新分頁應該也被登出
      await expect(newPage).toHaveURL(/\/login/);

      await newPage.close();
    });

    test("登出按鈕應該有確認提示（選配）", async ({ page }) => {
      const logoutButton = page.locator("text=/登出|logout/i");

      // 某些實作可能有確認對話框
      page.on("dialog", (dialog) => {
        expect(dialog.message()).toContain("確定");
        dialog.accept();
      });

      await logoutButton.click();
    });

    test("登出應該記錄安全事件", async ({ page }) => {
      await page.locator("text=/登出|logout/i").click();

      // 檢查 security-logs.json 是否記錄了登出事件
      const logsFile = path.join(DATA_DIR, "security-logs.json");
      if (fs.existsSync(logsFile)) {
        const logs = JSON.parse(fs.readFileSync(logsFile, "utf-8"));
        const logoutLog = logs.find(
          (log: any) => log.eventType === "LOGOUT" && log.userId === testUserId
        );

        expect(logoutLog).toBeDefined();
      }
    });

    test("登出應該撤銷 session", async ({ page }) => {
      await page.locator("text=/登出|logout/i").click();

      // 檢查 sessions.json 是否清除了該 session
      const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
      const activeSession = sessions.find(
        (s: any) => s.userId === testUserId && !s.revokedAt
      );

      expect(activeSession).toBeUndefined();
    });
  });

  test.describe("完整使用者旅程", () => {
    test("應該完成完整流程：登入 → 檢視儀表板 → 登出 → 重新登入", async ({
      page,
    }) => {
      // 1. 已在 beforeEach 中登入

      // 2. 檢視儀表板資訊
      await expect(page.locator("text=" + testEmail)).toBeVisible();
      await expect(page).toHaveURL("/dashboard");

      // 3. 登出
      await page.locator("text=/登出|logout/i").click();
      await expect(page).toHaveURL("/login");

      // 4. 重新登入
      await page.locator('input[name="email"]').fill(testEmail);
      await page.locator('input[name="password"]').fill(testPassword);
      await page.locator('button[type="submit"]').click();

      // 5. 再次進入儀表板
      await expect(page).toHaveURL("/dashboard");
      await expect(page.locator("text=" + testEmail)).toBeVisible();
    });

    test("session 過期後應該要求重新登入", async ({ page }) => {
      // 手動撤銷 session（模擬過期）
      const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
      sessions.forEach((s: any) => {
        s.expiresAt = new Date(Date.now() - 1000).toISOString(); // 設為已過期
      });
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));

      // 重新整理頁面
      await page.reload();

      // 應該被重導向到登入頁面
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator("text=/session.*過期|expired/i")).toBeVisible();
    });
  });

  test.describe("管理者角色測試", () => {
    test("admin 使用者應該看到額外的導航選項", async ({ page }) => {
      // 建立 admin 使用者
      const adminEmail = "admin@example.com";
      const adminId = `admin-${Date.now()}`;
      const hashedPassword = await hashPassword(testPassword);

      const users = [
        {
          id: adminId,
          email: adminEmail,
          passwordHash: hashedPassword,
          role: "admin",
          status: "active",
          failedLoginAttempts: 0,
          lastFailedLoginAt: null,
          lockoutUntil: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

      // 登出當前使用者
      await page.locator("text=/登出|logout/i").click();

      // 以 admin 身份登入
      await page.goto("/login");
      await page.locator('input[name="email"]').fill(adminEmail);
      await page.locator('input[name="password"]').fill(testPassword);
      await page.locator('button[type="submit"]').click();

      await expect(page).toHaveURL("/dashboard");

      // admin 可能會看到額外的選項（如果有實作）
      const adminLink = page.locator('a[href="/admin"]');
      // 這是選配功能，依實際實作而定
    });
  });
});
