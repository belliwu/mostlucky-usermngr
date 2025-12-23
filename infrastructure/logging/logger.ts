import fs from "fs/promises";
import { LOG_CONFIG, LogLevel, ensureLogDirectory } from "./logConfig";

/**
 * 日誌核心
 */

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

/**
 * 格式化日誌訊息
 */
function formatLogEntry(entry: LogEntry): string {
  const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : "";
  return `[${entry.timestamp}] [${entry.level}] ${entry.message}${dataStr}\n`;
}

/**
 * 寫入日誌檔案
 */
async function writeToFile(filePath: string, content: string): Promise<void> {
  try {
    await ensureLogDirectory();
    await fs.appendFile(filePath, content, "utf-8");
  } catch (error) {
    console.error("Failed to write log:", error);
  }
}

/**
 * 記錄日誌
 */
async function log(
  level: LogLevel,
  message: string,
  data?: any
): Promise<void> {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
  };

  const formatted = formatLogEntry(entry);

  // 輸出到控制台
  if (LOG_CONFIG.consoleOutput) {
    if (level === LogLevel.ERROR) {
      console.error(formatted);
    } else {
      console.log(formatted);
    }
  }

  // 寫入檔案
  await writeToFile(LOG_CONFIG.logFile, formatted);

  // 錯誤日誌另外寫入錯誤檔案
  if (level === LogLevel.ERROR) {
    await writeToFile(LOG_CONFIG.errorLogFile, formatted);
  }
}

/**
 * Logger 函式
 */
export const logger = {
  debug: (message: string, data?: any) => log(LogLevel.DEBUG, message, data),
  info: (message: string, data?: any) => log(LogLevel.INFO, message, data),
  warn: (message: string, data?: any) => log(LogLevel.WARN, message, data),
  error: (message: string, data?: any) => log(LogLevel.ERROR, message, data),
};
