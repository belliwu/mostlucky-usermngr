import fs from "fs/promises";
import path from "path";

/**
 * JSON 資料庫輔助工具
 * 提供檔案鎖定機制的 JSON 讀寫操作
 */

// 檔案鎖定佇列
const lockQueues = new Map<string, Array<() => void>>();
const activeLocks = new Set<string>();

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireFileLock(filePath: string): Promise<() => Promise<void>> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  const lockPath = `${filePath}.lock`;
  const start = Date.now();
  const timeoutMs = 5000;

  while (true) {
    try {
      const handle = await fs.open(lockPath, "wx");
      await handle.close();
      return async () => {
        try {
          await fs.unlink(lockPath);
        } catch {
          // ignore
        }
      };
    } catch (error: any) {
      if (error?.code !== "EEXIST") {
        throw error;
      }

      if (Date.now() - start > timeoutMs) {
        throw new Error(`Timeout acquiring file lock: ${lockPath}`);
      }

      await sleep(10);
    }
  }
}

async function withLock<T>(
  filePath: string,
  operation: () => Promise<T>
): Promise<T> {
  // 等待輪到這個操作
  await new Promise<void>((resolve) => {
    if (!activeLocks.has(filePath)) {
      // 沒有其他操作在執行，立即執行
      activeLocks.add(filePath);
      resolve();
    } else {
      // 有其他操作在執行，加入佇列
      if (!lockQueues.has(filePath)) {
        lockQueues.set(filePath, []);
      }
      lockQueues.get(filePath)!.push(resolve);
    }
  });

  let releaseFileLock: (() => Promise<void>) | null = null;

  try {
    // 跨行程檔案鎖（Jest 多 worker/多行程時避免 JSON 被同時寫壞）
    releaseFileLock = await acquireFileLock(filePath);
    return await operation();
  } finally {
    if (releaseFileLock) {
      await releaseFileLock();
    }

    // 釋放鎖定，啟動佇列中的下一個操作
    const queue = lockQueues.get(filePath);
    if (queue && queue.length > 0) {
      const next = queue.shift()!;
      next();
    } else {
      activeLocks.delete(filePath);
      lockQueues.delete(filePath);
    }
  }
}

/**
 * 讀取 JSON 檔案（內部版本，不使用鎖定）
 */
async function readJsonFileInternal<T>(filePath: string): Promise<T[]> {
  try {
    // 確保目錄存在
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // 讀取檔案
    const data = await fs.readFile(filePath, "utf-8");
    if (!data || data.trim() === "") {
      return [];
    }
    return JSON.parse(data) as T[];
  } catch (error: any) {
    // 檔案不存在，回傳空陣列
    if (error.code === "ENOENT") {
      return [];
    }
    // JSON 內容損壞或被截斷：回傳空陣列（避免測試多行程互相干擾時直接炸掉）
    if (error instanceof SyntaxError) {
      return [];
    }
    throw error;
  }
}

/**
 * 寫入 JSON 檔案（內部版本，不使用鎖定）
 */
async function writeJsonFileInternal<T>(
  filePath: string,
  data: T[]
): Promise<void> {
  // 確保目錄存在
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  // 寫入檔案
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * 讀取 JSON 檔案
 */
export async function readJsonFile<T>(filePath: string): Promise<T[]> {
  return withLock(filePath, async () => {
    return readJsonFileInternal<T>(filePath);
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
    await writeJsonFileInternal(filePath, data);
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
    const data = await readJsonFileInternal<T>(filePath);
    const updatedData = updateFn(data);
    await writeJsonFileInternal(filePath, updatedData);
  });
}
