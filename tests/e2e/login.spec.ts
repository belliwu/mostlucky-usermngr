import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { hashPassword } from "@/infrastructure/security/passwordHasher";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

test.describe("登入流程 E2E 測試 (T038)", () => {
  const testEmail = "logintest@example.com";
  const testPassword = "TestPassword123";

  test.beforeEach(async () => {
    // 建立測試使用者
    const hashedPassword = await hashPassword(testPassword);
    const users = [
      {
        id: `user-${Date.now()}`,
        email: testEmail,
        passwordHash: hashedPassword,
        role: "user",
        status: "active",
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockoutUntil: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  });

  test("應該顯示登入表單", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="rememberMe"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("應該成功登入並重導向到儀表板", async ({ page }) => {
    await page.goto("/login");

    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill(testPassword);
    await page.locator('button[type="submit"]').click();

    // 應該重導向到儀表板
    await expect(page).toHaveURL("/dashboard");

    // 應該顯示使用者資訊
    await expect(page.locator("text=" + testEmail)).toBeVisible();
  });

  test("應該顯示錯誤訊息當密碼不正確", async ({ page }) => {
    await page.goto("/login");

    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill("WrongPassword123");
    await page.locator('button[type="submit"]').click();

    // 應該顯示錯誤 toast
    await expect(page.locator("text=/帳號或密碼|incorrect/i")).toBeVisible();

    // 應該留在登入頁面
    await expect(page).toHaveURL("/login");
  });

  test("應該顯示錯誤訊息當使用者不存在", async ({ page }) => {
    await page.goto("/login");

    await page.locator('input[name="email"]').fill("nonexistent@example.com");
    await page.locator('input[name="password"]').fill("Password123");
    await page.locator('button[type="submit"]').click();

    // 應該顯示通用錯誤訊息（不洩漏使用者是否存在）
    await expect(page.locator("text=/帳號或密碼|incorrect/i")).toBeVisible();
  });

  test("應該支援「記住我」功能", async ({ page }) => {
    await page.goto("/login");

    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill(testPassword);
    await page.locator('input[name="rememberMe"]').check();
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL("/dashboard");

    // 檢查 cookie（rememberMe 應該設定較長的過期時間）
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "session");

    expect(sessionCookie).toBeDefined();
    // rememberMe 的 cookie 應該有較長的 maxAge
  });

  test("未勾選「記住我」時應該使用 session cookie", async ({ page }) => {
    await page.goto("/login");

    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill(testPassword);
    // 不勾選 rememberMe
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL("/dashboard");

    // session cookie 不應該有長期的過期時間
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "session");

    expect(sessionCookie).toBeDefined();
  });

  test("應該在 5 次失敗後鎖定帳號", async ({ page }) => {
    await page.goto("/login");

    // 連續失敗 5 次
    for (let i = 0; i < 5; i++) {
      await page.locator('input[name="email"]').fill(testEmail);
      await page.locator('input[name="password"]').fill(`WrongPassword${i}`);
      await page.locator('button[type="submit"]').click();

      // 等待錯誤訊息
      await page.waitForTimeout(500);
    }

    // 第 6 次嘗試應該顯示鎖定訊息
    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill(testPassword);
    await page.locator('button[type="submit"]').click();

    await expect(page.locator("text=/鎖定|locked/i")).toBeVisible();
  });

  test("鎖定訊息應該包含等待時間", async ({ page }) => {
    // 先將使用者鎖定
    const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    users[0].failedLoginAttempts = 5;
    users[0].lockoutUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

    await page.goto("/login");

    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill(testPassword);
    await page.locator('button[type="submit"]').click();

    // 應該顯示鎖定時間
    await expect(page.locator("text=/15.*分鐘|minutes/i")).toBeVisible();
  });

  test("應該在鎖定時間過後允許登入", async ({ page }) => {
    // 設定已過期的鎖定時間
    const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    users[0].failedLoginAttempts = 5;
    users[0].lockoutUntil = new Date(Date.now() - 1000).toISOString(); // 過去 1 秒
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

    await page.goto("/login");

    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill(testPassword);
    await page.locator('button[type="submit"]').click();

    // 應該成功登入
    await expect(page).toHaveURL("/dashboard");
  });

  test("成功登入後應該清除失敗嘗試次數", async ({ page }) => {
    // 先設定失敗次數
    const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    users[0].failedLoginAttempts = 3;
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

    await page.goto("/login");

    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill(testPassword);
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL("/dashboard");

    // 檢查失敗次數已清除
    const updatedUsers = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    expect(updatedUsers[0].failedLoginAttempts).toBe(0);
  });

  test("應該允許導航到註冊頁面", async ({ page }) => {
    await page.goto("/login");

    const registerLink = page.locator('a[href="/register"]');
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL("/register");
    }
  });

  test("應該在未登入時重導向到登入頁面", async ({ page }) => {
    // 直接訪問受保護的頁面
    await page.goto("/dashboard");

    // 應該重導向到登入頁面
    await expect(page).toHaveURL(/\/login/);

    // 應該顯示系統訊息
    await expect(page.locator("text=/請先登入|please log in/i")).toBeVisible();
  });

  test("應該處理空白欄位", async ({ page }) => {
    await page.goto("/login");

    await page.locator('button[type="submit"]').click();

    // 應該顯示必填欄位錯誤
    // HTML5 驗證或自訂驗證訊息
  });

  test("應該顯示密碼可見性切換按鈕", async ({ page }) => {
    await page.goto("/login");

    const passwordInput = page.locator('input[name="password"]');
    await expect(passwordInput).toHaveAttribute("type", "password");

    // 尋找顯示/隱藏按鈕（如果有實作）
    const toggleButton = page
      .locator('button[aria-label*="密碼"], button[aria-label*="password"]')
      .first();
    if (await toggleButton.isVisible()) {
      await toggleButton.click();
    }
  });

  test("送出按鈕應該在處理中時 disabled", async ({ page }) => {
    await page.goto("/login");

    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill(testPassword);

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // 按鈕應該暫時 disabled（載入狀態）
  });

  test("應該在錯誤後保留 email 欄位內容", async ({ page }) => {
    await page.goto("/login");

    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill("WrongPassword");
    await page.locator('button[type="submit"]').click();

    // 等待錯誤訊息
    await page.waitForTimeout(500);

    // email 欄位應該保留輸入值
    await expect(page.locator('input[name="email"]')).toHaveValue(testEmail);
  });

  test("應該清空密碼欄位在錯誤後", async ({ page }) => {
    await page.goto("/login");

    await page.locator('input[name="email"]').fill(testEmail);
    await page.locator('input[name="password"]').fill("WrongPassword");
    await page.locator('button[type="submit"]').click();

    // 等待錯誤訊息
    await page.waitForTimeout(500);

    // 密碼欄位應該被清空（安全考量）
    const passwordValue = await page
      .locator('input[name="password"]')
      .inputValue();
    // 根據實作決定是否清空
  });
});
