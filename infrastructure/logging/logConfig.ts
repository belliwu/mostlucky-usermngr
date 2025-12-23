import fs from "fs/promises";
import path from "path";

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
export const LOG_CONFIG = {
  logDir: path.join(process.cwd(), "logs"),
  logFile: path.join(process.cwd(), "logs", "app.log"),
  errorLogFile: path.join(process.cwd(), "logs", "error.log"),

  // 是否輸出到控制台
  consoleOutput: process.env.NODE_ENV !== "production",

  // 最小日誌層級
  minLevel: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
};

/**
 * 確保日誌目錄存在
 */
export async function ensureLogDirectory(): Promise<void> {
  await fs.mkdir(LOG_CONFIG.logDir, { recursive: true });
}
