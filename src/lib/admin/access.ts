import { getSql, type Sql } from "@/lib/db";
export { STUDIO_OWNER_USERNAME, studioOwnerLocked } from "@/lib/admin/studio-owner";

export type AdminActor = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: "admin";
};

type PersonRow = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  disabled: boolean;
};

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(/[,;\s]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function isSteven(name: string): boolean {
  const words = name.trim().toLowerCase().split(/\s+/);
  return words.includes("steven") && words.includes("marr");
}

export async function writeAudit(
  sql: Sql,
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  detail: string,
): Promise<void> {
  await sql`
    insert into admin_audit (actor_id, action, target_type, target_id, detail)
    values (${actorId}, ${action}, ${targetType}, ${targetId}, ${detail.slice(0, 500)})
  `;
}

/**
 * Server-side admin check. Role `admin` is required. ADMIN_EMAILS and the
 * one-time Steven Marr bootstrap still promote an account by setting that role.
 */
export async function requireAdmin(userId: string): Promise<{ sql: Sql; actor: AdminActor } | null> {
  const sql = await getSql();
  const people = await sql<PersonRow>`
    select id, name, email,
           coalesce(username, '') as username,
           coalesce(role, 'user') as role,
           coalesce(disabled, false) as disabled
    from "user"
    where id = ${userId}
  `;
  const person = people[0];
  if (!person || person.disabled) return null;
  const email = person.email.trim().toLowerCase();
  if (person.role !== "admin" && adminEmails().includes(email)) {
    await sql`update "user" set role = 'admin', "updatedAt" = now() where id = ${person.id}`;
    person.role = "admin";
    await writeAudit(sql, person.id, "role.bootstrap", "user", person.id, "ADMIN_EMAILS");
  } else if (person.role !== "admin" && isSteven(person.name)) {
    const held = await sql<{ user_id: string }>`select user_id from admins limit 1`;
    if (!held.length) {
      await sql`update "user" set role = 'admin', "updatedAt" = now() where id = ${person.id}`;
      person.role = "admin";
      await writeAudit(sql, person.id, "role.bootstrap", "user", person.id, "legacy name bootstrap");
    }
  }
  if (person.role !== "admin") return null;
  await sql`
    insert into admins (user_id, email, name)
    values (${person.id}, ${person.email}, ${person.name})
    on conflict (user_id) do update set email = excluded.email, name = excluded.name
  `;
  return {
    sql,
    actor: {
      id: person.id,
      name: person.name,
      email: person.email,
      username: person.username,
      role: "admin",
    },
  };
}
