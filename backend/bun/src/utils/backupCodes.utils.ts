import crypto from 'crypto';
import { prisma } from './permission.utils';

/**
 * Generates secure backup codes and stores them for a user.
 *
 * @param userId - The ID of the user
 * @param count - Number of backup codes to generate (default: 10)
 * @param length - Length of each backup code (default: 12)
 * @returns An array of plaintext codes to show to the user
 */
export async function generateAndStoreBackupCodes(
  userId: string,
  count = 10,
  length = 12,
) {
  const codes = Array.from({ length: count }, () => {
    const plaintext = crypto
      .randomBytes(length)
      .toString('hex')
      .slice(0, length);
    const hashed = crypto.createHash('sha256').update(plaintext).digest('hex');
    return { plaintext, hashed };
  });

  const hashedCodes = codes.map((code) => code.hashed);

  // Store hashed backup codes in DB
  await prisma.twoFactorSettings.update({
    where: { userId },
    data: { backupCodes: hashedCodes },
  });

  return codes.map((code) => code.plaintext); // Return plaintext codes to the user
}
