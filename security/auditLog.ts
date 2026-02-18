
import { SecurityEvent } from '../types';

export const createAuditEntry = (
  type: SecurityEvent['type'],
  description: string,
  severity: SecurityEvent['severity'],
  userId?: string,
  ip: string = "127.0.0.1"
): SecurityEvent => ({
  id: `sec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  timestamp: Date.now(),
  type,
  description,
  severity,
  userId,
  ip
});
