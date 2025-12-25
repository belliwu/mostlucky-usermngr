import fs from "fs/promises";
import path from "path";
import os from "os";

/**
 * 日誌層級
 */
export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

/**
 * 日誌設定
 */
const isVercel = Boolean(process.env.VERCEL) || Boolean(process.env.VERCEL_ENV);

export const LOG_CONFIG = {
  // Vercel serverless 檔案系統通常是唯讀，避免寫入 /var/task
  logDir: isVercel
    ? path.join(os.tmpdir(), "mostlucky-usermngr", "logs")
    : path.join(process.cwd(), "logs"),
  logFile: isVercel
    ? path.join(os.tmpdir(), "mostlucky-usermngr", "logs", "app.log")
    : path.join(process.cwd(), "logs", "app.log"),
  errorLogFile: isVercel
    ? path.join(os.tmpdir(), "mostlucky-usermngr", "logs", "error.log")
    : path.join(process.cwd(), "logs", "error.log"),

  // Vercel 只輸出到 console（Functions logs），不寫檔
  fileOutput: !isVercel,

  // 是否輸出到控制台
  consoleOutput: process.env.NODE_ENV !== "production" || isVercel,

  // 最小日誌層級
  minLevel: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
};

/**
 * 確保日誌目錄存在
 */
export async function ensureLogDirectory(): Promise<void> {
  if (!LOG_CONFIG.fileOutput) return;
  await fs.mkdir(LOG_CONFIG.logDir, { recursive: true });
}
