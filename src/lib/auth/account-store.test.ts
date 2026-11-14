import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { pendingMigrations } from "../../../scripts/migration-plan.mjs";
import {
  changeOwnPassword,
  completePasswordReset,
  issuePasswordReset,
  resolveLoginEmail,
} from "./account-store.ts";
import { ensureDesignAdmin } from "./ensure-admin.ts";
import { hashPassword, verifyStoredPassword } from "./password-crypto.ts";
import type { Queryable } from "../queryable.ts";

async function database(): Promise<Queryable> {
  const pg = new PGlite();
  await pg.waitReady;
  const dir = join(process.cwd(), "migrations");
  const entries = await readdir(dir);
  for (const { name } of pendingMigrations(entries, [])) {
    if (!name.endsWith(".sql")) continue;
    await pg.exec(await readFile(join(dir, name), "utf8"));
  }
  return {
    query: async <T = Record<string, unknown>>(text: string, params?: unknown[]) => {
      const result = await pg.query(text, params);
      return result.rows as T[];
    },
  };
}

describe("admin seed and password reset", () => {
  it("skips without the env var, creates once, and does not rotate the password", async () => {
    const db = await database();
    const lines: string[] = [];
    const log = (line: string) => lines.push(line);
    const skipped = await ensureDesignAdmin(db, {}, { log });
    assert.equal(skipped.status, "skipped");
    assert.match(lines.join("\n"), /DESIGN_ADMIN_PASSWORD is not set/);

    const secret = "throwaway-admin-password";
    const created = await ensureDesignAdmin(db, { DESIGN_ADMIN_PASSWORD: secret }, {
      log,
      hash: (password) => hashPassword(password, 4),
    });
    assert.equal(created.status, "created");
    assert.equal(lines.some((line) => line.includes(secret)), false);
    const rows = await db.query<{ password: string; must_change_password: boolean; role: string; username: string }>(
      `select a.password, u.must_change_password, u.role, u.username
       from "user" u join "account" a on a."userId" = u.id
       where u.username = 'stevenmarr'`,
    );
    assert.equal(rows[0]?.role, "admin");
    assert.equal(rows[0]?.must_change_password, true);
    assert.equal(await verifyStoredPassword(rows[0]?.password ?? "", secret), true);
    const again = await ensureDesignAdmin(db, { DESIGN_ADMIN_PASSWORD: "different-password" }, {
      log,
      hash: (password) => hashPassword(password, 4),
    });
    assert.equal(again.status, "exists");
    const after = await db.query<{ password: string }>(
      `select a.password from "user" u join "account" a on a."userId" = u.id where u.username = 'stevenmarr'`,
    );
    assert.equal(after[0]?.password, rows[0]?.password);
  });

  it("issues a hashed single-use token, rate-limits, and accepts a password change", async () => {
    const db = await database();
    const hash = (password: string) => hashPassword(password, 4);
    await db.query(
      `insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt", username, role)
       values ('user-1', 'Ada', 'ada@example.com', true, now(), now(), 'ada', 'user')`,
    );
    await db.query(
      `insert into "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
       values ('acct-1', 'user-1', 'credential', 'user-1', $1, now(), now())`,
      [await hash("old-password")],
    );
    assert.equal(await resolveLoginEmail(db, "ada"), "ada@example.com");
    assert.equal(await issuePasswordReset(db, { email: "missing@example.com", ip: "10.0.0.1" }), null);

    const issued = await issuePasswordReset(db, { email: "ada@example.com", ip: "10.0.0.1", token: "plain-token" });
    assert.equal(issued?.token, "plain-token");
    const stored = await db.query<{ token_hash: string }>(`select token_hash from password_reset_tokens`);
    assert.equal(stored.some((row) => row.token_hash === "plain-token"), false);

    assert.equal((await completePasswordReset(db, { token: "nope", password: "new-password-1", hash })).ok, false);
    assert.equal((await completePasswordReset(db, { token: "plain-token", password: "new-password-1", hash })).ok, true);
    assert.equal((await completePasswordReset(db, { token: "plain-token", password: "new-password-2", hash })).ok, false);
    const updated = await db.query<{ password: string; must_change_password: boolean }>(
      `select a.password, u.must_change_password from "user" u join "account" a on a."userId" = u.id where u.id = 'user-1'`,
    );
    assert.equal(await verifyStoredPassword(updated[0]?.password ?? "", "old-password"), false);
    assert.equal(await verifyStoredPassword(updated[0]?.password ?? "", "new-password-1"), true);
    assert.equal(updated[0]?.must_change_password, false);

    const expired = await issuePasswordReset(db, { email: "ada@example.com", ip: "10.0.0.2", token: "old-token" });
    assert.ok(expired);
    const later = new Date(Date.now() + 2 * 60 * 60 * 1000);
    assert.equal((await completePasswordReset(db, { token: "old-token", password: "new-password-3", hash, now: later })).ok, false);

    await db.query(
      `insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
       values ('user-2', 'Rate', 'rate@example.com', true, now(), now())`,
    );
    let sent = 0;
    for (let i = 0; i < 6; i += 1) {
      const delivery = await issuePasswordReset(db, { email: "rate@example.com", ip: "10.9.9.9" });
      if (delivery) sent += 1;
    }
    assert.equal(sent, 5);

    const changed = await changeOwnPassword(db, {
      userId: "user-1",
      currentPassword: "new-password-1",
      newPassword: "brand-new-password",
      hash,
    });
    assert.equal(changed.ok, true);
    const wrong = await changeOwnPassword(db, {
      userId: "user-1",
      currentPassword: "nope",
      newPassword: "brand-new-password-2",
      hash,
    });
    assert.equal(wrong.ok, false);
  });
});
