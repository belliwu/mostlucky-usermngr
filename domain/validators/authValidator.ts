/**
 * 身份驗證資料驗證器
 */

export interface ValidationResult {
  success: boolean;
  errors: string[];
}

/**
 * 驗證登入資料
 */
export function validateLoginData(
  email: string,
  password: string
): ValidationResult {
  const errors: string[] = [];

  if (!email || email.trim() === "") {
    errors.push("Email 不能為空");
  }

  if (!password || password === "") {
    errors.push("密碼不能為空");
  }

  return {
    success: errors.length === 0,
    errors,
  };
}
