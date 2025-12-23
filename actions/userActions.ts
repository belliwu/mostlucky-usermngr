"use server";

import { cookies } from "next/headers";
import { verifyToken } from "@/infrastructure/security/jwtManager";
import { getUserInfo } from "@/services/userService";

/**
 * Server Actions for User Operations
 */

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "auth_session";

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
    if (!payload) {
      return {
        success: false,
        error: "Invalid token",
      };
    }

    // 取得使用者資訊
    const result = await getUserInfo(payload.userId);

    if (!result.success || !result.user) {
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
