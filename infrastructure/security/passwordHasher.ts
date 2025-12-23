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
  // bcrypt 標準雜湊長度通常為 60，並以 $2a$/$2b$/$2y$ 開頭
  if (!hash || typeof hash !== "string" || !/^\$2[aby]\$\d\d\$/.test(hash)) {
    throw new Error("Invalid bcrypt hash format");
  }

  return bcrypt.compare(password, hash);
}
