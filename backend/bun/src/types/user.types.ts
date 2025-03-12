import { AuditLog } from './auditLog.types';
import { Role } from './permission.types';
import { Profile } from './profile.types';
import { Session } from './session.types';

// Define Two-Factor Authentication (2FA) Settings
export interface TwoFactorSettings {
  id: string;
  userId: string;
  emailEnabled: boolean;
  emailCode?: string;
  otpEnabled: boolean;
  otpSecret?: string;
  authAppEnabled: boolean;
  authAppSecret?: string;
  backupCodes: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Define User Input Type
export interface UserInput {
  id?: string;
  email?: string;
  password?: string;
  username?: string; // `name` is optional, so use `?` instead of `| null`
  isActive?: boolean;
  isEmailVerified?: boolean;
  roles?: Role[];
  profile?: Profile;
  sessions?: Session[];
  auditLogs?: AuditLog[];
  createdAt?: Date;
  updatedAt?: Date;

  // Security Fields
  failedAttempts?: number;
  isLocked?: boolean;
  lastLoginAt?: Date;

  // Two-Factor Authentication (2FA)
  twoFactorSettings?: TwoFactorSettings;
}
