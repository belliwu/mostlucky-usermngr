import fs from "fs/promises";
import path from "path";

/**
 * JSON 資料庫輔助工具
 * 提供檔案鎖定機制的 JSON 讀寫操作
 */

// 簡易檔案鎖定（適用於開發環境）
const fileLocks = new Map<string, Promise<void>>();

async function withLock<T>(
  filePath: string,
  operation: () => Promise<T>
): Promise<T> {
  // 等待現有的鎖定操作完成
  const existingLock = fileLocks.get(filePath);
  if (existingLock) {
    await existingLock;
  }

  // 建立新的鎖定
  let resolveLock: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    resolveLock = resolve;
  });
  fileLocks.set(filePath, lockPromise);

  try {
    const result = await operation();
    return result;
  } finally {
    resolveLock!();
    fileLocks.delete(filePath);
  }
}

/**
 * 讀取 JSON 檔案
 */
export async function readJsonFile<T>(filePath: string): Promise<T[]> {
  return withLock(filePath, async () => {
    try {
      // 確保目錄存在
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      // 讀取檔案
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data) as T[];
    } catch (error: any) {
      // 檔案不存在，回傳空陣列
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  });
}

/**
 * 寫入 JSON 檔案
 */
export async function writeJsonFile<T>(
  filePath: string,
  data: T[]
): Promise<void> {
  return withLock(filePath, async () => {
    // 確保目錄存在
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // 寫入檔案
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  });
}

/**
 * 更新 JSON 檔案（讀取 → 修改 → 寫入）
 */
export async function updateJsonFile<T>(
  filePath: string,
  updateFn: (data: T[]) => T[]
): Promise<void> {
  return withLock(filePath, async () => {
    const data = await readJsonFile<T>(filePath);
    const updatedData = updateFn(data);
    await writeJsonFile(filePath, updatedData);
  });
}
