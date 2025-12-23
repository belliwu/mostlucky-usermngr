/**
 * 使用者角色列舉
 */
export enum UserRole {
  USER = "user",
  ADMIN = "admin",
}

export function isValidUserRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}
