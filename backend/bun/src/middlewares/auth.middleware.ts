import { Request, Response, NextFunction } from "express";
import { isTokenBlacklisted } from "../utils/tokenBlackList.utils";
import { verifyAccessToken } from "../utils/token.utils";
import { User } from "../types/auth.types";

/**
 * Extended Express Request to include `user`
 */
export interface AuthenticatedRequest extends Request {
  user?: User;
}

/**
 * Authentication Middleware to verify JWT and attach `req.user`.
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    // Validate authorization header
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized: No token provided" });
      return;
    }

    // Extract token
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      res.status(401).json({ error: "Unauthorized: Empty token provided" });
      return;
    }

    // Check if token is blacklisted
    if (await isTokenBlacklisted(token)) {
      res.status(401).json({ error: "Unauthorized: Token is revoked" });
      return;
    }

    // Verify token
    const decodedUser = verifyAccessToken(token);
    if (!decodedUser) {
      res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
      return;
    }

    // Attach user to request
    req.user = decodedUser;
    next();
  } catch (error) {
    console.error("[Auth] Authentication failed:", error);
    res.status(401).json({ error: "Unauthorized: Authentication failed" });
  }
}
