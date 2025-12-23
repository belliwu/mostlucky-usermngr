import {
  SecurityLog,
  CreateSecurityLogData,
} from "@/domain/models/SecurityLog";
import {
  readJsonFile,
  writeJsonFile,
  updateJsonFile,
} from "@/infrastructure/database/jsonDb";
import { DB_CONFIG } from "@/infrastructure/database/dbConfig";
import { randomUUID } from "crypto";

/**
 * 安全日誌資料存取層（Repository）
 */

/**
 * 取得所有安全日誌
 */
export async function getAllSecurityLogs(): Promise<SecurityLog[]> {
  return readJsonFile<SecurityLog>(DB_CONFIG.securityLogsPath);
}

/**
 * 根據使用者 ID 取得安全日誌
 */
export async function getSecurityLogsByUserId(
  userId: string
): Promise<SecurityLog[]> {
  const logs = await getAllSecurityLogs();
  return logs.filter((log) => log.userId === userId);
}

/**
 * 根據 Email 取得安全日誌
 */
export async function getSecurityLogsByEmail(
  email: string
): Promise<SecurityLog[]> {
  const logs = await getAllSecurityLogs();
  return logs.filter((log) => log.email?.toLowerCase() === email.toLowerCase());
}

/**
 * 建立安全日誌
 */
export async function createSecurityLog(
  data: CreateSecurityLogData
): Promise<SecurityLog> {
  const log: SecurityLog = {
    id: randomUUID(),
    userId: data.userId,
    email: data.email,
    eventType: data.eventType,
    success: data.success,
    message: data.message,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    timestamp: new Date().toISOString(),
  };

  // 寫入資料庫
  await updateJsonFile<SecurityLog>(DB_CONFIG.securityLogsPath, (logs) => [
    ...logs,
    log,
  ]);

  return log;
}

/**
 * 取得最近的登入失敗次數（指定時間範圍內）
 */
export async function getRecentFailedLoginAttempts(
  email: string,
  timeWindowMs: number
): Promise<number> {
  const logs = await getSecurityLogsByEmail(email);
  const cutoffTime = new Date(Date.now() - timeWindowMs).toISOString();

  return logs.filter(
    (log) =>
      log.eventType === "login_failed" &&
      !log.success &&
      log.timestamp > cutoffTime
  ).length;
}
