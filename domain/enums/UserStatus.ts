/**
 * 使用者帳號狀態列舉
 */
export enum UserStatus {
  ACTIVE = "active",
  DISABLED = "disabled",
  LOCKED = "locked",
}

export function isValidUserStatus(status: string): status is UserStatus {
  return Object.values(UserStatus).includes(status as UserStatus);
}
