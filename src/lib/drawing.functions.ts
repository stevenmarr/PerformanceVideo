/**
 * Saved drawings and systems built from a group on the canvas.
 * Every query is scoped to the signed-in user.
 */
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { asDrawingFile, type DrawingFile } from "@/lib/drawing";

export type DrawingSummary = {
  id: number;
  name: string;
  templateKey: string;
  updatedAt: string;
};

export type DrawingRecord = DrawingSummary & { graph: DrawingFile };

function clean(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

export const listDrawings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<DrawingSummary[]> => {
    const sql = await getSql();
    const rows = await sql<{ id: number; name: string; template_key: string; updated_at: string }>`
      select id, name, template_key, updated_at
      from drawings
      where user_id = ${context.userId}
      order by template_key = 'solventum' desc, updated_at desc
    `;
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      templateKey: row.template_key,
      updatedAt: row.updated_at,
    }));
  });

export const getDrawing = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: number) => Number(id))
  .handler(async ({ context, data: id }): Promise<DrawingRecord | null> => {
    const sql = await getSql();
    const rows = await sql<{ id: number; name: string; template_key: string; updated_at: string; graph_json: string }>`
      select id, name, template_key, updated_at, graph_json
      from drawings
      where id = ${id} and user_id = ${context.userId}
    `;
    const row = rows[0];
    if (!row) return null;
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(row.graph_json);
    } catch {
      parsed = {};
    }
    return {
      id: row.id,
      name: row.name,
      templateKey: row.template_key,
      updatedAt: row.updated_at,
      graph: asDrawingFile(parsed),
    };
  });

export const saveDrawing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number | null; name: string; graph: DrawingFile }) => input)
  .handler(async ({ context, data }) => {
    const name = clean(data.name, 120) || "Untitled show";
    const graph = asDrawingFile(data.graph);
    const json = JSON.stringify(graph);
    const sql = await getSql();
    const id = Number(data.id);
    if (id) {
      const updated = await sql<{ id: number }>`
        update drawings
        set name = ${name}, graph_json = ${json}, updated_at = now()
        where id = ${id} and user_id = ${context.userId}
        returning id
      `;
      if (!updated.length) return { id: null, error: "That drawing was not found." };
      return { id: updated[0].id, error: null };
    }
    const inserted = await sql<{ id: number }>`
      insert into drawings (user_id, name, template_key, graph_json)
      values (${context.userId}, ${name}, ${""}, ${json})
      returning id
    `;
    return { id: inserted[0]?.id ?? null, error: inserted[0] ? null : "The drawing could not be saved." };
  });

export const deleteDrawing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => Number(id))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from drawings where id = ${id} and user_id = ${context.userId}`;
    return { error: null };
  });

type SystemPort = {
  nodeId: string;
  pinId: string;
  label: string;
  direction: string;
  signal: string;
};

type SystemGraph = {
  nodes: { id: string; equipmentId: number; unitId: string; ip: string; specialNotes: string; x: number; y: number }[];
  edges: {
    id: string;
    source: string;
    target: string;
    sourceHandle: string;
    targetHandle: string;
    length: string;
    notes: string;
    cableType?: string;
    throwdown?: string;
  }[];
  ports: { id: string; nodeId: string; pinId: string }[];
};

export const saveSystem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: { name: string; notes: string; ports: SystemPort[]; graph: SystemGraph }) => input,
  )
  .handler(async ({ context, data }) => {
    const name = clean(data.name, 80);
    const notes = clean(data.notes, 500) || "Saved from a drawing group. The pull list counts this as one unit.";
    if (!name) return { error: "Name the system." };
    const ports = (data.ports ?? []).filter((port) => port && port.label && port.signal && port.pinId);
    if (!ports.length) return { error: "Expose at least one connection." };
    if (!data.graph?.nodes || data.graph.nodes.length < 2) return { error: "A system needs at least two boxes." };

    const pins = ports.map((port, index) => ({
      id: `port-${index + 1}`,
      label: clean(`${port.label}`, 48),
      direction: port.direction === "output" ? "output" : "input",
      signal: clean(port.signal, 64),
    }));
    const graph: SystemGraph = {
      nodes: data.graph.nodes.map((node) => ({
        id: clean(node.id, 64),
        equipmentId: Number(node.equipmentId),
        unitId: clean(node.unitId, 64),
        ip: clean(node.ip, 64),
        specialNotes: clean(node.specialNotes, 240),
        x: Number(node.x) || 0,
        y: Number(node.y) || 0,
      })),
      edges: (data.graph.edges ?? []).map((edge) => ({
        id: clean(edge.id, 64),
        source: clean(edge.source, 64),
        target: clean(edge.target, 64),
        sourceHandle: clean(edge.sourceHandle, 64),
        targetHandle: clean(edge.targetHandle, 64),
        length: clean(edge.length, 32),
        notes: clean(edge.notes, 240),
        cableType: clean(edge.cableType, 32),
        throwdown: clean(edge.throwdown, 32),
      })),
      ports: pins.map((pin, index) => ({
        id: pin.id,
        nodeId: clean(ports[index]?.nodeId, 64),
        pinId: clean(ports[index]?.pinId, 64),
      })),
    };

    const sql = await getSql();
    const types = await sql<{ id: number }>`
      select id from device_types where user_id = ${context.userId} and name = ${"System"}
    `;
    const makers = await sql<{ id: number }>`
      select id from manufacturers where user_id = ${context.userId} and name = ${"Unbranded"}
    `;
    const deviceTypeId = types[0]?.id;
    const manufacturerId = makers[0]?.id;
    if (!deviceTypeId || !manufacturerId) return { error: "The System type is not in the library yet." };
    const known = await sql<{ name: string }>`
      select name from connection_types where user_id = ${context.userId}
    `;
    const signalNames = new Set(known.map((row) => row.name));
    if (pins.some((pin) => !signalNames.has(pin.signal))) {
      return { error: "Every exposed connection must use a signal from your library." };
    }
    const dup = await sql`
      select id from equipment
      where user_id = ${context.userId}
        and device_type_id = ${deviceTypeId}
        and manufacturer_id = ${manufacturerId}
        and model = ${name}
    `;
    if (dup.length) return { error: "That system name is already in the library." };
    await sql`
      insert into equipment (
        user_id, device_type_id, manufacturer_id, model, kind, notes, product_website, pins_json, graph_json
      ) values (
        ${context.userId}, ${deviceTypeId}, ${manufacturerId}, ${name}, ${"system"},
        ${notes}, ${""}, ${JSON.stringify(pins)}, ${JSON.stringify(graph)}
      )
    `;
    return { error: null };
  });

export const updateSystemGraph = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { equipmentId: number; graph: SystemGraph }) => input)
  .handler(async ({ context, data }) => {
    const equipmentId = Number(data.equipmentId);
    if (!equipmentId || !data.graph?.nodes?.length) return { error: "This system has no boxes to save." };
    const graph: SystemGraph = {
      nodes: data.graph.nodes.map((node) => ({
        id: clean(node.id, 64),
        equipmentId: Number(node.equipmentId),
        unitId: clean(node.unitId, 64),
        ip: clean(node.ip, 64),
        specialNotes: clean(node.specialNotes, 240),
        x: Number(node.x) || 0,
        y: Number(node.y) || 0,
      })),
      edges: (data.graph.edges ?? []).map((edge) => ({
        id: clean(edge.id, 64),
        source: clean(edge.source, 64),
        target: clean(edge.target, 64),
        sourceHandle: clean(edge.sourceHandle, 64),
        targetHandle: clean(edge.targetHandle, 64),
        length: clean(edge.length, 32),
        notes: clean(edge.notes, 240),
        cableType: clean(edge.cableType, 32),
        throwdown: clean(edge.throwdown, 32),
      })),
      ports: (data.graph.ports ?? []).map((port) => ({
        id: clean(port.id, 64),
        nodeId: clean(port.nodeId, 64),
        pinId: clean(port.pinId, 64),
      })),
    };
    const sql = await getSql();
    const updated = await sql<{ id: number }>`
      update equipment
      set graph_json = ${JSON.stringify(graph)}
      where id = ${equipmentId} and user_id = ${context.userId} and kind = ${"system"}
      returning id
    `;
    if (!updated.length) return { error: "That system is not in the library." };
    return { error: null };
  });
