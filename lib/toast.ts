import { toast as toastFn } from "@/components/ui/use-toast";

/**
 * Toast 訊息統一規範與輔助函式
 * 三種訊息類型：成功、系統、錯誤
 */

export interface ToastMessage {
  title: string;
  description?: string;
}

/**
 * 成功訊息（綠色）- 用於使用者動作成功完成
 * 範例：註冊成功、登入成功、資料儲存成功
 */
export function showSuccessToast(message: ToastMessage) {
  toastFn({
    title: message.title,
    description: message.description,
    variant: "default",
    className: "border-green-500 bg-green-50 text-green-900",
  });
}

/**
 * 系統訊息（藍色）- 用於系統狀態通知
 * 範例：會話過期、需要重新登入、系統維護通知
 */
export function showSystemToast(message: ToastMessage) {
  toastFn({
    title: message.title,
    description: message.description,
    variant: "default",
    className: "border-blue-500 bg-blue-50 text-blue-900",
  });
}

/**
 * 錯誤訊息（紅色）- 用於錯誤與失敗情境
 * 範例：登入失敗、格式錯誤、權限不足、帳號鎖定
 */
export function showErrorToast(message: ToastMessage) {
  toastFn({
    title: message.title,
    description: message.description,
    variant: "destructive",
  });
}

/**
 * 訊息碼對應表（用於 Server Actions 回傳）
 */
export const TOAST_MESSAGES = {
  // 成功訊息
  REGISTER_SUCCESS: {
    title: "註冊成功",
    description: "歡迎加入！正在導向儀表板...",
  },
  LOGIN_SUCCESS: { title: "登入成功", description: "歡迎回來！" },
  LOGOUT_SUCCESS: { title: "登出成功", description: "您已安全登出" },

  // 系統訊息
  SESSION_EXPIRED: { title: "會話已過期", description: "請重新登入" },
  NEED_LOGIN: { title: "需要登入", description: "請先登入以存取此頁面" },

  // 錯誤訊息
  INVALID_CREDENTIALS: { title: "登入失敗", description: "Email 或密碼錯誤" },
  EMAIL_EXISTS: { title: "註冊失敗", description: "此 Email 已被註冊" },
  INVALID_EMAIL: { title: "格式錯誤", description: "Email 格式不正確" },
  WEAK_PASSWORD: { title: "密碼強度不足", description: "密碼至少需 8 個字元" },
  ACCOUNT_LOCKED: {
    title: "帳號已鎖定",
    description: "連續登入失敗，請 15 分鐘後再試",
  },
  PERMISSION_DENIED: { title: "權限不足", description: "您沒有權限執行此操作" },
  SERVER_ERROR: { title: "系統錯誤", description: "請稍後再試" },
} as const;

export type ToastMessageCode = keyof typeof TOAST_MESSAGES;
