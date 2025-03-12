export interface AuditLog {
    id: string;
    userId?: string;
    action: string;
    details?: string;
    ipAddress?: string;
    createdAt: Date;
  }
  