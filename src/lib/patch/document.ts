/** Machine-readable patch connections. The canvas edge list is the source of truth. */

export const PATCH_SCHEMA = "pvllc.patch/1.0.0";

export type PatchPort = {
  deviceId: string;
  portId: string;
  /** Jack name printed on the box. The port id stays the stable key. */
  name?: string;
  signal: string;
  direction: "input" | "output";
  required?: boolean;
  caution?: "unverified" | "unknown-count" | null;
};

export type PatchConnection = {
  id: string;
  sourceDevice: string;
  sourcePort: string;
  destinationDevice: string;
  destinationPort: string;
  /** Jack names a tech reads. Port ids stay the stable keys. */
  sourceJack?: string;
  destinationJack?: string;
  signalType: string;
  signalFormat: string;
  cableType: string;
  cableLength: string;
  cableLabel: string;
  notes: string;
};

export type PatchDocument = {
  schema: typeof PATCH_SCHEMA;
  show: string;
  connections: PatchConnection[];
};

export type PatchIssue = {
  level: "error" | "warning";
  code: "incompatible" | "double-patched" | "unconnected-required" | "missing-port" | "unverified-port";
  message: string;
  connectionId?: string;
};

function portName(port: PatchPort): string {
  return port.name?.trim() || port.portId;
}

function family(signal: string): string {
  const value = signal.toLowerCase();
  if (value.includes("sdi")) return "sdi";
  if (value.includes("hdmi")) return "hdmi";
  if (value.includes("displayport") || value === "dp") return "displayport";
  if (value.includes("dante")) return "dante";
  if (value.includes("ndi")) return "ndi";
  if (value.includes("2110")) return "st2110";
  if (value.includes("fiber") || value.includes("sfp")) return "fiber";
  if (!value || value === "unknown" || value.includes("unverified")) return "unknown";
  if (value.includes("ethernet")) return "ethernet";
  return value;
}

function sdiRank(signal: string): number {
  const value = signal.toLowerCase();
  if (value.includes("12")) return 12;
  if (value.includes("6")) return 6;
  if (value.includes("3")) return 3;
  if (value.includes("hd")) return 1.5;
  if (value.includes("sd")) return 1;
  return 3;
}

export function signalsCompatible(source: string, destination: string): "ok" | "warning" | "error" {
  const from = family(source);
  const to = family(destination);
  if (from === "unknown" || to === "unknown") return "warning";
  if (from === to && from === "sdi") {
    if (sdiRank(source) > sdiRank(destination)) return "error";
    if (sdiRank(source) < sdiRank(destination)) return "warning";
    return "ok";
  }
  if (from === to) return "ok";
  return "error";
}

export function validatePatch(connections: PatchConnection[], ports: PatchPort[]): PatchIssue[] {
  const issues: PatchIssue[] = [];
  const byKey = new Map(ports.map((port) => [`${port.deviceId}:${port.portId}`, port]));
  const inputs = new Map<string, string[]>();
  for (const connection of connections) {
    const source = byKey.get(`${connection.sourceDevice}:${connection.sourcePort}`);
    const destination = byKey.get(`${connection.destinationDevice}:${connection.destinationPort}`);
    if (!source || !destination) {
      issues.push({
        level: "error",
        code: "missing-port",
        connectionId: connection.id,
        message: `${connection.cableLabel || connection.id} names a port that is not on the drawing.`,
      });
      continue;
    }
    for (const port of [source, destination]) {
      if (!port?.caution) continue;
      const kind = port.caution === "unknown-count" ? "an unknown count" : "unverified";
      issues.push({
        level: "warning",
        code: "unverified-port",
        connectionId: connection.id,
        message: `${connection.cableLabel || connection.id} uses ${port.deviceId} ${portName(port)}, which is ${kind}.`,
      });
    }
    const fit = signalsCompatible(source.signal || connection.signalType, destination.signal);
    if (fit !== "ok") {
      issues.push({
        level: fit === "error" ? "error" : "warning",
        code: "incompatible",
        connectionId: connection.id,
        message:
          fit === "error"
            ? `${source.signal} cannot land on ${destination.signal}.`
            : `${source.signal} into ${destination.signal} is allowed, with a format note.`,
      });
    }
    const key = `${connection.destinationDevice}:${connection.destinationPort}`;
    const used = inputs.get(key) ?? [];
    used.push(connection.id);
    inputs.set(key, used);
  }
  for (const [key, ids] of inputs) {
    if (ids.length > 1) {
      issues.push({
        level: "error",
        code: "double-patched",
        connectionId: ids[1],
        message: `${key} has ${ids.length} cables. An input takes one.`,
      });
    }
  }
  const patched = new Set(connections.flatMap((connection) => [
    `${connection.sourceDevice}:${connection.sourcePort}`,
    `${connection.destinationDevice}:${connection.destinationPort}`,
  ]));
  for (const port of ports) {
    if (!port.required) continue;
    if (!patched.has(`${port.deviceId}:${port.portId}`)) {
      issues.push({
        level: "warning",
        code: "unconnected-required",
        message: `${port.deviceId} ${portName(port)} is required and has no cable.`,
      });
    }
  }
  return issues;
}

export function patchDocument(show: string, connections: PatchConnection[]): PatchDocument {
  return { schema: PATCH_SCHEMA, show, connections };
}

export function parsePatchDocument(raw: unknown): { document: PatchDocument | null; error: string | null } {
  if (!raw || typeof raw !== "object") return { document: null, error: "Patch file must be a JSON object." };
  const body = raw as Partial<PatchDocument>;
  if (body.schema !== PATCH_SCHEMA) return { document: null, error: `Expected schema ${PATCH_SCHEMA}.` };
  if (!Array.isArray(body.connections)) return { document: null, error: "Connections must be a list." };
  const connections = body.connections.map((item, index) => ({
    id: String(item?.id ?? `cable-${index + 1}`),
    sourceDevice: String(item?.sourceDevice ?? ""),
    sourcePort: String(item?.sourcePort ?? ""),
    sourceJack: String(item?.sourceJack ?? ""),
    destinationDevice: String(item?.destinationDevice ?? ""),
    destinationPort: String(item?.destinationPort ?? ""),
    destinationJack: String(item?.destinationJack ?? ""),
    signalType: String(item?.signalType ?? ""),
    signalFormat: String(item?.signalFormat ?? ""),
    cableType: String(item?.cableType ?? ""),
    cableLength: String(item?.cableLength ?? ""),
    cableLabel: String(item?.cableLabel ?? ""),
    notes: String(item?.notes ?? ""),
  }));
  return { document: { schema: PATCH_SCHEMA, show: String(body.show ?? ""), connections }, error: null };
}

const CSV_HEADER = [
  "id",
  "sourceDevice",
  "sourcePort",
  "sourceJack",
  "destinationDevice",
  "destinationPort",
  "destinationJack",
  "signalType",
  "signalFormat",
  "cableType",
  "cableLength",
  "cableLabel",
  "notes",
] as const;

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function connectionsToCsv(connections: PatchConnection[]): string {
  const lines = [CSV_HEADER.join(",")];
  for (const connection of connections) {
    lines.push(CSV_HEADER.map((key) => csvCell(connection[key] ?? "")).join(","));
  }
  return lines.join("\n");
}

export function connectionsFromCsv(text: string): { connections: PatchConnection[]; error: string | null } {
  const rows = parseCsv(text);
  if (!rows.length) return { connections: [], error: "The CSV is empty." };
  const header = rows[0].map((cell) => cell.trim());
  const index = new Map(header.map((name, position) => [name, position]));
  if (!index.has("sourceDevice") || !index.has("destinationDevice")) {
    return { connections: [], error: "CSV needs sourceDevice and destinationDevice columns." };
  }
  const connections = rows.slice(1).filter((row) => row.some((cell) => cell.trim())).map((row, position) => {
    const cell = (name: string) => row[index.get(name) ?? -1] ?? "";
    return {
      id: cell("id") || `cable-${position + 1}`,
      sourceDevice: cell("sourceDevice"),
      sourcePort: cell("sourcePort"),
      sourceJack: cell("sourceJack"),
      destinationDevice: cell("destinationDevice"),
      destinationPort: cell("destinationPort"),
      destinationJack: cell("destinationJack"),
      signalType: cell("signalType"),
      signalFormat: cell("signalFormat"),
      cableType: cell("cableType"),
      cableLength: cell("cableLength"),
      cableLabel: cell("cableLabel"),
      notes: cell("notes"),
    };
  });
  return { connections, error: null };
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") cell += char;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
