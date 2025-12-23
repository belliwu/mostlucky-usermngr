/**
 * 使用者資料驗證器
 */

export interface ValidationResult {
  success: boolean;
  errors: string[];
}

/**
 * Email 格式驗證
 */
export function validateEmail(
  email: string | null | undefined
): ValidationResult {
  const errors: string[] = [];

  if (!email || typeof email !== "string" || email.trim() === "") {
    errors.push("電子郵件不能為空");
    return { success: false, errors };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push("電子郵件格式不正確");
  }

  if (email.length > 255) {
    errors.push("電子郵件長度不可超過 255 字元");
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * 密碼強度驗證
 * 規則：至少 8 個字元，包含大寫、小寫和數字
 */
export function validatePassword(
  password: string | null | undefined
): ValidationResult {
  const errors: string[] = [];

  if (!password || typeof password !== "string") {
    errors.push("密碼不能為空");
    return { success: false, errors };
  }

  if (password.length < 8) {
    errors.push("密碼至少需要 8 個字元");
  }

  if (password.length > 100) {
    errors.push("密碼長度不可超過 100 字元");
  }

  // 檢查是否包含大寫字母
  if (!/[A-Z]/.test(password)) {
    errors.push("密碼必須包含至少一個大寫字母");
  }

  // 檢查是否包含小寫字母
  if (!/[a-z]/.test(password)) {
    errors.push("密碼必須包含至少一個小寫字母");
  }

  // 檢查是否包含數字
  if (!/[0-9]/.test(password)) {
    errors.push("密碼必須包含至少一個數字");
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * 驗證註冊資料
 */
export function validateRegistrationData(
  email: string,
  password: string
): ValidationResult {
  const errors: string[] = [];

  const emailValidation = validateEmail(email);
  if (!emailValidation.success) {
    errors.push(...emailValidation.errors);
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.success) {
    errors.push(...passwordValidation.errors);
  }

  return {
    success: errors.length === 0,
    errors,
  };
}
