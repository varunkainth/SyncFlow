export interface Session {
    id: string;
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
    createdAt: Date;
  }
  