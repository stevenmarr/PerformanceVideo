// @ts-nocheck
/**
 * Turn the device catalog JSON into device_definitions rows.
 * Port counts are copied only when the file states them. Confidence "none"
 * and a null count become one flagged placeholder, never a guessed number.
 */

const CONFIDENCE = new Set(["high", "medium", "low", "none"]);

export function portsForDevice(device) {
  const groups = Array.isArray(device.ports) ? device.ports : [];
  const unverified = device.port_data_confidence === "none" || groups.length === 0;
  if (unverified) {
    return {
      unverified: true,
      ports: [
        {
          id: "unverified",
          name: "Unverified port",
          direction: "bidirectional",
          signal_type: "unknown",
          connector: "unknown",
          count: null,
          unverified: true,
        },
      ],
    };
  }
  const ports = [];
  for (const group of groups) {
    const count = group.count == null ? null : group.count;
    ports.push({
      id: String(group.id ?? "port"),
      name: String(group.name ?? "Port"),
      direction: group.direction === "out" || group.direction === "in" || group.direction === "bidirectional" ? group.direction : "bidirectional",
      signal_type: String(group.signal_type ?? "unknown"),
      connector: String(group.connector ?? "unknown"),
      count: Number.isInteger(count) && count > 0 ? count : null,
      unverified: count == null || group.confidence === "none",
    });
  }
  return { unverified: ports.some((port) => port.unverified), ports };
}

/** One canvas pin per physical connector. A missing count stays a single flagged pin. */
export function pinsFromPorts(ports) {
  const pins = [];
  for (const port of ports) {
    const direction = port.direction === "out" ? "output" : "input";
    if (port.count == null) {
      pins.push({
        id: port.id,
        label: port.unverified ? `${port.name} (unverified)` : `${port.name} (count unknown)`,
        direction,
        signal: port.signal_type || "unknown",
      });
      continue;
    }
    for (let index = 1; index <= port.count; index += 1) {
      pins.push({
        id: port.count === 1 ? port.id : `${port.id}-${index}`,
        label: port.count === 1 ? port.name : `${port.name} ${index}`,
        direction,
        signal: port.signal_type || "unknown",
      });
    }
  }
  return pins;
}

/**
 * Replace identity-only port lists with a datasheet overlay.
 * Every overlay entry must cite a source URL. Counts must be positive
 * integers or null. Devices that are not in the overlay are unchanged.
 * Extra devices are appended when that id is not already in the catalog.
 */
function assertDatasheetPatch(id, patch) {
  if (!Array.isArray(patch.sources) || patch.sources.length === 0 || patch.sources.some((item) => !item?.url)) {
    throw new Error(`${id} datasheet patch has no source URL`);
  }
  if (!Array.isArray(patch.ports) || patch.ports.length === 0) {
    throw new Error(`${id} datasheet patch has no ports`);
  }
  for (const item of patch.ports) {
    if (item.count != null && (!Number.isInteger(item.count) || item.count < 1)) {
      throw new Error(`${id} ${item.id} count is not a positive integer or null`);
    }
  }
}

export function applyDatasheetPorts(devices, overlay, extras = []) {
  const byId = new Map(overlay.map((item) => [item.id, item]));
  const seen = new Set();
  const next = devices.map((device) => {
    const patch = byId.get(device.id);
    if (!patch) return device;
    if (seen.has(device.id)) throw new Error(`Duplicate datasheet patch ${device.id}`);
    seen.add(device.id);
    assertDatasheetPatch(device.id, patch);
    return {
      ...device,
      port_data_confidence: patch.port_data_confidence,
      ports: patch.ports,
      notes: [device.notes, patch.notes].filter(Boolean).join("\n"),
      sources: [...(device.sources ?? []), ...patch.sources],
    };
  });
  const ids = new Set(next.map((device) => device.id));
  for (const extra of extras) {
    assertDatasheetPatch(extra.id, extra);
    if (ids.has(extra.id)) throw new Error(`Datasheet device ${extra.id} is already in the catalog`);
    ids.add(extra.id);
    next.push(extra);
  }
  return next;
}

export function catalogRows(catalog) {
  const devices = Array.isArray(catalog?.devices) ? catalog.devices : [];
  const errors = [];
  const rows = [];
  const seen = new Set();
  for (const device of devices) {
    if (!device || typeof device.id !== "string" || !device.manufacturer || !device.model) {
      errors.push("A device is missing id, manufacturer, or model.");
      continue;
    }
    if (seen.has(device.id)) errors.push(`Duplicate id ${device.id}`);
    seen.add(device.id);
    if (!CONFIDENCE.has(device.port_data_confidence)) {
      errors.push(`${device.id} has no port_data_confidence`);
    }
    const shaped = portsForDevice(device);
    rows.push({
      id: device.id,
      manufacturer: String(device.manufacturer),
      manufacturerKey: String(device.manufacturer_id ?? ""),
      model: String(device.model),
      family: device.product_line ? String(device.product_line) : "",
      category: String(device.category ?? ""),
      status: String(device.status ?? "unknown"),
      notes: String(device.notes ?? ""),
      portsJson: JSON.stringify(shaped.ports),
      portDataConfidence: String(device.port_data_confidence ?? "none"),
      portsUnverified: shaped.unverified,
      aliasesJson: JSON.stringify(Array.isArray(device.aliases) ? device.aliases : []),
    });
  }
  return { rows, errors };
}

export async function upsertCatalog(query, catalog, importId = "devices") {
  const { rows, errors } = catalogRows(catalog);
  if (errors.length) {
    const error = new Error(errors.slice(0, 8).join("\n"));
    error.errors = errors;
    throw error;
  }
  const marker = await query(`select generated_at from catalog_imports where id = $1`, [importId]);
  if (marker[0]?.generated_at === catalog.generated_at) {
    return { status: "unchanged", count: rows.length };
  }
  for (const row of rows) {
    await query(
      `insert into device_definitions (
         id, owner_user_id, manufacturer, manufacturer_key, model, family, category, status, notes,
         ports_json, port_data_confidence, ports_unverified, aliases_json, updated_at
       ) values (
         $1, null, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now()
       )
       on conflict (id) do update set
         manufacturer = excluded.manufacturer,
         manufacturer_key = excluded.manufacturer_key,
         model = excluded.model,
         family = excluded.family,
         category = excluded.category,
         status = excluded.status,
         notes = excluded.notes,
         ports_json = excluded.ports_json,
         port_data_confidence = excluded.port_data_confidence,
         ports_unverified = excluded.ports_unverified,
         aliases_json = excluded.aliases_json,
         updated_at = now()`,
      [
        row.id,
        row.manufacturer,
        row.manufacturerKey,
        row.model,
        row.family,
        row.category,
        row.status,
        row.notes,
        row.portsJson,
        row.portDataConfidence,
        row.portsUnverified,
        row.aliasesJson,
      ],
    );
  }
  await query(
    `insert into catalog_imports (id, schema_version, generated_at, device_count, imported_at)
     values ($1, $2, $3, $4, now())
     on conflict (id) do update set
       schema_version = excluded.schema_version,
       generated_at = excluded.generated_at,
       device_count = excluded.device_count,
       imported_at = now()`,
    [importId, String(catalog.schema_version ?? ""), String(catalog.generated_at ?? ""), rows.length],
  );
  return { status: "imported", count: rows.length };
}
