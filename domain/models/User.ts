import { UserRole } from "@/domain/enums/UserRole";
import { UserStatus } from "@/domain/enums/UserStatus";

/**
 * 使用者實體（領域模型）
 */
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  failedLoginAttempts: number;
  lockedUntil?: string;
}

/**
 * 建立使用者所需的資料（不含系統產生欄位）
 */
export interface CreateUserData {
  email: string;
  password: string; // 純文字密碼（將被雜湊）
  role?: UserRole; // 預設為 user
}

/**
 * 使用者公開資訊（不含敏感資料）
 */
export interface UserPublicInfo {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLoginAt?: string;
}

/**
 * 從 User 提取公開資訊
 */
export function toPublicInfo(user: User): UserPublicInfo {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}
