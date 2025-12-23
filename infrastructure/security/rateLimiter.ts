/**
 * 速率限制與帳號鎖定輔助工具
 */

export interface RateLimitEntry {
  count: number;
  resetAt: number; // timestamp
}

// 記憶體快取（適用於開發環境，生產環境應使用 Redis）
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * 檢查速率限制
 * @param key 限制鍵值（例如 email）
 * @param maxAttempts 最大嘗試次數
 * @param windowMs 時間窗口（毫秒）
 * @returns 是否允許操作
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    // 無記錄或已過期，重置計數
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxAttempts) {
    // 超過限制
    return false;
  }

  // 增加計數
  entry.count++;
  rateLimitStore.set(key, entry);
  return true;
}

/**
 * 重置速率限制
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * 取得剩餘鎖定時間（秒）
 */
export function getRemainingLockTime(key: string): number {
  const entry = rateLimitStore.get(key);
  if (!entry) {
    return 0;
  }

  const now = Date.now();
  if (now > entry.resetAt) {
    return 0;
  }

  return Math.ceil((entry.resetAt - now) / 1000);
}
