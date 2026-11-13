import bcrypt from "bcryptjs";
import { verifyPassword as verifyScrypt } from "@better-auth/utils/password";

/** bcrypt cost. Tests pass a lower cost; production stays at 12. */
export const BCRYPT_ROUNDS = 12;

export function isBcryptHash(hash: string): boolean {
  return /^\$2[aby]\$/.test(hash);
}

export async function hashPassword(password: string, rounds = BCRYPT_ROUNDS): Promise<string> {
  return bcrypt.hash(password, rounds);
}

/**
 * Verify a stored password. New hashes are bcrypt. Older Better Auth rows are
 * scrypt, stored as `salt:key`, and still verify so existing sign-ins keep working.
 */
export async function verifyStoredPassword(hash: string, password: string): Promise<boolean> {
  if (!hash) return false;
  if (isBcryptHash(hash)) return bcrypt.compare(password, hash);
  if (!hash.includes(":")) return false;
  try {
    return await verifyScrypt(hash, password);
  } catch {
    return false;
  }
}

export function passwordError(password: string): string | null {
  if (password.length < 8 || password.length > 128) return "Use 8 to 128 characters.";
  return null;
}
