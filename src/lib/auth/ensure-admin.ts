import { randomBytes } from "node:crypto";
import type { Queryable } from "@/lib/queryable";
import { hashPassword } from "./password-crypto.ts";

export const DESIGN_ADMIN_USERNAME = "stevenmarr";
export const DESIGN_ADMIN_EMAIL = "stevenmarr@performance-video.local";

export type EnsureAdminResult = { status: "skipped" | "created" | "exists" };

type EnsureOptions = {
  hash?: (password: string) => Promise<string>;
  log?: (line: string) => void;
  now?: Date;
  id?: string;
};

/**
 * Idempotent admin bootstrap. The password is read only from DESIGN_ADMIN_PASSWORD.
 * A missing value skips with a log line and does not create or modify a user.
 * Once the account exists, later runs do not rotate the password.
 */
export async function ensureDesignAdmin(
  db: Queryable,
  env: { DESIGN_ADMIN_PASSWORD?: string; DESIGN_ADMIN_EMAIL?: string },
  options: EnsureOptions = {},
): Promise<EnsureAdminResult> {
  const log = options.log ?? ((line) => console.info(line));
  const password = env.DESIGN_ADMIN_PASSWORD?.trim() ?? "";
  if (!password) {
    log("[seed] DESIGN_ADMIN_PASSWORD is not set; skipping admin user stevenmarr");
    return { status: "skipped" };
  }
  const email = (env.DESIGN_ADMIN_EMAIL?.trim() || DESIGN_ADMIN_EMAIL).toLowerCase();
  const existing = await db.query<{ id: string }>(
    `select id from "user" where username = $1 or lower(email) = lower($2) limit 1`,
    [DESIGN_ADMIN_USERNAME, email],
  );
  if (existing.length) {
    log("[seed] admin user stevenmarr already exists");
    return { status: "exists" };
  }
  const hash = await (options.hash ?? hashPassword)(password);
  const id = options.id ?? randomBytes(16).toString("hex");
  const now = options.now ?? new Date();
  await db.query(
    `insert into "user"
       (id, name, email, "emailVerified", "createdAt", "updatedAt", username, role, disabled, must_change_password)
     values ($1, $2, $3, true, $4, $4, $5, 'admin', false, true)`,
    [id, "Steven Marr", email, now, DESIGN_ADMIN_USERNAME],
  );
  await db.query(
    `insert into "account"
       (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
     values ($1, $2, 'credential', $3, $4, $5, $5)`,
    [randomBytes(16).toString("hex"), id, id, hash, now],
  );
  await db.query(
    `insert into admins (user_id, email, name) values ($1, $2, $3)
     on conflict (user_id) do nothing`,
    [id, email, "Steven Marr"],
  );
  log("[seed] created admin user stevenmarr; password change is required on first login");
  return { status: "created" };
}
