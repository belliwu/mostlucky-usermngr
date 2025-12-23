import bcrypt from "bcryptjs";

/**
 * 密碼雜湊工具（使用 bcryptjs）
 */

const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "10", 10);

/**
 * 雜湊密碼
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 驗證密碼
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
