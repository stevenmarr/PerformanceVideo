import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { pinsFromPorts } from "../../../scripts/catalog-import.mjs";
import { searchDevices, type CatalogSearchRecord } from "@/lib/catalog/search";

type Stored = {
  id: string;
  manufacturer: string;
  model: string;
  family: string;
  category: string;
  notes: string;
  ports_json: string;
  port_data_confidence: string;
  ports_unverified: boolean;
  aliases_json: string;
};

function signalsOf(portsJson: string): { signals: string[]; connectors: string[] } {
  try {
    const ports = JSON.parse(portsJson) as { signal_type?: string; connector?: string }[];
    return {
      signals: [...new Set(ports.map((port) => port.signal_type || "unknown"))],
      connectors: [...new Set(ports.map((port) => port.connector || "unknown"))],
    };
  } catch {
    return { signals: [], connectors: [] };
  }
}

export const searchCatalog = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: { query: string; manufacturer: string; category: string; signal: string; unverified: string }) => ({
      query: String(input?.query ?? "").slice(0, 80),
      manufacturer: String(input?.manufacturer ?? "").slice(0, 80),
      category: String(input?.category ?? "").slice(0, 80),
      signal: String(input?.signal ?? "").slice(0, 40),
      unverified: (input?.unverified === "verified" || input?.unverified === "unverified" ? input.unverified : "all") as
        | "all"
        | "verified"
        | "unverified",
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<Stored>`
      select id, manufacturer, model, family, category, notes, ports_json, port_data_confidence, ports_unverified, aliases_json
      from device_definitions
      where owner_user_id is null
    `;
    const records: CatalogSearchRecord[] = rows.map((row) => {
      const ports = signalsOf(row.ports_json);
      let aliases: string[] = [];
      try {
        const parsed = JSON.parse(row.aliases_json);
        aliases = Array.isArray(parsed) ? parsed.map(String) : [];
      } catch {
        aliases = [];
      }
      return {
        id: row.id,
        manufacturer: row.manufacturer,
        model: row.model,
        family: row.family,
        category: row.category,
        confidence: row.port_data_confidence,
        unverified: row.ports_unverified,
        aliases,
        signals: ports.signals,
        connectors: ports.connectors,
      };
    });
    const hits = searchDevices(records, data.query, {
      manufacturer: data.manufacturer,
      category: data.category,
      signal: data.signal,
      unverified: data.unverified,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return {
      imported: rows.length > 0,
      total: rows.length,
      manufacturers: [...new Set(rows.map((row) => row.manufacturer))].sort(),
      categories: [...new Set(rows.map((row) => row.category).filter(Boolean))].sort(),
      hits: hits.map((hit) => {
        const row = byId.get(hit.id);
        return { ...hit, notes: row?.notes ?? "" };
      }),
    };
  });

export const adoptCatalogDevice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => String(id ?? "").slice(0, 160))
  .handler(async ({ context, data: catalogId }) => {
    const sql = await getSql();
    const rows = await sql<Stored>`
      select id, manufacturer, model, family, category, notes, ports_json, port_data_confidence, ports_unverified, aliases_json
      from device_definitions
      where id = ${catalogId} and owner_user_id is null
    `;
    const device = rows[0];
    if (!device) return { error: "That device is not in the global library.", equipment: null };
    const existing = await sql<{
      id: number;
      model: string;
      notes: string;
      pins_json: string;
      device_type_id: number;
      device_type: string;
    }>`
      select e.id, e.model, e.notes, e.pins_json, e.device_type_id, d.name as device_type
      from equipment e
      join device_types d on d.id = e.device_type_id
      where e.user_id = ${context.userId} and e.catalog_id = ${catalogId}
    `;
    const pins = (pinsFromPorts(JSON.parse(device.ports_json)) as { id: string; label: string; direction: string; signal: string }[]).map(
      (pin) => ({
        id: pin.id,
        label: pin.label,
        direction: pin.direction === "output" ? ("output" as const) : ("input" as const),
        signal: pin.signal,
      }),
    );
    if (existing[0]) {
      return {
        error: null,
        equipment: {
          id: existing[0].id,
          model: existing[0].model,
          kind: "device",
          notes: existing[0].notes,
          deviceTypeId: existing[0].device_type_id,
          deviceType: existing[0].device_type,
          manufacturer: device.manufacturer,
          pins,
        },
      };
    }
    const types = await sql<{ id: number }>`
      select id from device_types where user_id = ${context.userId} and name = ${device.category || "Device"}
    `;
    let typeId = types[0]?.id;
    if (!typeId) {
      const inserted = await sql<{ id: number }>`
        insert into device_types (user_id, name, color) values (${context.userId}, ${device.category || "Device"}, ${"#3f3a34"}) returning id
      `;
      typeId = inserted[0]?.id;
    }
    const makers = await sql<{ id: number }>`
      select id from manufacturers where user_id = ${context.userId} and name = ${device.manufacturer}
    `;
    let makerId = makers[0]?.id;
    if (!makerId) {
      const inserted = await sql<{ id: number }>`
        insert into manufacturers (user_id, name) values (${context.userId}, ${device.manufacturer}) returning id
      `;
      makerId = inserted[0]?.id;
    }
    if (!typeId || !makerId) return { error: "The device could not be added to your library.", equipment: null };
    const note = device.ports_unverified ? `Unverified I/O. ${device.notes}`.trim() : device.notes;
    const inserted = await sql<{ id: number }>`
      insert into equipment (user_id, device_type_id, manufacturer_id, model, kind, notes, pins_json, catalog_id)
      values (${context.userId}, ${typeId}, ${makerId}, ${device.model}, ${"device"}, ${note}, ${JSON.stringify(pins)}, ${catalogId})
      returning id
    `;
    return {
      error: null,
      equipment: {
        id: inserted[0]?.id ?? 0,
        model: device.model,
        kind: "device",
        notes: note,
        deviceTypeId: typeId,
        deviceType: device.category || "Device",
        manufacturer: device.manufacturer,
        pins,
      },
    };
  });
