import { SecurityEventType } from "@/domain/enums/SecurityEventType";

/**
 * 安全日誌實體（領域模型）
 */
export interface SecurityLog {
  id: string;
  userId?: string;
  email?: string;
  eventType: SecurityEventType;
  success: boolean;
  message: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

/**
 * 建立安全日誌所需的資料
 */
export interface CreateSecurityLogData {
  userId?: string;
  email?: string;
  eventType: SecurityEventType;
  success: boolean;
  message: string;
  ipAddress?: string;
  userAgent?: string;
}
