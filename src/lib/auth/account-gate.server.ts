import { getSql } from "@/lib/db";
import { DEV_USER_ID, UnauthorizedError } from "./verify.server";

export class PasswordChangeRequiredError extends Error {
  readonly status = 403;
  constructor() {
    super("Password change required");
    this.name = "PasswordChangeRequiredError";
  }
}

/** Block disabled accounts and accounts that still owe a first password change. */
export async function assertPasswordChangeAllowed(userId: string): Promise<void> {
  if (userId === DEV_USER_ID) return;
  const sql = await getSql();
  const rows = await sql<{ disabled: boolean; must_change_password: boolean }>`
    select coalesce(disabled, false) as disabled,
           coalesce(must_change_password, false) as must_change_password
    from "user"
    where id = ${userId}
  `;
  const row = rows[0];
  if (!row) return;
  if (row.disabled) throw new UnauthorizedError();
  if (row.must_change_password) throw new PasswordChangeRequiredError();
}
