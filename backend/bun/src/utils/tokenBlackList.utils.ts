import crypto from "crypto";
import redisClient from "../config/redis.config";

/**
 * Hash a token using SHA-256 to prevent storing raw JWTs
 * @param token - JWT token
 */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Add token to blacklist
 * @param token - JWT token to blacklist
 * @param expiry - Expiry time (in seconds)
 */
export async function blacklistToken(token: string, expiry: number) {
  try {
    const hashedToken = hashToken(token);
    await redisClient.set(`blacklist:${hashedToken}`, "true", "EX", expiry);
  } catch (error) {
    console.error("[REDIS] Failed to blacklist token:", error);
  }
}

/**
 * Check if token is blacklisted
 * @param token - JWT token
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  try {
    const hashedToken = hashToken(token);
    const result = await redisClient.get(`blacklist:${hashedToken}`);
    return result === "true";
  } catch (error) {
    console.error("[REDIS] Failed to check token blacklist:", error);
    return false;
  }
}
