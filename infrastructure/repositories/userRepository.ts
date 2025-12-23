import { User, CreateUserData } from "@/domain/models/User";
import { UserRole } from "@/domain/enums/UserRole";
import { UserStatus } from "@/domain/enums/UserStatus";
import {
  readJsonFile,
  writeJsonFile,
  updateJsonFile,
} from "@/infrastructure/database/jsonDb";
import { DB_CONFIG } from "@/infrastructure/database/dbConfig";
import { hashPassword } from "@/infrastructure/security/passwordHasher";
import { randomUUID } from "crypto";

/**
 * 使用者資料存取層（Repository）
 */

/**
 * 取得所有使用者
 */
export async function getAllUsers(): Promise<User[]> {
  return readJsonFile<User>(DB_CONFIG.usersPath);
}

/**
 * 根據 ID 取得使用者
 */
export async function getUserById(id: string): Promise<User | null> {
  const users = await getAllUsers();
  return users.find((u) => u.id === id) || null;
}

/**
 * 根據 Email 取得使用者
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const users = await getAllUsers();
  return (
    users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null
  );
}

/**
 * 建立使用者
 */
export async function createUser(data: CreateUserData): Promise<User> {
  // 檢查 email 唯一性
  const existing = await getUserByEmail(data.email);
  if (existing) {
    throw new Error("Email already exists");
  }

  // 雜湊密碼
  const passwordHash = await hashPassword(data.password);

  // 建立使用者物件
  const user: User = {
    id: randomUUID(),
    email: data.email,
    passwordHash,
    role: data.role || UserRole.USER, // 預設為 user
    status: UserStatus.ACTIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    failedLoginAttempts: 0,
  };

  // 寫入資料庫
  await updateJsonFile<User>(DB_CONFIG.usersPath, (users) => [...users, user]);

  return user;
}

/**
 * 更新使用者
 */
export async function updateUser(
  id: string,
  updates: Partial<User>
): Promise<User | null> {
  let updatedUser: User | null = null;

  await updateJsonFile<User>(DB_CONFIG.usersPath, (users) => {
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) {
      return users;
    }

    updatedUser = {
      ...users[index],
      ...updates,
      id: users[index].id, // 確保 ID 不被修改
      updatedAt: new Date().toISOString(),
    };

    users[index] = updatedUser;
    return users;
  });

  return updatedUser;
}

/**
 * 刪除使用者
 */
export async function deleteUser(id: string): Promise<boolean> {
  let deleted = false;

  await updateJsonFile<User>(DB_CONFIG.usersPath, (users) => {
    const initialLength = users.length;
    const filtered = users.filter((u) => u.id !== id);
    deleted = filtered.length < initialLength;
    return filtered;
  });

  return deleted;
}

/**
 * 增加登入失敗次數
 */
export async function incrementFailedLoginAttempts(
  userId: string
): Promise<void> {
  await updateJsonFile<User>(DB_CONFIG.usersPath, (users) => {
    const index = users.findIndex((u) => u.id === userId);
    if (index !== -1) {
      users[index].failedLoginAttempts++;
      users[index].updatedAt = new Date().toISOString();
    }
    return users;
  });
}

/**
 * 重置登入失敗次數
 */
export async function resetFailedLoginAttempts(userId: string): Promise<void> {
  await updateUser(userId, { failedLoginAttempts: 0 });
}

/**
 * 鎖定使用者帳號
 */
export async function lockUser(
  userId: string,
  lockDurationMs: number
): Promise<void> {
  const lockedUntil = new Date(Date.now() + lockDurationMs).toISOString();
  await updateUser(userId, {
    status: UserStatus.LOCKED,
    lockedUntil,
  });
}

/**
 * 解鎖使用者帳號
 */
export async function unlockUser(userId: string): Promise<void> {
  await updateUser(userId, {
    status: UserStatus.ACTIVE,
    lockedUntil: undefined,
  });
}

/**
 * 更新最後登入時間
 */
export async function updateLastLoginAt(userId: string): Promise<void> {
  await updateUser(userId, {
    lastLoginAt: new Date().toISOString(),
  });
}
