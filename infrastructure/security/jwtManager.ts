import jwt, { type SignOptions } from "jsonwebtoken";

/**
 * JWT 工具（產生與驗證 token）
 */

const JWT_SECRET =
  process.env.JWT_SECRET || "dev-secret-key-DO-NOT-USE-IN-PRODUCTION";
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_TOKEN_EXPIRY || "30m";
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_TOKEN_EXPIRY || "7d";

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * 產生 token（支援自訂過期時間）
 */
export function generateToken(
  userId: string,
  email: string,
  role: string,
  expiresIn?: string
): string {
  const payload = { userId, email, role };
  const options: SignOptions = {
    expiresIn: expiresIn || (ACCESS_TOKEN_EXPIRY as string),
  };
  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * 產生 access token
 */
export function generateAccessToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: ACCESS_TOKEN_EXPIRY as string,
  };
  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * 產生 refresh token（用於「記住我」功能）
 */
export function generateRefreshToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: REFRESH_TOKEN_EXPIRY as string,
  };
  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * 驗證 token
 */
export function verifyToken(token: string): string | object {
  if (!token || token.trim() === "") {
    return null as any;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    throw error;
  }
}

/**
 * 取得 token payload（不驗證，僅解析）
 */
export function getTokenPayload(token: string): JwtPayload {
  if (!token || token.trim() === "") {
    throw new Error("Invalid token");
  }

  try {
    const decoded = jwt.decode(token);
    if (!decoded || typeof decoded === "string") {
      throw new Error("Invalid token format");
    }
    return decoded as JwtPayload;
  } catch (error) {
    throw error;
  }
}

/**
 * 解碼 token（不驗證有效性，用於除錯）
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.decode(token) as JwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}
