import { JwtPayload } from 'jsonwebtoken';
import { Role, Permission } from '../constants/permissions.constants'; // Use Role & Permission from constants

/**
 * TokenPayload: The structure of JWT tokens used for authentication.
 * - Extends `JwtPayload` for compatibility with JWT libraries.
 */
export interface TokenPayload extends JwtPayload {
  userId: string;
  email: string;
  roles?: Role[]; // Uses Role[] from constants
  permissions?: Permission[]; // Uses Permission[] from constants
}

/**
 * User: Represents the authenticated user stored in `req.user` after token verification.
 */
export interface User {
  userId: string;
  email: string;
  roles: Role[]; // Uses Role[] from constants
  permissions?: Permission[]; // Uses Permission[] from constants
}

// Extend Express Request to include `user`
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export interface AuthPayload {
  token: string;
  refreshToken?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  username: string;
  firstname: string;
  lastname: string;
  gender?: string;
  phone?: string;
}
