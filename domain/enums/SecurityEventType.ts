/**
 * 安全事件類型列舉
 */
export enum SecurityEventType {
  REGISTRATION = "registration",
  LOGIN_SUCCESS = "login_success",
  LOGIN_FAILED = "login_failed",
  LOGOUT = "logout",
  ACCOUNT_LOCKED = "account_locked",
  PASSWORD_RESET = "password_reset",
  USER_CREATED = "user_created",
  USER_DISABLED = "user_disabled",
  USER_ENABLED = "user_enabled",
}

export function isValidSecurityEventType(
  type: string
): type is SecurityEventType {
  return Object.values(SecurityEventType).includes(type as SecurityEventType);
}
