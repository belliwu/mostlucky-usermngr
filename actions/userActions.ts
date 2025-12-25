"use server";

import { cookies } from "next/headers";
import { verifyToken } from "@/infrastructure/security/jwtManager";
import { getUserInfo } from "@/services/userService";

/**
 * Server Actions for User Operations
 */

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "session";

export interface UserInfoResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
    lastLoginAt?: string;
  };
  error?: string;
}

/**
 * 取得當前使用者資訊
 */
export async function getUserInfoAction(): Promise<UserInfoResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return {
        success: false,
        error: "No session token found",
      };
    }

    // 驗證 token
    const payload = verifyToken(token);

    // 取得使用者資訊
    const result = await getUserInfo(payload.userId);

    if (!result.success || !result.user) {
      // Demo/Vercel 環境：Serverless instance 之間可能不共享暫存檔案，
      // 導致剛註冊/登入的使用者在下一個請求查不到。
      // 若 token 本身有效，改用 token payload 回傳最小可用的使用者資訊供儀表板展示。
      if (process.env.VERCEL === "1" && payload?.userId && payload?.email) {
        return {
          success: true,
          user: {
            id: payload.userId,
            email: payload.email,
            role: payload.role,
            status: "active",
            createdAt: new Date().toISOString(),
          },
        };
      }

      return {
        success: false,
        error: result.error || "Failed to get user info",
      };
    }

    return {
      success: true,
      user: result.user,
    };
  } catch (error: any) {
    return {
      success: false,
      error: "Failed to get user info",
    };
  }
}
