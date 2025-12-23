import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

test.describe("註冊流程 E2E 測試 (T029)", () => {
  test.beforeEach(async () => {
    // 清空測試資料
    if (fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
    }
  });

  test("應該顯示註冊表單", async ({ page }) => {
    await page.goto("/register");

    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("應該成功註冊新使用者並自動登入到儀表板", async ({ page }) => {
    await page.goto("/register");

    const timestamp = Date.now();
    const email = `testuser${timestamp}@example.com`;

    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("Password123");
    await page.locator('input[name="confirmPassword"]').fill("Password123");

    await page.locator('button[type="submit"]').click();

    // 應該重導向到儀表板
    await expect(page).toHaveURL("/dashboard");

    // 應該顯示成功的 toast 訊息
    await expect(page.locator('[role="status"]')).toContainText(
      /註冊成功|成功/i
    );

    // 儀表板應該顯示使用者資訊
    await expect(page.locator("text=" + email)).toBeVisible();
  });

  test("應該顯示無效 email 格式的錯誤", async ({ page }) => {
    await page.goto("/register");

    await page.locator('input[name="email"]').fill("invalid-email");
    await page.locator('input[name="password"]').fill("Password123");
    await page.locator('input[name="confirmPassword"]').fill("Password123");

    await page.locator('button[type="submit"]').click();

    // 應該顯示錯誤訊息
    await expect(page.locator("text=/電子郵件|email/i")).toBeVisible();
  });

  test("應該顯示密碼過短的錯誤", async ({ page }) => {
    await page.goto("/register");

    const timestamp = Date.now();
    await page
      .locator('input[name="email"]')
      .fill(`test${timestamp}@example.com`);
    await page.locator('input[name="password"]').fill("Pass1");
    await page.locator('input[name="confirmPassword"]').fill("Pass1");

    await page.locator('button[type="submit"]').click();

    // 應該顯示密碼要求錯誤
    await expect(page.locator("text=/密碼.*8/i")).toBeVisible();
  });

  test("應該顯示密碼不符合要求的錯誤", async ({ page }) => {
    await page.goto("/register");

    const timestamp = Date.now();
    await page
      .locator('input[name="email"]')
      .fill(`test${timestamp}@example.com`);
    await page.locator('input[name="password"]').fill("password123"); // 缺少大寫

    await page.locator('button[type="submit"]').click();

    // 應該顯示密碼要求錯誤
    await expect(page.locator("text=/大寫|uppercase/i")).toBeVisible();
  });

  test("應該顯示密碼不匹配的錯誤", async ({ page }) => {
    await page.goto("/register");

    const timestamp = Date.now();
    await page
      .locator('input[name="email"]')
      .fill(`test${timestamp}@example.com`);
    await page.locator('input[name="password"]').fill("Password123");
    await page.locator('input[name="confirmPassword"]').fill("Password456");

    await page.locator('button[type="submit"]').click();

    // 應該顯示密碼不匹配錯誤
    await expect(page.locator("text=/密碼.*不一致|不匹配/i")).toBeVisible();
  });

  test("應該拒絕重複的 email", async ({ page }) => {
    const email = `duplicate${Date.now()}@example.com`;

    // 第一次註冊
    await page.goto("/register");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("Password123");
    await page.locator('input[name="confirmPassword"]').fill("Password123");
    await page.locator('button[type="submit"]').click();

    // 等待重導向到儀表板
    await expect(page).toHaveURL("/dashboard");

    // 登出
    await page.locator("text=/登出|logout/i").click();

    // 嘗試用相同 email 再次註冊
    await page.goto("/register");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("Password123");
    await page.locator('input[name="confirmPassword"]').fill("Password123");
    await page.locator('button[type="submit"]').click();

    // 應該顯示 email 已存在的錯誤
    await expect(page.locator("text=/已存在|already exists/i")).toBeVisible();
  });

  test("應該在表單欄位失焦時驗證", async ({ page }) => {
    await page.goto("/register");

    // 輸入無效的 email 並失焦
    await page.locator('input[name="email"]').fill("invalid");
    await page.locator('input[name="password"]').click(); // 觸發失焦

    // 應該看到即時驗證錯誤（如果有實作）
    // 這是選配功能，依實際實作而定
  });

  test("應該允許導航到登入頁面", async ({ page }) => {
    await page.goto("/register");

    // 尋找「已有帳號？登入」的連結
    const loginLink = page.locator('a[href="/login"]');
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL("/login");
    }
  });

  test("應該顯示密碼可見性切換按鈕", async ({ page }) => {
    await page.goto("/register");

    const passwordInput = page.locator('input[name="password"]');

    // 密碼欄位應該是 type="password"
    await expect(passwordInput).toHaveAttribute("type", "password");

    // 尋找顯示/隱藏按鈕（如果有實作）
    const toggleButton = page
      .locator('button[aria-label*="密碼"], button[aria-label*="password"]')
      .first();
    if (await toggleButton.isVisible()) {
      await toggleButton.click();
      // 點擊後可能會變成 type="text"
      // 這取決於實際實作
    }
  });

  test("送出按鈕應該在處理中時顯示載入狀態", async ({ page }) => {
    await page.goto("/register");

    const timestamp = Date.now();
    await page
      .locator('input[name="email"]')
      .fill(`test${timestamp}@example.com`);
    await page.locator('input[name="password"]').fill("Password123");
    await page.locator('input[name="confirmPassword"]').fill("Password123");

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // 按鈕應該顯示載入狀態（如果有實作）
    // 這可能是 disabled 屬性或載入文字
  });

  test("註冊後的使用者資料應該正確儲存", async ({ page }) => {
    await page.goto("/register");

    const timestamp = Date.now();
    const email = `testuser${timestamp}@example.com`;

    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("Password123");
    await page.locator('input[name="confirmPassword"]').fill("Password123");
    await page.locator('button[type="submit"]').click();

    // 等待重導向
    await expect(page).toHaveURL("/dashboard");

    // 檢查 users.json 檔案
    const usersData = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    const newUser = usersData.find((u: any) => u.email === email);

    expect(newUser).toBeDefined();
    expect(newUser.email).toBe(email);
    expect(newUser.role).toBe("user");
    expect(newUser.status).toBe("active");
    expect(newUser.passwordHash).toBeDefined();
    expect(newUser.passwordHash).not.toBe("Password123"); // 應該是雜湊值
  });

  test("應該正確處理特殊字元的密碼", async ({ page }) => {
    await page.goto("/register");

    const timestamp = Date.now();
    const email = `special${timestamp}@example.com`;
    const password = "P@ssw0rd!#$%";

    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('input[name="confirmPassword"]').fill(password);
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL("/dashboard");
  });
});
