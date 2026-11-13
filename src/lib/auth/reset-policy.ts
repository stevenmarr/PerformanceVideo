import { createHash, randomBytes } from "node:crypto";

export const RESET_EMAIL_LIMIT = 5;
export const RESET_IP_LIMIT = 20;
export const RESET_WINDOW_MS = 60 * 60 * 1000;
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Same sentence for every request so the response cannot be used to list accounts. */
export const RESET_GENERIC_MESSAGE =
  "If an account exists for that email, a reset link is on its way. It expires in one hour.";

export const RESET_INVALID_MESSAGE = "That reset link is invalid or has expired.";

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newResetToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isRateLimited(emailCount: number, ipCount: number): boolean {
  return emailCount >= RESET_EMAIL_LIMIT || ipCount >= RESET_IP_LIMIT;
}

export function tokenStillValid(expiresAt: unknown, usedAt: unknown, now: Date): boolean {
  if (usedAt != null && usedAt !== "") return false;
  const expires = asTime(expiresAt);
  return expires > now.getTime();
}

export function asTime(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  const parsed = Date.parse(String(value ?? ""));
  return Number.isNaN(parsed) ? 0 : parsed;
}
