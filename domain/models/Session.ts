/**
 * 會話實體（領域模型）
 */
export interface Session {
  id: string;
  userId: string;
  token: string; // JWT token
  createdAt: string;
  expiresAt: string;
  lastActivityAt: string;
  rememberMe: boolean; // 是否為持久會話
}

/**
 * 建立會話所需的資料
 */
export interface CreateSessionData {
  userId: string;
  rememberMe: boolean;
}
