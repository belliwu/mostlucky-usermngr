import path from "path";

/**
 * 資料庫路徑設定
 */
export const DB_CONFIG = {
  dataDir: path.join(process.cwd(), "data"),
  logsDir: path.join(process.cwd(), "logs"),

  // JSON 檔案路徑
  usersPath: path.join(process.cwd(), "data", "users.json"),
  sessionsPath: path.join(process.cwd(), "data", "sessions.json"),
  securityLogsPath: path.join(process.cwd(), "data", "security-logs.json"),
};
