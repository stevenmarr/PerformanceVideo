/**
 * Read-only view of every account. The signed-in user is an admin when their
 * email is listed in ADMIN_EMAILS, or when the account name is Steven Marr and
 * nobody has been granted yet. Later Steven Marr signups do not get in.
 */
import { createServerFn } from "@tanstack/react-start";
import { getSql, type Sql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { asDrawingFile, type DrawingTitle } from "@/lib/drawing";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  drawings: number;
  models: number;
  systems: number;
  lastDrawing: string;
};

export type AdminHome = {
  admin: boolean;
  you: { name: string; email: string } | null;
  users: AdminUserRow[];
};

export type AdminLibraryRow = {
  id: number;
  deviceType: string;
  manufacturer: string;
  model: string;
  kind: string;
  notes: string;
};

export type AdminDrawingRow = {
  id: number;
  name: string;
  templateKey: string;
  updatedAt: string;
  nodes: number;
  edges: number;
};

export type AdminUserDetail = {
  user: { id: string; name: string; email: string; createdAt: string };
  studio: { companyName: string; email: string; phone: string; website: string; drawnBy: string } | null;
  drawings: AdminDrawingRow[];
  models: AdminLibraryRow[];
};

export type AdminDrawingView = {
  id: number;
  name: string;
  updatedAt: string;
  title: DrawingTitle;
  nodes: { unitId: string; deviceType: string; manufacturer: string; model: string; ip: string; notes: string }[];
  cables: { fromUnit: string; fromJack: string; signal: string; toUnit: string; toJack: string; cable: string }[];
};

type Person = { id: string; name: string; email: string };

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

async function openAdmin(userId: string): Promise<{ sql: Sql; person: Person } | null> {
  const sql = await getSql();
  const people = await sql<Person>`select id, name, email from "user" where id = ${userId}`;
  const person = people[0];
  if (!person) return null;
  const email = person.email.trim().toLowerCase();
  const listed = adminEmails().includes(email);
  const held = await sql<{ user_id: string }>`select user_id from admins where user_id = ${userId}`;
  if (!held.length && listed) {
    await sql`
      insert into admins (user_id, email, name)
      values (${person.id}, ${person.email}, ${person.name})
      on conflict (user_id) do nothing
    `;
  } else if (!held.length && isSteven(person.name)) {
    await sql`
      insert into admins (user_id, email, name)
      select ${person.id}, ${person.email}, ${person.name}
      where not exists (select 1 from admins)
    `;
  }
  const allowed = await sql<{ user_id: string }>`select user_id from admins where user_id = ${userId}`;
  return allowed.length ? { sql, person } : null;
}

export const adminProbe = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ admin: boolean }> => {
    const opened = await openAdmin(context.userId);
    return { admin: Boolean(opened) };
  });

export const adminHome = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AdminHome> => {
    const opened = await openAdmin(context.userId);
    if (!opened) return { admin: false, you: null, users: [] };
    const users = await opened.sql<AdminUserRow & { created_at: string; last_drawing: string }>`
      select u.id,
             u.name,
             u.email,
             u."createdAt"::text as created_at,
             (select count(*) from drawings d where d.user_id = u.id) as drawings,
             (select count(*) from equipment e where e.user_id = u.id) as models,
             (select count(*) from equipment e where e.user_id = u.id and e.kind = 'system') as systems,
             coalesce((select max(updated_at)::text from drawings d where d.user_id = u.id), '') as last_drawing
      from "user" u
      order by u."createdAt"
    `;
    return {
      admin: true,
      you: { name: opened.person.name, email: opened.person.email },
      users: users.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        createdAt: row.created_at,
        drawings: Number(row.drawings),
        models: Number(row.models),
        systems: Number(row.systems),
        lastDrawing: row.last_drawing,
      })),
    };
  });

export const adminUser = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((userId: string) => String(userId ?? ""))
  .handler(async ({ context, data: userId }): Promise<AdminUserDetail | null> => {
    const opened = await openAdmin(context.userId);
    if (!opened || !userId) return null;
    const people = await opened.sql<{ id: string; name: string; email: string; created_at: string }>`
      select id, name, email, "createdAt"::text as created_at from "user" where id = ${userId}
    `;
    const person = people[0];
    if (!person) return null;
    const studios = await opened.sql<{
      company_name: string;
      email: string;
      phone: string;
      website: string;
      drawn_by: string;
    }>`
      select company_name, email, phone, website, drawn_by from studios where user_id = ${userId}
    `;
    const drawings = await opened.sql<{
      id: number;
      name: string;
      template_key: string;
      updated_at: string;
      graph_json: string;
    }>`
      select id, name, template_key, updated_at::text, graph_json
      from drawings
      where user_id = ${userId}
      order by updated_at desc
    `;
    const models = await opened.sql<{
      id: number;
      model: string;
      kind: string;
      notes: string;
      device_type: string;
      manufacturer: string;
    }>`
      select e.id, e.model, e.kind, e.notes, d.name as device_type, m.name as manufacturer
      from equipment e
      join device_types d on d.id = e.device_type_id and d.user_id = e.user_id
      join manufacturers m on m.id = e.manufacturer_id and m.user_id = e.user_id
      where e.user_id = ${userId}
      order by d.name, m.name, e.model
    `;
    const studio = studios[0];
    return {
      user: { id: person.id, name: person.name, email: person.email, createdAt: person.created_at },
      studio: studio
        ? {
            companyName: studio.company_name,
            email: studio.email,
            phone: studio.phone,
            website: studio.website,
            drawnBy: studio.drawn_by,
          }
        : null,
      drawings: drawings.map((row) => {
        const graph = asDrawingFile(safeJson(row.graph_json));
        return {
          id: row.id,
          name: row.name,
          templateKey: row.template_key,
          updatedAt: row.updated_at,
          nodes: graph.nodes.length,
          edges: graph.edges.length,
        };
      }),
      models: models.map((row) => ({
        id: row.id,
        deviceType: row.device_type,
        manufacturer: row.manufacturer === "Unbranded" ? "Generic" : row.manufacturer,
        model: row.model,
        kind: row.kind,
        notes: row.notes,
      })),
    };
  });

export const adminDrawing = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; drawingId: number }) => ({
    userId: String(input?.userId ?? ""),
    drawingId: Number(input?.drawingId),
  }))
  .handler(async ({ context, data }): Promise<AdminDrawingView | null> => {
    const opened = await openAdmin(context.userId);
    if (!opened || !data.userId || !data.drawingId) return null;
    const rows = await opened.sql<{ id: number; name: string; updated_at: string; graph_json: string }>`
      select id, name, updated_at::text, graph_json
      from drawings
      where id = ${data.drawingId} and user_id = ${data.userId}
    `;
    const row = rows[0];
    if (!row) return null;
    const gear = await opened.sql<{
      id: number;
      model: string;
      device_type: string;
      manufacturer: string;
      pins_json: string;
    }>`
      select e.id, e.model, d.name as device_type, m.name as manufacturer, e.pins_json
      from equipment e
      join device_types d on d.id = e.device_type_id and d.user_id = e.user_id
      join manufacturers m on m.id = e.manufacturer_id and m.user_id = e.user_id
      where e.user_id = ${data.userId}
    `;
    const byId = new Map(gear.map((item) => [item.id, item]));
    const graph = asDrawingFile(safeJson(row.graph_json));
    const units = new Map(graph.nodes.map((node) => [node.id, node.unitId || ""]));
    return {
      id: row.id,
      name: row.name,
      updatedAt: row.updated_at,
      title: graph.title,
      nodes: graph.nodes.map((node) => {
        const item = byId.get(node.equipmentId);
        return {
          unitId: node.unitId,
          deviceType: item?.device_type ?? "",
          manufacturer: item ? (item.manufacturer === "Unbranded" ? "Generic" : item.manufacturer) : "",
          model: item?.model ?? `Missing model ${node.equipmentId}`,
          ip: node.ip,
          notes: node.specialNotes,
        };
      }),
      cables: graph.edges.map((edge) => {
        const source = byId.get(graph.nodes.find((node) => node.id === edge.source)?.equipmentId ?? -1);
        const target = byId.get(graph.nodes.find((node) => node.id === edge.target)?.equipmentId ?? -1);
        const fromPin = pinLabel(source?.pins_json, edge.sourceHandle);
        const toPin = pinLabel(target?.pins_json, edge.targetHandle);
        return {
          fromUnit: units.get(edge.source) || "",
          fromJack: fromPin.label,
          signal: fromPin.signal || toPin.signal,
          toUnit: units.get(edge.target) || "",
          toJack: toPin.label,
          cable: [edge.cableType, edge.length, edge.throwdown].filter(Boolean).join(" · "),
        };
      }),
    };
  });

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function pinLabel(raw: string | undefined, pinId: string): { label: string; signal: string } {
  if (!raw) return { label: pinId, signal: "" };
  try {
    const pins = JSON.parse(raw) as { id?: string; label?: string; signal?: string }[];
    const pin = Array.isArray(pins) ? pins.find((item) => item.id === pinId) : undefined;
    return { label: pin?.label || pinId, signal: pin?.signal || "" };
  } catch {
    return { label: pinId, signal: "" };
  }
}
