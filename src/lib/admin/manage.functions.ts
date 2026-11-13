import { randomBytes } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { requireAdmin, writeAudit } from "@/lib/admin/access";
import { normalizePorts } from "@/lib/admin/ports";
import { issuePasswordReset } from "@/lib/auth/account-store";
import { fromSql } from "@/lib/queryable";
import { readCatalog, type Catalog } from "@/lib/catalog.functions";
import { asDrawingFile, type DrawingFile } from "@/lib/drawing";

export type DeviceDefinitionRow = {
  id: string;
  ownerUserId: string;
  manufacturer: string;
  model: string;
  family: string;
  category: string;
  notes: string;
  portsJson: string;
  portDataConfidence: string;
  portsUnverified: boolean;
};

function clean(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

export const adminDevices = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { search: string; owner: string }) => ({
    search: clean(input?.search, 80),
    owner: clean(input?.owner, 80),
  }))
  .handler(async ({ context, data }): Promise<{ admin: boolean; devices: DeviceDefinitionRow[] }> => {
    const opened = await requireAdmin(context.userId);
    if (!opened) return { admin: false, devices: [] };
    const pattern = `%${data.search.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
    const rows = await opened.sql<{
      id: string;
      owner_user_id: string | null;
      manufacturer: string;
      model: string;
      family: string;
      category: string;
      notes: string;
      ports_json: string;
      port_data_confidence: string;
      ports_unverified: boolean;
    }>`
      select id, owner_user_id, manufacturer, model, family, category, notes, ports_json,
             port_data_confidence, ports_unverified
      from device_definitions
      where (
          ${data.owner} = ''
          or (${data.owner} = 'global' and owner_user_id is null)
          or owner_user_id = ${data.owner}
        )
        and (${data.search} = '' or manufacturer ilike ${pattern} escape '\\'
             or model ilike ${pattern} escape '\\'
             or family ilike ${pattern} escape '\\'
             or category ilike ${pattern} escape '\\')
      order by manufacturer, model
      limit 300
    `;
    return {
      admin: true,
      devices: rows.map((row) => ({
        id: row.id,
        ownerUserId: row.owner_user_id ?? "",
        manufacturer: row.manufacturer,
        model: row.model,
        family: row.family,
        category: row.category,
        notes: row.notes,
        portsJson: row.ports_json,
        portDataConfidence: row.port_data_confidence,
        portsUnverified: row.ports_unverified,
      })),
    };
  });

export const adminSaveDevice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      id: string;
      ownerUserId: string;
      manufacturer: string;
      model: string;
      family: string;
      category: string;
      notes: string;
      portsJson: string;
      unverified: boolean;
    }) => ({
      id: clean(input?.id, 120),
      ownerUserId: clean(input?.ownerUserId, 80),
      manufacturer: clean(input?.manufacturer, 80),
      model: clean(input?.model, 120),
      family: clean(input?.family, 80),
      category: clean(input?.category, 80),
      notes: clean(input?.notes, 500),
      portsJson: String(input?.portsJson ?? ""),
      unverified: Boolean(input?.unverified),
    }),
  )
  .handler(async ({ context, data }) => {
    const opened = await requireAdmin(context.userId);
    if (!opened) return { error: "Not an admin.", id: "" };
    if (!data.manufacturer || !data.model) return { error: "Manufacturer and model are required.", id: "" };
    const ports = normalizePorts(data.portsJson, data.unverified);
    if (ports.error) return { error: ports.error, id: "" };
    const id = data.id || `custom.${randomBytes(8).toString("hex")}`;
    const owner = data.ownerUserId || null;
    const confidence = data.unverified || ports.ports.some((port) => port.unverified) ? "none" : "high";
    await opened.sql`
      insert into device_definitions (
        id, owner_user_id, manufacturer, model, family, category, notes, ports_json,
        port_data_confidence, ports_unverified, updated_at
      ) values (
        ${id}, ${owner}, ${data.manufacturer}, ${data.model}, ${data.family}, ${data.category},
        ${data.notes}, ${JSON.stringify(ports.ports)}, ${confidence}, ${confidence === "none"}, now()
      )
      on conflict (id) do update set
        owner_user_id = excluded.owner_user_id,
        manufacturer = excluded.manufacturer,
        model = excluded.model,
        family = excluded.family,
        category = excluded.category,
        notes = excluded.notes,
        ports_json = excluded.ports_json,
        port_data_confidence = excluded.port_data_confidence,
        ports_unverified = excluded.ports_unverified,
        updated_at = now()
    `;
    await writeAudit(opened.sql, opened.actor.id, "device.save", "device", id, `${data.manufacturer} ${data.model}`);
    return { error: null, id };
  });

export const adminDeleteDevice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; confirm: string }) => ({
    id: clean(input?.id, 120),
    confirm: String(input?.confirm ?? ""),
  }))
  .handler(async ({ context, data }) => {
    const opened = await requireAdmin(context.userId);
    if (!opened) return { error: "Not an admin." };
    if (data.confirm !== "DELETE DEVICE") return { error: "Type DELETE DEVICE to confirm." };
    await opened.sql`delete from device_definitions where id = ${data.id}`;
    await writeAudit(opened.sql, opened.actor.id, "device.delete", "device", data.id, "");
    return { error: null };
  });

export const adminSaveEquipment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: { userId: string; id: number; deviceType: string; manufacturer: string; model: string; notes: string; pinsJson: string }) => ({
      userId: clean(input?.userId, 80),
      id: Number(input?.id) || 0,
      deviceType: clean(input?.deviceType, 64),
      manufacturer: clean(input?.manufacturer, 80),
      model: clean(input?.model, 80),
      notes: clean(input?.notes, 500),
      pinsJson: String(input?.pinsJson ?? "[]"),
    }),
  )
  .handler(async ({ context, data }) => {
    const opened = await requireAdmin(context.userId);
    if (!opened) return { error: "Not an admin." };
    if (!data.userId || !data.deviceType || !data.manufacturer || !data.model) return { error: "Type, manufacturer, and model are required." };
    let pins: unknown;
    try {
      pins = JSON.parse(data.pinsJson || "[]");
    } catch {
      return { error: "Pins must be JSON." };
    }
    if (!Array.isArray(pins)) return { error: "Pins must be a list." };
    const sql = opened.sql;
    const types = await sql<{ id: number }>`select id from device_types where user_id = ${data.userId} and name = ${data.deviceType}`;
    let typeId = types[0]?.id;
    if (!typeId) {
      const inserted = await sql<{ id: number }>`
        insert into device_types (user_id, name, color) values (${data.userId}, ${data.deviceType}, ${"#111111"}) returning id
      `;
      typeId = inserted[0]?.id;
    }
    const makers = await sql<{ id: number }>`select id from manufacturers where user_id = ${data.userId} and name = ${data.manufacturer}`;
    let makerId = makers[0]?.id;
    if (!makerId) {
      const inserted = await sql<{ id: number }>`
        insert into manufacturers (user_id, name) values (${data.userId}, ${data.manufacturer}) returning id
      `;
      makerId = inserted[0]?.id;
    }
    if (!typeId || !makerId) return { error: "The library row could not be saved." };
    const pinText = JSON.stringify(pins);
    if (data.id) {
      const updated = await sql<{ id: number }>`
        update equipment
        set device_type_id = ${typeId}, manufacturer_id = ${makerId}, model = ${data.model}, notes = ${data.notes}, pins_json = ${pinText}
        where id = ${data.id} and user_id = ${data.userId}
        returning id
      `;
      if (!updated.length) return { error: "That model was not found." };
    } else {
      await sql`
        insert into equipment (user_id, device_type_id, manufacturer_id, model, kind, notes, pins_json)
        values (${data.userId}, ${typeId}, ${makerId}, ${data.model}, ${"device"}, ${data.notes}, ${pinText})
      `;
    }
    await writeAudit(sql, opened.actor.id, "equipment.save", "user", data.userId, data.model);
    return { error: null };
  });

export const adminDeleteEquipment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; id: number; confirm: string }) => ({
    userId: clean(input?.userId, 80),
    id: Number(input?.id) || 0,
    confirm: String(input?.confirm ?? ""),
  }))
  .handler(async ({ context, data }) => {
    const opened = await requireAdmin(context.userId);
    if (!opened) return { error: "Not an admin." };
    if (data.confirm !== "DELETE MODEL") return { error: "Type DELETE MODEL to confirm." };
    await opened.sql`delete from equipment where id = ${data.id} and user_id = ${data.userId}`;
    await writeAudit(opened.sql, opened.actor.id, "equipment.delete", "user", data.userId, String(data.id));
    return { error: null };
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; role: string }) => ({
    userId: clean(input?.userId, 80),
    role: input?.role === "admin" ? "admin" : "user",
  }))
  .handler(async ({ context, data }) => {
    const opened = await requireAdmin(context.userId);
    if (!opened) return { error: "Not an admin." };
    if (data.role !== "admin") {
      const others = await opened.sql<{ count: number }>`
        select count(*)::int as count from "user" where role = 'admin' and disabled = false and id <> ${data.userId}
      `;
      if (Number(others[0]?.count ?? 0) < 1) return { error: "Keep at least one active admin." };
    }
    await opened.sql`update "user" set role = ${data.role}, "updatedAt" = now() where id = ${data.userId}`;
    if (data.role === "admin") {
      await opened.sql`
        insert into admins (user_id, email, name)
        select id, email, name from "user" where id = ${data.userId}
        on conflict (user_id) do nothing
      `;
    } else {
      await opened.sql`delete from admins where user_id = ${data.userId}`;
    }
    await writeAudit(opened.sql, opened.actor.id, "user.role", "user", data.userId, data.role);
    return { error: null };
  });

export const adminSetDisabled = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; disabled: boolean }) => ({
    userId: clean(input?.userId, 80),
    disabled: Boolean(input?.disabled),
  }))
  .handler(async ({ context, data }) => {
    const opened = await requireAdmin(context.userId);
    if (!opened) return { error: "Not an admin." };
    if (data.userId === opened.actor.id && data.disabled) return { error: "You cannot disable your own account." };
    if (data.disabled) {
      const others = await opened.sql<{ count: number }>`
        select count(*)::int as count from "user"
        where role = 'admin' and disabled = false and id <> ${data.userId}
      `;
      const target = await opened.sql<{ role: string }>`select role from "user" where id = ${data.userId}`;
      if (target[0]?.role === "admin" && Number(others[0]?.count ?? 0) < 1) return { error: "Keep at least one active admin." };
      await opened.sql`delete from "session" where "userId" = ${data.userId}`;
    }
    await opened.sql`update "user" set disabled = ${data.disabled}, "updatedAt" = now() where id = ${data.userId}`;
    await writeAudit(opened.sql, opened.actor.id, data.disabled ? "user.disable" : "user.enable", "user", data.userId, "");
    return { error: null };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; confirm: string }) => ({
    userId: clean(input?.userId, 80),
    confirm: clean(input?.confirm, 200),
  }))
  .handler(async ({ context, data }) => {
    const opened = await requireAdmin(context.userId);
    if (!opened) return { error: "Not an admin." };
    if (data.userId === opened.actor.id) return { error: "You cannot delete your own account." };
    const people = await opened.sql<{ email: string; role: string }>`select email, role from "user" where id = ${data.userId}`;
    const person = people[0];
    if (!person) return { error: "That account was not found." };
    if (data.confirm !== person.email) return { error: "Type the account email to confirm." };
    if (person.role === "admin") {
      const others = await opened.sql<{ count: number }>`
        select count(*)::int as count from "user" where role = 'admin' and id <> ${data.userId}
      `;
      if (Number(others[0]?.count ?? 0) < 1) return { error: "Keep at least one admin." };
    }
    const sql = opened.sql;
    await sql`delete from drawings where user_id = ${data.userId}`;
    await sql`delete from equipment where user_id = ${data.userId}`;
    await sql`delete from device_types where user_id = ${data.userId}`;
    await sql`delete from manufacturers where user_id = ${data.userId}`;
    await sql`delete from connection_types where user_id = ${data.userId}`;
    await sql`delete from cable_lengths where user_id = ${data.userId}`;
    await sql`delete from studios where user_id = ${data.userId}`;
    await sql`delete from library_flags where user_id = ${data.userId}`;
    await sql`delete from admins where user_id = ${data.userId}`;
    await sql`delete from device_definitions where owner_user_id = ${data.userId}`;
    await sql`delete from "session" where "userId" = ${data.userId}`;
    await sql`delete from "account" where "userId" = ${data.userId}`;
    await sql`delete from "user" where id = ${data.userId}`;
    await writeAudit(sql, opened.actor.id, "user.delete", "user", data.userId, person.email);
    return { error: null };
  });

export const adminSendReset = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((userId: string) => clean(userId, 80))
  .handler(async ({ context, data: userId }) => {
    const opened = await requireAdmin(context.userId);
    if (!opened) return { error: "Not an admin." };
    const people = await opened.sql<{ email: string }>`select email from "user" where id = ${userId}`;
    const person = people[0];
    if (!person) return { error: "That account was not found." };
    const delivery = await issuePasswordReset(fromSql(opened.sql), { email: person.email, ip: "admin" });
    if (!delivery) return { error: "A reset was not sent. The address may be rate limited." };
    const { createMailer } = await import("@/lib/mail/mailer");
    const { publicHref } = await import("@/lib/preview-path-prefix");
    const mailer = createMailer();
    const link = `${publicHref("/reset-password")}?token=${encodeURIComponent(delivery.token)}`;
    await mailer.send({
      to: delivery.email,
      subject: "Reset your Performance Video password",
      text: `An administrator started a password reset. Open ${link} within one hour.`,
    });
    await writeAudit(opened.sql, opened.actor.id, "user.reset", "user", userId, "reset email queued");
    return { error: null };
  });

export const adminAudit = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const opened = await requireAdmin(context.userId);
    if (!opened) return { admin: false as const, rows: [] };
    const rows = await opened.sql<{
      id: number;
      actor_id: string;
      action: string;
      target_type: string;
      target_id: string;
      detail: string;
      created_at: string;
      actor_email: string;
    }>`
      select a.id, a.actor_id, a.action, a.target_type, a.target_id, a.detail, a.created_at::text,
             coalesce(u.email, '') as actor_email
      from admin_audit a
      left join "user" u on u.id = a.actor_id
      order by a.id desc
      limit 200
    `;
    return {
      admin: true as const,
      rows: rows.map((row) => ({
        id: row.id,
        actorId: row.actor_id,
        actorEmail: row.actor_email,
        action: row.action,
        targetType: row.target_type,
        targetId: row.target_id,
        detail: row.detail,
        createdAt: row.created_at,
      })),
    };
  });

export const adminOpenCanvas = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; drawingId: number }) => ({
    userId: clean(input?.userId, 80),
    drawingId: Number(input?.drawingId) || 0,
  }))
  .handler(async ({ context, data }): Promise<{ catalog: Catalog; drawing: { id: number; name: string; graph: DrawingFile }; drawings: { id: number; name: string; templateKey: string }[] } | null> => {
    const opened = await requireAdmin(context.userId);
    if (!opened || !data.userId || !data.drawingId) return null;
    const rows = await opened.sql<{ id: number; name: string; graph_json: string }>`
      select id, name, graph_json from drawings where id = ${data.drawingId} and user_id = ${data.userId}
    `;
    const row = rows[0];
    if (!row) return null;
    const list = await opened.sql<{ id: number; name: string; template_key: string }>`
      select id, name, template_key from drawings where user_id = ${data.userId} order by updated_at desc
    `;
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(row.graph_json);
    } catch {
      parsed = {};
    }
    await writeAudit(opened.sql, opened.actor.id, "drawing.open", "drawing", String(row.id), data.userId);
    return {
      catalog: await readCatalog(data.userId),
      drawing: { id: row.id, name: row.name, graph: asDrawingFile(parsed) },
      drawings: list.map((item) => ({ id: item.id, name: item.name, templateKey: item.template_key })),
    };
  });

export const adminSaveCanvas = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; id: number; name: string; graph: DrawingFile }) => input)
  .handler(async ({ context, data }) => {
    const opened = await requireAdmin(context.userId);
    if (!opened) return { id: null, error: "Not an admin." };
    const name = clean(data.name, 120) || "Untitled show";
    const graph = asDrawingFile(data.graph);
    const updated = await opened.sql<{ id: number }>`
      update drawings
      set name = ${name}, graph_json = ${JSON.stringify(graph)}, updated_at = now()
      where id = ${Number(data.id)} and user_id = ${clean(data.userId, 80)}
      returning id
    `;
    if (!updated.length) return { id: null, error: "That drawing was not found." };
    await writeAudit(opened.sql, opened.actor.id, "drawing.edit", "drawing", String(updated[0].id), clean(data.userId, 80));
    return { id: updated[0].id, error: null };
  });
