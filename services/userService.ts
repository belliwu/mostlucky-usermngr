import { User, UserPublicInfo, toPublicInfo } from "@/domain/models/User";
import {
  getUserById,
  getUserByEmail,
} from "@/infrastructure/repositories/userRepository";
import { logger } from "@/infrastructure/logging/logger";

/**
 * 使用者服務（User Service）
 * 處理使用者相關業務邏輯
 */

export interface GetUserResult {
  success: boolean;
  user?: UserPublicInfo;
  error?: string;
}

/**
 * 根據 ID 取得使用者資訊
 */
export async function getUserInfo(userId: string): Promise<GetUserResult> {
  try {
    const user = await getUserById(userId);

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    return {
      success: true,
      user: toPublicInfo(user),
    };
  } catch (error: any) {
    logger.error("Get user info error:", error);
    return {
      success: false,
      error: "Failed to get user info",
    };
  }
}

/**
 * 根據 Email 取得使用者資訊
 */
export async function getUserInfoByEmail(
  email: string
): Promise<GetUserResult> {
  try {
    const user = await getUserByEmail(email);

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    return {
      success: true,
      user: toPublicInfo(user),
    };
  } catch (error: any) {
    logger.error("Get user info by email error:", error);
    return {
      success: false,
      error: "Failed to get user info",
    };
  }
}
