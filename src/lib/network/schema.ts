/**
 * Per-port network record for a show drawing and for a library module.
 * Saved drawings from pvllc.network/1.0.0 still load: missing fields are filled,
 * and an address the engineer already typed is left alone.
 */

export const NETWORK_SCHEMA = "pvllc.network/1.1.0";

export const NIC_ROLES = ["management", "media", "control"] as const;
export type NicRole = (typeof NIC_ROLES)[number];

export const MEDIA_TRANSPORTS = ["", "dante", "aes67", "ndi", "st2110", "st2022-6", "st2022-7"] as const;
export type MediaTransport = (typeof MEDIA_TRANSPORTS)[number];

export const PTP_ROLES = ["", "grandmaster", "boundary", "ordinary", "transparent"] as const;
export type PtpRole = (typeof PTP_ROLES)[number];

export type NetworkPort = {
  name: string;
  role: NicRole;
  mode: "dhcp" | "static";
  address: string;
  cidr: number | null;
  mask: string;
  gateway: string;
  vlan: number | null;
  mac: string;
  hostname: string;
  controlProtocol: string;
  controlPort: number | null;
  mediaTransport: MediaTransport;
  multicast: string[];
  ptpDomain: number | null;
  ptpRole: PtpRole;
};

export function blankPort(partial: Partial<NetworkPort> = {}): NetworkPort {
  const cidr = partial.cidr === undefined ? 24 : partial.cidr;
  const mask = partial.mask ?? (cidr == null ? "" : cidrToMask(cidr));
  return {
    name: partial.name ?? "eth0",
    role: partial.role ?? "management",
    mode: partial.mode === "dhcp" ? "dhcp" : "static",
    address: partial.address ?? "",
    cidr,
    mask,
    gateway: partial.gateway ?? "",
    vlan: partial.vlan === undefined ? null : partial.vlan,
    mac: partial.mac ?? "",
    hostname: partial.hostname ?? "",
    controlProtocol: partial.controlProtocol ?? "",
    controlPort: partial.controlPort === undefined ? null : partial.controlPort,
    mediaTransport: partial.mediaTransport ?? "",
    multicast: partial.multicast ? [...partial.multicast] : [],
    ptpDomain: partial.ptpDomain === undefined ? null : partial.ptpDomain,
    ptpRole: partial.ptpRole ?? "",
  };
}

export function cidrToMask(cidr: number): string {
  if (!Number.isInteger(cidr) || cidr < 0 || cidr > 32) return "";
  const mask = cidr === 0 ? 0 : (0xffffffff << (32 - cidr)) >>> 0;
  return [(mask >>> 24) & 255, (mask >>> 16) & 255, (mask >>> 8) & 255, mask & 255].join(".");
}

export function maskToCidr(mask: string): number | null {
  const parts = mask.trim().split(".");
  if (parts.length !== 4) return null;
  let bits = 0;
  let seenZero = false;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    for (let shift = 7; shift >= 0; shift -= 1) {
      const on = (octet & (1 << shift)) !== 0;
      if (on && seenZero) return null;
      if (!on) seenZero = true;
      else bits += 1;
    }
  }
  return bits;
}

function asRole(value: unknown, name: string): NicRole {
  if (value === "management" || value === "media" || value === "control") return value;
  if (/dante|2110|2022|ndi|media|aes67/i.test(name)) return "media";
  if (/ctrl|control|visca|pjlink/i.test(name)) return "control";
  return "management";
}

function asTransport(value: unknown): MediaTransport {
  return MEDIA_TRANSPORTS.includes(value as MediaTransport) ? (value as MediaTransport) : "";
}

function asPtpRole(value: unknown): PtpRole {
  return PTP_ROLES.includes(value as PtpRole) ? (value as PtpRole) : "";
}

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

/** One saved interface, old or new, becomes the 1.1.0 record. */
export function migratePort(raw: unknown): NetworkPort {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const name = String(row.name ?? "eth0");
  const cidr = asNumber(row.cidr);
  const maskRaw = String(row.mask ?? "").trim();
  const maskCidr = maskRaw ? maskToCidr(maskRaw) : null;
  const prefix = cidr ?? maskCidr;
  const multicast = Array.isArray(row.multicast)
    ? row.multicast.map((item) => String(item).trim()).filter(Boolean)
    : String(row.multicast ?? "")
        .split(/[,\s]+/)
        .map((item) => item.trim())
        .filter(Boolean);
  return {
    name,
    role: asRole(row.role, name),
    mode: row.mode === "dhcp" ? "dhcp" : "static",
    address: String(row.address ?? ""),
    cidr: prefix,
    mask: maskRaw || (prefix == null ? "" : cidrToMask(prefix)),
    gateway: String(row.gateway ?? ""),
    vlan: asNumber(row.vlan),
    mac: String(row.mac ?? ""),
    hostname: String(row.hostname ?? ""),
    controlProtocol: String(row.controlProtocol ?? ""),
    controlPort: asNumber(row.controlPort),
    mediaTransport: asTransport(row.mediaTransport),
    multicast,
    ptpDomain: asNumber(row.ptpDomain),
    ptpRole: asPtpRole(row.ptpRole),
  };
}

export function migratePorts(raw: unknown): NetworkPort[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => migratePort(item));
}

export function isNetworkSignal(signal: string): boolean {
  return /ethernet|dante|ndi|2110|2022|aes67/i.test(signal);
}

export function slugHost(unitId: string, portName: string): string {
  const host = `${unitId}-${portName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63);
  return host || "device";
}
