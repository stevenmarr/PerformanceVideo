/** Port lists on a device definition. Unverified devices keep a flagged placeholder. */

export type DevicePort = {
  id: string;
  name: string;
  direction: "in" | "out" | "bidirectional";
  signal_type: string;
  connector: string;
  count: number | null;
  unverified: boolean;
};

const PLACEHOLDER: DevicePort = {
  id: "unverified",
  name: "Unverified port",
  direction: "bidirectional",
  signal_type: "unknown",
  connector: "unknown",
  count: null,
  unverified: true,
};

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function normalizePorts(raw: string, unverified: boolean): { ports: DevicePort[]; error: string | null } {
  let parsed: unknown = [];
  if (raw.trim()) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ports: [], error: "Ports must be JSON." };
    }
  }
  if (!Array.isArray(parsed)) return { ports: [], error: "Ports must be a list." };
  if (!parsed.length) return { ports: unverified ? [PLACEHOLDER] : [], error: null };
  const ports: DevicePort[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") return { ports: [], error: "Each port needs a name and direction." };
    const row = item as Record<string, unknown>;
    const name = String(row.name ?? row.label ?? "").trim().slice(0, 80);
    const direction =
      row.direction === "out" || row.direction === "output"
        ? "out"
        : row.direction === "bidirectional"
          ? "bidirectional"
          : row.direction === "in" || row.direction === "input"
            ? "in"
            : null;
    if (!name || !direction) return { ports: [], error: "Each port needs a name and direction." };
    const count = row.count == null || row.count === "" ? null : Number(row.count);
    if (count != null && (!Number.isInteger(count) || count < 1)) {
      return { ports: [], error: "A port count is a positive integer, or empty when it is unknown." };
    }
    ports.push({
      id: slug(String(row.id ?? name)) || "port",
      name,
      direction,
      signal_type: String(row.signal_type ?? row.signal ?? "unknown").slice(0, 64),
      connector: String(row.connector ?? "unknown").slice(0, 64),
      count,
      unverified: Boolean(row.unverified) || unverified,
    });
  }
  return { ports, error: null };
}
