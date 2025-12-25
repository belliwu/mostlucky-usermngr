import os from "os";
import path from "path";

/**
 * 資料庫路徑設定
 *
 * 注意：Vercel 的部署環境通常是唯讀檔案系統，無法寫入專案目錄。
 * 若沒有外部資料庫（demo 模式），改用 OS temp 目錄（可寫但不持久）。
 */

const isVercel = process.env.VERCEL === "1";

const baseDir = isVercel
  ? path.join(os.tmpdir(), "mostlucky-usermngr")
  : process.cwd();

export const DB_CONFIG = {
  dataDir: isVercel ? path.join(baseDir, "data") : path.join(baseDir, "data"),
  logsDir: isVercel ? path.join(baseDir, "logs") : path.join(baseDir, "logs"),

  // JSON 檔案路徑
  usersPath: path.join(baseDir, "data", "users.json"),
  sessionsPath: path.join(baseDir, "data", "sessions.json"),
  securityLogsPath: path.join(baseDir, "data", "security-logs.json"),
};
