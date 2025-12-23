import { Session, CreateSessionData } from "@/domain/models/Session";
import {
  readJsonFile,
  writeJsonFile,
  updateJsonFile,
} from "@/infrastructure/database/jsonDb";
import { DB_CONFIG } from "@/infrastructure/database/dbConfig";
import {
  generateAccessToken,
  generateRefreshToken,
  JwtPayload,
} from "@/infrastructure/security/jwtManager";
import { randomUUID } from "crypto";

/**
 * 會話資料存取層（Repository）
 */

/**
 * 取得所有會話
 */
export async function getAllSessions(): Promise<Session[]> {
  return readJsonFile<Session>(DB_CONFIG.sessionsPath);
}

/**
 * 根據 ID 取得會話
 */
export async function getSessionById(id: string): Promise<Session | null> {
  const sessions = await getAllSessions();
  return sessions.find((s) => s.id === id) || null;
}

/**
 * 根據使用者 ID 取得所有會話
 */
export async function getSessionsByUserId(userId: string): Promise<Session[]> {
  const sessions = await getAllSessions();
  return sessions.filter((s) => s.userId === userId);
}

/**
 * 根據 token 取得會話
 */
export async function getSessionByToken(
  token: string
): Promise<Session | null> {
  const sessions = await getAllSessions();
  return sessions.find((s) => s.token === token) || null;
}

/**
 * 建立會話
 */
export async function createSession(
  data: CreateSessionData,
  jwtPayload: JwtPayload
): Promise<Session> {
  const now = new Date();

  // 根據 rememberMe 決定過期時間
  const expiryMs = data.rememberMe
    ? 7 * 24 * 60 * 60 * 1000 // 7 天
    : 30 * 60 * 1000; // 30 分鐘

  // 產生 token
  const token = data.rememberMe
    ? generateRefreshToken(jwtPayload)
    : generateAccessToken(jwtPayload);

  // 建立會話物件
  const session: Session = {
    id: randomUUID(),
    userId: data.userId,
    token,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + expiryMs).toISOString(),
    lastActivityAt: now.toISOString(),
    rememberMe: data.rememberMe,
  };

  // 寫入資料庫
  await updateJsonFile<Session>(DB_CONFIG.sessionsPath, (sessions) => [
    ...sessions,
    session,
  ]);

  return session;
}

/**
 * 更新會話活動時間
 */
export async function updateSessionActivity(sessionId: string): Promise<void> {
  await updateJsonFile<Session>(DB_CONFIG.sessionsPath, (sessions) => {
    const index = sessions.findIndex((s) => s.id === sessionId);
    if (index !== -1) {
      sessions[index].lastActivityAt = new Date().toISOString();
    }
    return sessions;
  });
}

/**
 * 撤銷會話
 */
export async function revokeSession(sessionId: string): Promise<boolean> {
  let revoked = false;

  await updateJsonFile<Session>(DB_CONFIG.sessionsPath, (sessions) => {
    const initialLength = sessions.length;
    const filtered = sessions.filter((s) => s.id !== sessionId);
    revoked = filtered.length < initialLength;
    return filtered;
  });

  return revoked;
}

/**
 * 撤銷使用者的所有會話
 */
export async function revokeAllUserSessions(userId: string): Promise<number> {
  let revokedCount = 0;

  await updateJsonFile<Session>(DB_CONFIG.sessionsPath, (sessions) => {
    const filtered = sessions.filter((s) => {
      if (s.userId === userId) {
        revokedCount++;
        return false;
      }
      return true;
    });
    return filtered;
  });

  return revokedCount;
}

/**
 * 清理過期會話
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const now = new Date().toISOString();
  let cleanedCount = 0;

  await updateJsonFile<Session>(DB_CONFIG.sessionsPath, (sessions) => {
    const filtered = sessions.filter((s) => {
      if (s.expiresAt < now) {
        cleanedCount++;
        return false;
      }
      return true;
    });
    return filtered;
  });

  return cleanedCount;
}
