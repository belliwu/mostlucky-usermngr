"use server";

import { cookies } from "next/headers";
import { register, login, logout } from "@/services/authService";

/**
 * Server Actions for Authentication
 */

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "session";

export interface ActionResult {
  success: boolean;
  error?: string;
  messageCode?: string;
  redirectTo?: string;
}

/**
 * 註冊 Action
 * 成功後自動登入並導向儀表板
 */
export async function registerAction(
  formData: FormData
): Promise<ActionResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return {
      success: false,
      messageCode: "INVALID_EMAIL",
      error: "Email 和密碼不能為空",
    };
  }

  // 呼叫註冊服務（含自動登入）
  const result = await register(email, password, false);

  if (!result.success) {
    // 根據錯誤訊息回傳對應的訊息碼
    let messageCode = "SERVER_ERROR";
    if (result.error?.includes("already exists")) {
      messageCode = "EMAIL_EXISTS";
    } else if (result.error?.includes("Email")) {
      messageCode = "INVALID_EMAIL";
    } else if (result.error?.includes("password")) {
      messageCode = "WEAK_PASSWORD";
    }

    return {
      success: false,
      messageCode,
      error: result.error,
    };
  }

  // 註冊成功，設定 cookie
  if (result.session) {
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE_NAME, result.session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: result.session.rememberMe ? 7 * 24 * 60 * 60 : undefined, // 7 天或 session
      path: "/",
    });
  }

  // 導向儀表板
  return {
    success: true,
    messageCode: "REGISTER_SUCCESS",
    redirectTo: "/dashboard",
  };
}

/**
 * 登入 Action
 */
export async function loginAction(formData: FormData): Promise<ActionResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const rememberMe = formData.get("rememberMe") === "true";

  if (!email || !password) {
    return {
      success: false,
      messageCode: "INVALID_CREDENTIALS",
      error: "Email 和密碼不能為空",
    };
  }

  // 呼叫登入服務
  const result = await login(email, password, rememberMe);

  if (!result.success) {
    // 根據錯誤訊息回傳對應的訊息碼
    let messageCode = "INVALID_CREDENTIALS";
    if (result.error?.includes("locked")) {
      messageCode = "ACCOUNT_LOCKED";
    } else if (result.error?.includes("Too many")) {
      messageCode = "ACCOUNT_LOCKED";
    } else if (result.error?.includes("disabled")) {
      messageCode = "PERMISSION_DENIED";
    }

    return {
      success: false,
      messageCode,
      error: result.error,
    };
  }

  // 登入成功，設定 cookie
  if (result.session) {
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE_NAME, result.session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: result.session.rememberMe ? 7 * 24 * 60 * 60 : undefined, // 7 天或 session
      path: "/",
    });
  }

  // 導向儀表板
  return {
    success: true,
    messageCode: "LOGIN_SUCCESS",
    redirectTo: "/dashboard",
  };
}

/**
 * 登出 Action
 */
export async function logoutAction(): Promise<ActionResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    // 呼叫登出服務
    await logout(token);
  }

  // 清除 cookie
  cookieStore.delete(SESSION_COOKIE_NAME);

  // 導向登入頁
  return {
    success: true,
    messageCode: "LOGOUT_SUCCESS",
    redirectTo: "/login",
  };
}
