import { randomBytes } from "node:crypto";
import type { Queryable } from "@/lib/queryable";
import { hashPassword, passwordError, verifyStoredPassword } from "./password-crypto.ts";
import {
  RESET_TOKEN_TTL_MS,
  RESET_WINDOW_MS,
  asTime,
  hashResetToken,
  isRateLimited,
  newResetToken,
  tokenStillValid,
} from "./reset-policy.ts";

export type ResetDelivery = { email: string; token: string } | null;

async function countSince(db: Queryable, bucket: string, since: Date): Promise<number> {
  const rows = await db.query<{ count: number | string }>(
    `select count(*)::int as count from password_reset_attempts where bucket = $1 and created_at >= $2`,
    [bucket, since],
  );
  return Number(rows[0]?.count ?? 0);
}

async function recordAttempt(db: Queryable, bucket: string, now: Date): Promise<void> {
  await db.query(`insert into password_reset_attempts (bucket, created_at) values ($1, $2)`, [bucket, now]);
}

/**
 * Create a single-use reset token or return null when there is nothing to send.
 * Null covers unknown emails, disabled-lookup misses, and rate limits — callers
 * show the same message either way.
 */
export async function issuePasswordReset(
  db: Queryable,
  input: { email: string; ip: string; now?: Date; token?: string },
): Promise<ResetDelivery> {
  const now = input.now ?? new Date();
  const email = input.email.trim().toLowerCase();
  const ip = input.ip.trim() || "unknown";
  const since = new Date(now.getTime() - RESET_WINDOW_MS);
  await db.query(`delete from password_reset_attempts where created_at < $1`, [
    new Date(now.getTime() - RESET_WINDOW_MS * 24),
  ]);
  const emailBucket = `email:${email}`;
  const ipBucket = `ip:${ip}`;
  const emailCount = await countSince(db, emailBucket, since);
  const ipCount = await countSince(db, ipBucket, since);
  await recordAttempt(db, emailBucket, now);
  await recordAttempt(db, ipBucket, now);
  if (!email.includes("@") || isRateLimited(emailCount, ipCount)) return null;

  const people = await db.query<{ id: string; email: string }>(
    `select id, email from "user" where lower(email) = $1 limit 1`,
    [email],
  );
  const person = people[0];
  if (!person) return null;

  const token = input.token ?? newResetToken();
  const expires = new Date(now.getTime() + RESET_TOKEN_TTL_MS);
  await db.query(
    `update password_reset_tokens set used_at = $2 where user_id = $1 and used_at is null`,
    [person.id, now],
  );
  await db.query(
    `insert into password_reset_tokens (id, user_id, token_hash, expires_at, created_at)
     values ($1, $2, $3, $4, $5)`,
    [randomBytes(16).toString("hex"), person.id, hashResetToken(token), expires, now],
  );
  return { email: person.email, token };
}

async function writeCredentialPassword(db: Queryable, userId: string, hash: string, now: Date): Promise<void> {
  const existing = await db.query<{ id: string }>(
    `select id from "account" where "userId" = $1 and "providerId" = 'credential' limit 1`,
    [userId],
  );
  if (existing.length) {
    await db.query(
      `update "account" set password = $2, "updatedAt" = $3 where "userId" = $1 and "providerId" = 'credential'`,
      [userId, hash, now],
    );
  } else {
    await db.query(
      `insert into "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
       values ($1, $2, 'credential', $3, $4, $5, $5)`,
      [randomBytes(16).toString("hex"), userId, userId, hash, now],
    );
  }
  await db.query(`update "user" set must_change_password = false, "updatedAt" = $2 where id = $1`, [userId, now]);
  await db.query(`delete from "session" where "userId" = $1`, [userId]);
}

export async function completePasswordReset(
  db: Queryable,
  input: {
    token: string;
    password: string;
    now?: Date;
    hash?: (password: string) => Promise<string>;
  },
): Promise<{ ok: true } | { ok: false }> {
  if (passwordError(input.password)) return { ok: false };
  const now = input.now ?? new Date();
  const token = input.token.trim();
  if (!token) return { ok: false };
  const rows = await db.query<{ id: string; user_id: string; expires_at: unknown; used_at: unknown }>(
    `select id, user_id, expires_at, used_at from password_reset_tokens where token_hash = $1 limit 1`,
    [hashResetToken(token)],
  );
  const row = rows[0];
  if (!row || !tokenStillValid(row.expires_at, row.used_at, now)) return { ok: false };
  const claimed = await db.query<{ id: string }>(
    `update password_reset_tokens set used_at = $2 where id = $1 and used_at is null returning id`,
    [row.id, now],
  );
  if (!claimed.length) return { ok: false };
  const hash = await (input.hash ?? hashPassword)(input.password);
  await writeCredentialPassword(db, row.user_id, hash, now);
  return { ok: true };
}

export async function changeOwnPassword(
  db: Queryable,
  input: {
    userId: string;
    currentPassword: string;
    newPassword: string;
    now?: Date;
    hash?: (password: string) => Promise<string>;
    verify?: (hash: string, password: string) => Promise<boolean>;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const policy = passwordError(input.newPassword);
  if (policy) return { ok: false, error: policy };
  if (input.currentPassword === input.newPassword) {
    return { ok: false, error: "Choose a different password." };
  }
  const rows = await db.query<{ password: string | null }>(
    `select password from "account" where "userId" = $1 and "providerId" = 'credential' limit 1`,
    [input.userId],
  );
  const stored = rows[0]?.password ?? "";
  const verify = input.verify ?? verifyStoredPassword;
  const matches = stored ? await verify(stored, input.currentPassword) : false;
  if (!matches) return { ok: false, error: "The current password is wrong." };
  const now = input.now ?? new Date();
  const hash = await (input.hash ?? hashPassword)(input.newPassword);
  await writeCredentialPassword(db, input.userId, hash, now);
  return { ok: true };
}

export async function changeOwnEmail(
  db: Queryable,
  input: {
    userId: string;
    email: string;
    currentPassword: string;
    verify?: (hash: string, password: string) => Promise<boolean>;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email." };
  const accounts = await db.query<{ password: string | null }>(
    `select password from "account" where "userId" = $1 and "providerId" = 'credential' limit 1`,
    [input.userId],
  );
  const stored = accounts[0]?.password ?? "";
  const verify = input.verify ?? verifyStoredPassword;
  if (!stored || !(await verify(stored, input.currentPassword))) {
    return { ok: false, error: "The current password is wrong." };
  }
  const taken = await db.query<{ id: string }>(
    `select id from "user" where lower(email) = $1 and id <> $2 limit 1`,
    [email, input.userId],
  );
  if (taken.length) return { ok: false, error: "That email is already in use." };
  await db.query(`update "user" set email = $2, "updatedAt" = now() where id = $1`, [input.userId, email]);
  return { ok: true };
}

export async function resolveLoginEmail(db: Queryable, identifier: string): Promise<string> {
  const value = identifier.trim();
  if (value.includes("@")) return value;
  const rows = await db.query<{ email: string }>(
    `select email from "user" where username <> '' and lower(username) = lower($1) limit 1`,
    [value],
  );
  return rows[0]?.email ?? value;
}

export function resetExpiresAt(value: unknown): number {
  return asTime(value);
}
