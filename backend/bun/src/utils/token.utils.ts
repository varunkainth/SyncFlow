import jwt, {
  JwtPayload,
  Secret,
  SignOptions,
  VerifyErrors,
} from 'jsonwebtoken';
import { User, TokenPayload } from '../types/auth.types'; // Ensure correct path
import {
  ROLES,
  Role,
  ALL_PERMISSIONS,
  Permission,
} from '../constants/permissions.constants'; // Fixed import path
import { v4 as uuidv4 } from 'uuid';

// Ensure required environment variables exist
if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
  throw new Error('Missing required JWT secrets in environment variables.');
}

// Token Secrets
const ACCESS_TOKEN_SECRET: Secret = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET: Secret = process.env.REFRESH_TOKEN_SECRET;

/**
 * Parses expiration values from environment variables.
 * Supports numeric values (e.g., "3600") and string durations (e.g., "15m", "7d").
 */
const parseExpiry = (
  value: string | undefined,
  defaultValue: SignOptions['expiresIn'],
): SignOptions['expiresIn'] => {
  if (!value) return defaultValue;
  return !isNaN(Number(value))
    ? Number(value)
    : (value as SignOptions['expiresIn']);
};

// Token Expiry (Supports both numeric values and time strings like "15m", "7d")
const ACCESS_TOKEN_EXPIRY: SignOptions['expiresIn'] = parseExpiry(
  process.env.ACCESS_TOKEN_EXPIRY,
  '15m',
);
const REFRESH_TOKEN_EXPIRY: SignOptions['expiresIn'] = parseExpiry(
  process.env.REFRESH_TOKEN_EXPIRY,
  '7d',
);

// Generate Access Token (Short-lived, includes role & permissions)
export function generateAccessToken(
  user: Pick<TokenPayload, 'userId' | 'email' | 'roles' | 'permissions'>,
): string {
  const payload: TokenPayload = {
    userId: user.userId,
    email: user.email,
    roles: user.roles,
    permissions: user.permissions || [],
    iss: 'SyncFlow', // Issuer
    aud: 'SyncFlow-Aud', // Audience
    sub: user.userId, // Subject
  };

  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    algorithm: 'HS512', // Use a stronger algorithm
  });
}

// Generate Refresh Token (Long-lived, includes userId and a unique identifier)
export function generateRefreshToken(userId: string): string {
  const refreshPayload = {
    userId,
    jti: uuidv4(), // Unique identifier for the token
  };

  return jwt.sign(refreshPayload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    algorithm: 'HS512', // Use a stronger algorithm
  });
}

// Verify Access Token (Returns a User object or null if invalid)
export function verifyAccessToken(token: string): User | null {
  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET, {
      algorithms: ['HS512'], // Enforce algorithm
      issuer: 'SyncFlow', // Issuer
      audience: 'SyncFlow-Aud', // Audience
    }) as TokenPayload;

    // Ensure roles is an array
    const roles = Array.isArray(payload.roles)
      ? payload.roles
      : [payload.roles];

    // Validate roles
    const validRoles = roles.filter((role): role is Role =>
      ROLES.includes(role as Role),
    );

    // Validate permissions
    const validPermissions = (payload.permissions || []).filter(
      (perm): perm is Permission =>
        ALL_PERMISSIONS.includes(perm as Permission),
    );

    return {
      userId: payload.userId,
      email: payload.email,
      roles: validRoles,
      permissions: validPermissions,
    };
  } catch (error) {
    console.error(
      '[JWT] Token verification failed:',
      (error as VerifyErrors).message,
    );
    return null;
  }
}

// Verify Refresh Token (Returns userId or null if invalid)
export function verifyRefreshToken(
  token: string,
): { userId: string; jti: string } | null {
  try {
    const payload = jwt.verify(token, REFRESH_TOKEN_SECRET, {
      algorithms: ['HS512'], // Enforce algorithm
    }) as { userId: string; jti: string };

    if (!payload.userId || !payload.jti) {
      throw new Error('Invalid refresh token payload');
    }

    return payload;
  } catch (error) {
    console.error(
      '[JWT] Refresh token verification failed:',
      (error as VerifyErrors).message,
    );
    return null;
  }
}

export function generatetoken(email: string) {
  // Generate a new token
  const token = jwt.sign(
    {
      email: email,
      data: process.env.RANDOM_TOKEN_SECRET,
    },
    process.env.RANDOM_TOKEN_SECRET as string,
    {
      expiresIn: '1h',
      algorithm: 'HS512', // Use a stronger algorithm
      issuer: 'SyncFlow', // Issuer
      audience: 'SyncFlow-Aud', // Audience},
    },
  );
  return token;
}

export function verifyToken(token: string) {
  // Verify the token
  const decoded = jwt.verify(token, process.env.RANDOM_TOKEN_SECRET as string, {
    algorithms: ['HS512'], // Enforce algorithm
    issuer: 'SyncFlow', // Issuer
    audience: 'SyncFlow-Aud', // Audience
  });
  return (decoded as JwtPayload).email;
}
