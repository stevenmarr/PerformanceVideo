/**
 * Server API for the equipment library and the drawing title block.
 * Every query is scoped to the signed-in user. The show canvas is not here.
 */
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  CORPORATE_GEAR,
  CORPORATE_MAKERS,
  CORPORATE_SIGNALS,
  CORPORATE_TYPES,
} from "@/lib/corporate-nodes";
import { seedJpmDrawing } from "@/lib/seed-jpm";
import { seedSolventumDrawing } from "@/lib/seed-solventum";

export type Pin = {
  id: string;
  label: string;
  direction: "input" | "output";
  signal: string;
};

export type DeviceTypeRow = { id: number; name: string; color: string };
export type ManufacturerRow = { id: number; name: string; website: string };
export type ConnectionTypeRow = {
  id: number;
  name: string;
  color: string;
  specLevel: string;
};
export type CableLengthRow = {
  id: number;
  lengthValue: string;
  displayOrder: number;
  isCustom: boolean;
};
export type EquipmentRow = {
  id: number;
  model: string;
  kind: string;
  notes: string;
  productWebsite: string;
  deviceTypeId: number;
  deviceType: string;
  manufacturerId: number;
  manufacturer: string;
  pins: Pin[];
  graphJson: string;
};
export type StudioRow = {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  tagline: string;
  drawnBy: string;
};

export type Catalog = {
  deviceTypes: DeviceTypeRow[];
  manufacturers: ManufacturerRow[];
  connectionTypes: ConnectionTypeRow[];
  cableLengths: CableLengthRow[];
  equipment: EquipmentRow[];
  studio: StudioRow;
};

const KINDS = ["device", "converter", "splitter", "distribution", "adapter", "system"] as const;

const EMPTY_STUDIO: StudioRow = {
  companyName: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  tagline: "",
  drawnBy: "",
};

function clean(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

function hexColor(value: unknown): string | null {
  const color = clean(value, 7);
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : null;
}

function parsePins(raw: string): Pin[] {
  try {
    const parsed = JSON.parse(raw) as Pin[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (pin) =>
        pin &&
        typeof pin.label === "string" &&
        (pin.direction === "input" || pin.direction === "output"),
    );
  } catch {
    return [];
  }
}

async function ensureLibrary(userId: string) {
  const sql = await getSql();
  for (const [name, color, spec] of CORPORATE_SIGNALS) {
    await sql`
      insert into connection_types (user_id, name, color, spec_level)
      values (${userId}, ${name}, ${color}, ${spec})
      on conflict (user_id, name) do nothing
    `;
  }
  for (const [value, order, custom] of [
    ["patch < 10'", 10, false],
    ["10'", 20, false],
    ["25'", 30, false],
    ["50'", 40, false],
    ["100'", 50, false],
    ["200'", 60, false],
    ["100M", 70, false],
    ["1000'", 80, false],
  ] as [string, number, boolean][]) {
    await sql`
      insert into cable_lengths (user_id, length_value, display_order, is_custom)
      values (${userId}, ${value}, ${order}, ${custom})
      on conflict (user_id, length_value) do nothing
    `;
  }
  for (const name of CORPORATE_TYPES) {
    await sql`
      insert into device_types (user_id, name, color)
      values (${userId}, ${name}, ${"#3f3a34"})
      on conflict (user_id, name) do nothing
    `;
  }
  for (const name of CORPORATE_MAKERS) {
    await sql`
      insert into manufacturers (user_id, name)
      values (${userId}, ${name})
      on conflict (user_id, name) do nothing
    `;
  }
  await sql`
    update connection_types
    set color = '#e7e5e4'
    where user_id = ${userId} and name = 'HDMI' and color = '#111111'
  `;
  await sql`
    update device_types
    set color = '#3f3a34'
    where user_id = ${userId} and color = '#111111'
  `;

  const flag = await sql<{ corporate_pack: number; solventum: number; jpm: number }>`
    select corporate_pack, solventum, jpm from library_flags where user_id = ${userId}
  `;
  const pack = flag[0]?.corporate_pack ?? 0;
  const solventum = flag[0]?.solventum ?? 0;
  const jpm = flag[0]?.jpm ?? 0;
  if (pack < 4) {
    await seedCorporateGear(userId, pack);
    await sql`
      insert into library_flags (user_id, corporate_pack)
      values (${userId}, ${4})
      on conflict (user_id) do update set corporate_pack = 4
    `;
  }
  if (solventum < 1) {
    await seedSolventumDrawing(userId);
    await sql`
      insert into library_flags (user_id, solventum)
      values (${userId}, ${1})
      on conflict (user_id) do update set solventum = 1
    `;
  }
  if (jpm < 1) {
    await seedJpmDrawing(userId);
    await sql`
      insert into library_flags (user_id, jpm)
      values (${userId}, ${1})
      on conflict (user_id) do update set jpm = 1
    `;
  }
}

async function seedCorporateGear(userId: string, already: number) {
  const sql = await getSql();
  const types = await sql<{ id: number; name: string }>`
    select id, name from device_types where user_id = ${userId}
  `;
  const makers = await sql<{ id: number; name: string }>`
    select id, name from manufacturers where user_id = ${userId}
  `;
  const typeId = (name: string) => types.find((row) => row.name === name)?.id;
  const makerId = (name: string) => makers.find((row) => row.name === name)?.id;

  for (const sample of CORPORATE_GEAR) {
    if ((sample.pack ?? 1) <= already) continue;
    const deviceTypeId = typeId(sample.type);
    const manufacturerId = makerId(sample.maker);
    if (!deviceTypeId || !manufacturerId) continue;
    const pins: Pin[] = sample.pins.map(([label, direction, signal], index) => ({
      id: `pin-${index + 1}`,
      label,
      direction,
      signal,
    }));
    await sql`
      insert into equipment (
        user_id, device_type_id, manufacturer_id, model, kind, notes, product_website, pins_json
      ) values (
        ${userId}, ${deviceTypeId}, ${manufacturerId}, ${sample.model}, ${sample.kind},
        ${sample.notes}, ${""}, ${JSON.stringify(pins)}
      )
      on conflict (user_id, device_type_id, manufacturer_id, model) do nothing
    `;
  }
}

async function readCatalog(userId: string): Promise<Catalog> {
  const sql = await getSql();
  const deviceTypes = await sql<DeviceTypeRow>`
    select id, name, color from device_types
    where user_id = ${userId}
    order by name
  `;
  const manufacturers = await sql<ManufacturerRow>`
    select id, name, website from manufacturers
    where user_id = ${userId}
    order by name
  `;
  const connectionTypes = await sql<{
    id: number;
    name: string;
    color: string;
    spec_level: string;
  }>`
    select id, name, color, spec_level from connection_types
    where user_id = ${userId}
    order by name
  `;
  const cableLengths = await sql<{
    id: number;
    length_value: string;
    display_order: number;
    is_custom: boolean;
  }>`
    select id, length_value, display_order, is_custom from cable_lengths
    where user_id = ${userId}
    order by display_order, length_value
  `;
  const equipment = await sql<{
    id: number;
    model: string;
    kind: string;
    notes: string;
    product_website: string;
    device_type_id: number;
    device_type: string;
    manufacturer_id: number;
    manufacturer: string;
    pins_json: string;
    graph_json: string;
  }>`
    select e.id, e.model, e.kind, e.notes, e.product_website,
           e.device_type_id, d.name as device_type,
           e.manufacturer_id, m.name as manufacturer,
           e.pins_json, e.graph_json
    from equipment e
    join device_types d on d.id = e.device_type_id and d.user_id = e.user_id
    join manufacturers m on m.id = e.manufacturer_id and m.user_id = e.user_id
    where e.user_id = ${userId}
    order by d.name, m.name, e.model
  `;
  const studios = await sql<{
    company_name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    tagline: string;
    drawn_by: string;
  }>`
    select company_name, address, phone, email, website, tagline, drawn_by
    from studios where user_id = ${userId}
  `;
  const studio = studios[0];
  return {
    deviceTypes,
    manufacturers,
    connectionTypes: connectionTypes.map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      specLevel: row.spec_level,
    })),
    cableLengths: cableLengths.map((row) => ({
      id: row.id,
      lengthValue: row.length_value,
      displayOrder: row.display_order,
      isCustom: row.is_custom,
    })),
    equipment: equipment.map((row) => ({
      id: row.id,
      model: row.model,
      kind: row.kind,
      notes: row.notes,
      productWebsite: row.product_website,
      deviceTypeId: row.device_type_id,
      deviceType: row.device_type,
      manufacturerId: row.manufacturer_id,
      manufacturer: row.manufacturer,
      pins: parsePins(row.pins_json),
      graphJson: row.graph_json ?? "",
    })),
    studio: studio
      ? {
          companyName: studio.company_name,
          address: studio.address,
          phone: studio.phone,
          email: studio.email,
          website: studio.website,
          tagline: studio.tagline,
          drawnBy: studio.drawn_by,
        }
      : EMPTY_STUDIO,
  };
}

export const getCatalog = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Catalog> => {
    await ensureLibrary(context.userId);
    return readCatalog(context.userId);
  });

export const addDeviceType = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name: string; color: string }) => input)
  .handler(async ({ context, data }) => {
    const name = clean(data.name, 64);
    const color = hexColor(data.color) ?? "#111111";
    if (!name) return { error: "Name is required." };
    const sql = await getSql();
    const dup = await sql`
      select id from device_types where user_id = ${context.userId} and name = ${name}
    `;
    if (dup.length) return { error: `“${name}” is already in the library.` };
    await sql`
      insert into device_types (user_id, name, color) values (${context.userId}, ${name}, ${color})
    `;
    return { error: null };
  });

export const deleteDeviceType = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => Number(id))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const used = await sql`
      select id from equipment where user_id = ${context.userId} and device_type_id = ${id}
    `;
    if (used.length) return { error: "That type is used by equipment. Remove the equipment first." };
    await sql`delete from device_types where id = ${id} and user_id = ${context.userId}`;
    return { error: null };
  });

export const addManufacturer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name: string; website: string }) => input)
  .handler(async ({ context, data }) => {
    const name = clean(data.name, 80);
    const website = clean(data.website, 200);
    if (!name) return { error: "Name is required." };
    const sql = await getSql();
    const dup = await sql`
      select id from manufacturers where user_id = ${context.userId} and name = ${name}
    `;
    if (dup.length) return { error: `“${name}” is already in the library.` };
    await sql`
      insert into manufacturers (user_id, name, website)
      values (${context.userId}, ${name}, ${website})
    `;
    return { error: null };
  });

export const deleteManufacturer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => Number(id))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const used = await sql`
      select id from equipment where user_id = ${context.userId} and manufacturer_id = ${id}
    `;
    if (used.length) return { error: "That manufacturer is used by equipment. Remove the equipment first." };
    await sql`delete from manufacturers where id = ${id} and user_id = ${context.userId}`;
    return { error: null };
  });

export const addConnectionType = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name: string; color: string; specLevel: string }) => input)
  .handler(async ({ context, data }) => {
    const name = clean(data.name, 64);
    const color = hexColor(data.color);
    const specLevel = clean(data.specLevel, 64);
    if (!name) return { error: "Signal name is required." };
    if (!color) return { error: "Pick a color for this signal." };
    const sql = await getSql();
    const dup = await sql`
      select id from connection_types where user_id = ${context.userId} and name = ${name}
    `;
    if (dup.length) return { error: `“${name}” is already a signal.` };
    await sql`
      insert into connection_types (user_id, name, color, spec_level)
      values (${context.userId}, ${name}, ${color}, ${specLevel})
    `;
    return { error: null };
  });

export const deleteConnectionType = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => Number(id))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const rows = await sql<{ name: string }>`
      select name from connection_types where id = ${id} and user_id = ${context.userId}
    `;
    const name = rows[0]?.name;
    if (!name) return { error: "That signal was not found." };
    const gear = await sql<{ pins_json: string }>`
      select pins_json from equipment where user_id = ${context.userId}
    `;
    const used = gear.some((row) => parsePins(row.pins_json).some((pin) => pin.signal === name));
    if (used) return { error: "That signal is on a piece of equipment. Change those connections first." };
    await sql`delete from connection_types where id = ${id} and user_id = ${context.userId}`;
    return { error: null };
  });

export const addCableLength = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { lengthValue: string }) => input)
  .handler(async ({ context, data }) => {
    const lengthValue = clean(data.lengthValue, 32);
    if (!lengthValue) return { error: "Length is required." };
    const sql = await getSql();
    const dup = await sql`
      select id from cable_lengths where user_id = ${context.userId} and length_value = ${lengthValue}
    `;
    if (dup.length) return { error: `“${lengthValue}” is already a length.` };
    await sql`
      insert into cable_lengths (user_id, length_value, display_order, is_custom)
      values (${context.userId}, ${lengthValue}, ${lengthSort(lengthValue)}, ${false})
    `;
    return { error: null };
  });

export const deleteCableLength = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => Number(id))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from cable_lengths where id = ${id} and user_id = ${context.userId}`;
    return { error: null };
  });

type EquipmentInput = {
  deviceTypeId: number;
  manufacturerId: number;
  model: string;
  kind: string;
  notes: string;
  website: string;
  pins: { label: string; direction: string; signal: string }[];
};

export const addEquipment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: EquipmentInput) => input)
  .handler(async ({ context, data }) => {
    const model = clean(data.model, 80);
    const kind = KINDS.includes(data.kind as (typeof KINDS)[number]) ? data.kind : "";
    const notes = clean(data.notes, 500);
    const website = clean(data.website, 200);
    const deviceTypeId = Number(data.deviceTypeId);
    const manufacturerId = Number(data.manufacturerId);
    if (!model) return { error: "Model name is required." };
    if (!kind) return { error: "Choose what kind of box this is." };
    if (!deviceTypeId || !manufacturerId) return { error: "Device type and manufacturer are required." };

    const pins: Pin[] = [];
    for (const [index, pin] of (data.pins ?? []).entries()) {
      const label = clean(pin.label, 48);
      const signal = clean(pin.signal, 64);
      const direction = pin.direction === "output" ? "output" : pin.direction === "input" ? "input" : "";
      if (!label && !signal) continue;
      if (!label || !signal || !direction) {
        return { error: "Each connection needs a name, a direction, and a signal." };
      }
      pins.push({ id: `pin-${index + 1}`, label, direction, signal });
    }
    if (pins.length === 0) return { error: "Add at least one connection." };

    const sql = await getSql();
    const typeOk = await sql`
      select id from device_types where id = ${deviceTypeId} and user_id = ${context.userId}
    `;
    const makerOk = await sql`
      select id from manufacturers where id = ${manufacturerId} and user_id = ${context.userId}
    `;
    if (!typeOk.length || !makerOk.length) return { error: "Device type or manufacturer was not found." };
    const knownSignals = await sql<{ name: string }>`
      select name from connection_types where user_id = ${context.userId}
    `;
    const signalNames = new Set(knownSignals.map((row) => row.name));
    if (pins.some((pin) => !signalNames.has(pin.signal))) {
      return { error: "Every connection must use a signal from your library." };
    }
    const dup = await sql`
      select id from equipment
      where user_id = ${context.userId}
        and device_type_id = ${deviceTypeId}
        and manufacturer_id = ${manufacturerId}
        and model = ${model}
    `;
    if (dup.length) return { error: "That model is already saved." };

    await sql`
      insert into equipment (
        user_id, device_type_id, manufacturer_id, model, kind, notes, product_website, pins_json
      ) values (
        ${context.userId}, ${deviceTypeId}, ${manufacturerId}, ${model}, ${kind},
        ${notes}, ${website}, ${JSON.stringify(pins)}
      )
    `;
    return { error: null };
  });

export const deleteEquipment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => Number(id))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from equipment where id = ${id} and user_id = ${context.userId}`;
    return { error: null };
  });

export const updateDeviceType = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; name: string; color: string }) => input)
  .handler(async ({ context, data }) => {
    const id = Number(data.id);
    const name = clean(data.name, 64);
    const color = hexColor(data.color) ?? "#3f3a34";
    if (!name) return { error: "Name is required." };
    const sql = await getSql();
    const dup = await sql`
      select id from device_types
      where user_id = ${context.userId} and name = ${name} and id <> ${id}
    `;
    if (dup.length) return { error: `“${name}” is already in the library.` };
    const updated = await sql`
      update device_types set name = ${name}, color = ${color}
      where id = ${id} and user_id = ${context.userId}
      returning id
    `;
    if (!updated.length) return { error: "That type was not found." };
    return { error: null };
  });

export const updateManufacturer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; name: string; website: string }) => input)
  .handler(async ({ context, data }) => {
    const id = Number(data.id);
    const name = clean(data.name, 80);
    const website = clean(data.website, 200);
    if (!name) return { error: "Name is required." };
    const sql = await getSql();
    const dup = await sql`
      select id from manufacturers
      where user_id = ${context.userId} and name = ${name} and id <> ${id}
    `;
    if (dup.length) return { error: `“${name}” is already in the library.` };
    const updated = await sql`
      update manufacturers set name = ${name}, website = ${website}
      where id = ${id} and user_id = ${context.userId}
      returning id
    `;
    if (!updated.length) return { error: "That manufacturer was not found." };
    return { error: null };
  });

export const updateConnectionType = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; name: string; color: string; specLevel: string }) => input)
  .handler(async ({ context, data }) => {
    const id = Number(data.id);
    const name = clean(data.name, 64);
    const color = hexColor(data.color);
    const specLevel = clean(data.specLevel, 64);
    if (!name) return { error: "Signal name is required." };
    if (!color) return { error: "Pick a color for this signal." };
    const sql = await getSql();
    const current = await sql<{ name: string }>`
      select name from connection_types where id = ${id} and user_id = ${context.userId}
    `;
    const oldName = current[0]?.name;
    if (!oldName) return { error: "That signal was not found." };
    const dup = await sql`
      select id from connection_types
      where user_id = ${context.userId} and name = ${name} and id <> ${id}
    `;
    if (dup.length) return { error: `“${name}” is already a signal.` };
    if (name !== oldName) {
      const gear = await sql<{ id: number; pins_json: string }>`
        select id, pins_json from equipment where user_id = ${context.userId}
      `;
      for (const row of gear) {
        const pins = parsePins(row.pins_json);
        if (!pins.some((pin) => pin.signal === oldName)) continue;
        const next = pins.map((pin) => (pin.signal === oldName ? { ...pin, signal: name } : pin));
        await sql`update equipment set pins_json = ${JSON.stringify(next)} where id = ${row.id}`;
      }
    }
    await sql`
      update connection_types set name = ${name}, color = ${color}, spec_level = ${specLevel}
      where id = ${id} and user_id = ${context.userId}
    `;
    return { error: null };
  });

function lengthSort(value: string): number {
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Math.round(Number(match[1])) : 800;
}

export const updateCableLength = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; lengthValue: string }) => input)
  .handler(async ({ context, data }) => {
    const id = Number(data.id);
    const lengthValue = clean(data.lengthValue, 32);
    if (!lengthValue) return { error: "Length is required." };
    const sql = await getSql();
    const dup = await sql`
      select id from cable_lengths
      where user_id = ${context.userId} and length_value = ${lengthValue} and id <> ${id}
    `;
    if (dup.length) return { error: `“${lengthValue}” is already a length.` };
    const updated = await sql`
      update cable_lengths
      set length_value = ${lengthValue}, display_order = ${lengthSort(lengthValue)}, is_custom = false
      where id = ${id} and user_id = ${context.userId}
      returning id
    `;
    if (!updated.length) return { error: "That length was not found." };
    return { error: null };
  });

export const updateEquipment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: EquipmentInput & { id: number }) => input)
  .handler(async ({ context, data }) => {
    const id = Number(data.id);
    const model = clean(data.model, 80);
    const kind = KINDS.includes(data.kind as (typeof KINDS)[number]) ? data.kind : "";
    const notes = clean(data.notes, 500);
    const website = clean(data.website, 200);
    const deviceTypeId = Number(data.deviceTypeId);
    const manufacturerId = Number(data.manufacturerId);
    if (!model) return { error: "Model name is required." };
    if (!kind) return { error: "Choose what kind of box this is." };
    if (!deviceTypeId || !manufacturerId) return { error: "Device type and manufacturer are required." };

    const pins: Pin[] = [];
    for (const [index, pin] of (data.pins ?? []).entries()) {
      const label = clean(pin.label, 48);
      const signal = clean(pin.signal, 64);
      const direction = pin.direction === "output" ? "output" : pin.direction === "input" ? "input" : "";
      if (!label && !signal) continue;
      if (!label || !signal || !direction) {
        return { error: "Each connection needs a name, a direction, and a signal." };
      }
      pins.push({ id: `pin-${index + 1}`, label, direction, signal });
    }
    if (pins.length === 0) return { error: "Add at least one connection." };

    const sql = await getSql();
    const typeOk = await sql`
      select id from device_types where id = ${deviceTypeId} and user_id = ${context.userId}
    `;
    const makerOk = await sql`
      select id from manufacturers where id = ${manufacturerId} and user_id = ${context.userId}
    `;
    if (!typeOk.length || !makerOk.length) return { error: "Device type or manufacturer was not found." };
    const knownSignals = await sql<{ name: string }>`
      select name from connection_types where user_id = ${context.userId}
    `;
    const signalNames = new Set(knownSignals.map((row) => row.name));
    if (pins.some((pin) => !signalNames.has(pin.signal))) {
      return { error: "Every connection must use a signal from your library." };
    }
    const dup = await sql`
      select id from equipment
      where user_id = ${context.userId}
        and device_type_id = ${deviceTypeId}
        and manufacturer_id = ${manufacturerId}
        and model = ${model}
        and id <> ${id}
    `;
    if (dup.length) return { error: "That model is already saved." };
    const updated = await sql`
      update equipment set
        device_type_id = ${deviceTypeId},
        manufacturer_id = ${manufacturerId},
        model = ${model},
        kind = ${kind},
        notes = ${notes},
        product_website = ${website},
        pins_json = ${JSON.stringify(pins)}
      where id = ${id} and user_id = ${context.userId}
      returning id
    `;
    if (!updated.length) return { error: "That model was not found." };
    return { error: null };
  });

export const saveStudio = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: StudioRow) => input)
  .handler(async ({ context, data }) => {
    const row: StudioRow = {
      companyName: clean(data.companyName, 120),
      address: clean(data.address, 200),
      phone: clean(data.phone, 40),
      email: clean(data.email, 120),
      website: clean(data.website, 200),
      tagline: clean(data.tagline, 160),
      drawnBy: clean(data.drawnBy, 80),
    };
    const sql = await getSql();
    await sql`
      insert into studios (
        user_id, company_name, address, phone, email, website, tagline, drawn_by
      ) values (
        ${context.userId}, ${row.companyName}, ${row.address}, ${row.phone},
        ${row.email}, ${row.website}, ${row.tagline}, ${row.drawnBy}
      )
      on conflict (user_id) do update set
        company_name = excluded.company_name,
        address = excluded.address,
        phone = excluded.phone,
        email = excluded.email,
        website = excluded.website,
        tagline = excluded.tagline,
        drawn_by = excluded.drawn_by
    `;
    return { error: null };
  });
