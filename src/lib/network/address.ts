/** IPv4 and IPv6 checks for per-device interfaces. */

export type NetInterface = {
  name: string;
  mode: "dhcp" | "static";
  address: string;
  cidr: number | null;
  gateway: string;
  vlan: number | null;
  mac: string;
  hostname: string;
};

export type NetDevice = {
  id: string;
  label: string;
  interfaces: NetInterface[];
};

export type NetIssue = {
  level: "error" | "warning";
  code:
    | "invalid-address"
    | "duplicate-ip"
    | "outside-subnet"
    | "gateway-outside"
    | "overlapping-subnets"
    | "vlan-mismatch"
    | "duplicate-hostname"
    | "duplicate-mac";
  message: string;
  deviceId: string;
};

export type NetGroup = {
  vlan: string;
  subnet: string;
  devices: { id: string; label: string; address: string; hostname: string }[];
};

const MAC = /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i;

export function parseIpv4(value: string): number | null {
  const parts = value.trim().split(".");
  if (parts.length !== 4) return null;
  let address = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    address = (address << 8) + octet;
  }
  return address >>> 0;
}

export function formatIpv4(address: number): string {
  return [(address >>> 24) & 255, (address >>> 16) & 255, (address >>> 8) & 255, address & 255].join(".");
}

export function parseIpv6(value: string): bigint | null {
  const text = value.trim();
  if (!text || text.includes("%") || text.includes(".")) return null;
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  if (halves.length === 1 && head.length !== 8) return null;
  if (halves.length === 2 && head.length + tail.length > 7) return null;
  const missing = halves.length === 2 ? 8 - head.length - tail.length : 0;
  const groups = [...head, ...Array.from({ length: missing }, () => "0"), ...tail];
  if (groups.length !== 8) return null;
  let address = 0n;
  for (const group of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
    address = (address << 16n) + BigInt(Number.parseInt(group, 16));
  }
  return address;
}

export function formatIpv6(address: bigint): string {
  const groups: string[] = [];
  for (let index = 0; index < 8; index += 1) {
    const shift = BigInt((7 - index) * 16);
    groups.push(((address >> shift) & 0xffffn).toString(16));
  }
  let bestStart = -1;
  let bestLength = 0;
  let index = 0;
  while (index < groups.length) {
    if (groups[index] !== "0") {
      index += 1;
      continue;
    }
    let end = index;
    while (end < groups.length && groups[end] === "0") end += 1;
    if (end - index > bestLength) {
      bestStart = index;
      bestLength = end - index;
    }
    index = end;
  }
  if (bestLength < 2) return groups.join(":");
  const left = groups.slice(0, bestStart).join(":");
  const right = groups.slice(bestStart + bestLength).join(":");
  return `${left}::${right}`;
}

export function networkOf6(address: bigint, prefix: number): bigint {
  if (prefix <= 0) return 0n;
  if (prefix >= 128) return address;
  const host = BigInt(128 - prefix);
  const mask = ((1n << 128n) - 1n) ^ ((1n << host) - 1n);
  return address & mask;
}

export function networkOf(address: number, cidr: number): number {
  const mask = cidr === 0 ? 0 : (0xffffffff << (32 - cidr)) >>> 0;
  return (address & mask) >>> 0;
}

export function inSubnet(address: number, network: number, cidr: number): boolean {
  return networkOf(address, cidr) === network;
}

type TrackedSubnet =
  | { family: 4; deviceId: string; vlan: number | null; network: number; cidr: number; label: string }
  | { family: 6; deviceId: string; vlan: number | null; network: bigint; cidr: number; label: string };

export function validateNetwork(devices: NetDevice[]): NetIssue[] {
  const issues: NetIssue[] = [];
  const ips = new Map<string, string>();
  const macs = new Map<string, string>();
  const hosts = new Map<string, string>();
  const subnets: TrackedSubnet[] = [];

  for (const device of devices) {
    for (const iface of device.interfaces) {
      const raw = iface.address.trim();
      const address = iface.mode === "dhcp" || !raw ? null : parseIpv4(raw);
      const ipv6 = address == null && iface.mode === "static" && raw ? parseIpv6(raw) : null;
      if (iface.mode === "static" && raw && address == null && ipv6 == null) {
        const kind = raw.includes(":") ? "IPv6" : "IPv4";
        issues.push({ level: "error", code: "invalid-address", deviceId: device.id, message: `${device.label} ${iface.name} is not an ${kind} address.` });
      }
      const prefixMax = ipv6 == null ? 32 : 128;
      if (ipv6 == null && iface.gateway.trim() && parseIpv4(iface.gateway) == null) {
        issues.push({ level: "error", code: "invalid-address", deviceId: device.id, message: `${device.label} gateway is not an IPv4 address.` });
      }
      if (ipv6 != null && iface.gateway.trim()) {
        const gateway4 = parseIpv4(iface.gateway);
        const gateway6 = gateway4 == null ? parseIpv6(iface.gateway) : null;
        if (gateway6 == null) {
          issues.push({
            level: "error",
            code: "invalid-address",
            deviceId: device.id,
            message: gateway4 == null ? `${device.label} gateway is not an IPv6 address.` : `${device.label} gateway is an IPv4 address on an IPv6 interface.`,
          });
        }
      }
      if (iface.cidr != null && (iface.cidr < 0 || iface.cidr > prefixMax || !Number.isInteger(iface.cidr))) {
        issues.push({ level: "error", code: "invalid-address", deviceId: device.id, message: `${device.label} ${iface.name} mask is not a CIDR prefix.` });
      }
      if (iface.mac.trim() && !MAC.test(iface.mac.trim())) {
        issues.push({ level: "error", code: "duplicate-mac", deviceId: device.id, message: `${device.label} MAC ${iface.mac} is not six colon-separated octets.` });
      }
      if (address != null && iface.cidr != null) {
        const network = networkOf(address, iface.cidr);
        const hostBits = 32 - iface.cidr;
        const hostMask = hostBits >= 32 ? 0xffffffff : (2 ** hostBits - 1) >>> 0;
        const broadcast = (network | hostMask) >>> 0;
        if (iface.cidr < 31 && (address === network || address === broadcast)) {
          issues.push({
            level: "error",
            code: "outside-subnet",
            deviceId: device.id,
            message: `${device.label} ${formatIpv4(address)} is the network or broadcast address of /${iface.cidr}.`,
          });
        }
        const gateway = parseIpv4(iface.gateway);
        if (gateway != null && !inSubnet(gateway, network, iface.cidr)) {
          issues.push({
            level: "error",
            code: "gateway-outside",
            deviceId: device.id,
            message: `${device.label} gateway ${iface.gateway} is outside ${formatIpv4(network)}/${iface.cidr}.`,
          });
        }
        subnets.push({ family: 4, deviceId: device.id, vlan: iface.vlan, network, cidr: iface.cidr, label: device.label });
        const key = formatIpv4(address);
        const prior = ips.get(key);
        if (prior) issues.push({ level: "error", code: "duplicate-ip", deviceId: device.id, message: `${key} is used by ${prior} and ${device.label}.` });
        else ips.set(key, device.label);
      }
      if (ipv6 != null && iface.cidr != null && iface.cidr >= 0 && iface.cidr <= 128) {
        const network = networkOf6(ipv6, iface.cidr);
        if (iface.cidr < 127 && ipv6 === network) {
          issues.push({
            level: "error",
            code: "outside-subnet",
            deviceId: device.id,
            message: `${device.label} ${formatIpv6(ipv6)} is the subnet-router anycast of /${iface.cidr}.`,
          });
        }
        const gateway = parseIpv6(iface.gateway);
        if (gateway != null && networkOf6(gateway, iface.cidr) !== network) {
          issues.push({
            level: "error",
            code: "gateway-outside",
            deviceId: device.id,
            message: `${device.label} gateway ${iface.gateway} is outside ${formatIpv6(network)}/${iface.cidr}.`,
          });
        }
        subnets.push({ family: 6, deviceId: device.id, vlan: iface.vlan, network, cidr: iface.cidr, label: device.label });
        const key = formatIpv6(ipv6);
        const prior = ips.get(key);
        if (prior) issues.push({ level: "error", code: "duplicate-ip", deviceId: device.id, message: `${key} is used by ${prior} and ${device.label}.` });
        else ips.set(key, device.label);
      }
      const mac = iface.mac.trim().toLowerCase();
      if (MAC.test(mac)) {
        const prior = macs.get(mac);
        if (prior) issues.push({ level: "error", code: "duplicate-mac", deviceId: device.id, message: `MAC ${mac} is used by ${prior} and ${device.label}.` });
        else macs.set(mac, device.label);
      }
      const host = iface.hostname.trim().toLowerCase();
      if (host) {
        const prior = hosts.get(host);
        if (prior) issues.push({ level: "error", code: "duplicate-hostname", deviceId: device.id, message: `Hostname ${host} is used by ${prior} and ${device.label}.` });
        else hosts.set(host, device.label);
      }
    }
  }

  for (let i = 0; i < subnets.length; i += 1) {
    for (let j = i + 1; j < subnets.length; j += 1) {
      const a = subnets[i];
      const b = subnets[j];
      if (!a || !b || a.deviceId === b.deviceId || a.family !== b.family) continue;
      const wider = a.cidr <= b.cidr ? a : b;
      const narrower = a.cidr <= b.cidr ? b : a;
      const same = a.network === b.network && a.cidr === b.cidr;
      const overlap = a.family === 4
        ? inSubnet(narrower.network as number, wider.network as number, wider.cidr) && !same
        : networkOf6(narrower.network as bigint, wider.cidr) === (wider.network as bigint) && !same;
      const text = (item: TrackedSubnet) => item.family === 4 ? `${formatIpv4(item.network)}/${item.cidr}` : `${formatIpv6(item.network)}/${item.cidr}`;
      if (overlap) {
        issues.push({
          level: "warning",
          code: "overlapping-subnets",
          deviceId: narrower.deviceId,
          message: `${a.label} ${text(a)} overlaps ${b.label} ${text(b)}.`,
        });
      }
      if (same && a.vlan != null && b.vlan != null && a.vlan !== b.vlan) {
        issues.push({
          level: "warning",
          code: "vlan-mismatch",
          deviceId: b.deviceId,
          message: `${text(a)} is VLAN ${a.vlan} on ${a.label} and VLAN ${b.vlan} on ${b.label}.`,
        });
      }
    }
  }
  return issues;
}

export function groupNetwork(devices: NetDevice[]): NetGroup[] {
  const groups = new Map<string, NetGroup>();
  for (const device of devices) {
    for (const iface of device.interfaces) {
      const address = iface.mode === "static" ? parseIpv4(iface.address) : null;
      const ipv6 = address == null && iface.mode === "static" ? parseIpv6(iface.address) : null;
      const subnet = address != null && iface.cidr != null
        ? `${formatIpv4(networkOf(address, iface.cidr))}/${iface.cidr}`
        : ipv6 != null && iface.cidr != null
          ? `${formatIpv6(networkOf6(ipv6, iface.cidr))}/${iface.cidr}`
          : iface.mode === "dhcp"
            ? "DHCP"
            : "Unaddressed";
      const vlan = iface.vlan == null ? "No VLAN" : `VLAN ${iface.vlan}`;
      const key = `${vlan}|${subnet}`;
      const group = groups.get(key) ?? { vlan, subnet, devices: [] };
      group.devices.push({ id: device.id, label: device.label, address: iface.address || iface.mode, hostname: iface.hostname });
      groups.set(key, group);
    }
  }
  return [...groups.values()].sort((a, b) => a.vlan.localeCompare(b.vlan) || a.subnet.localeCompare(b.subnet));
}

export function networkToCsv(devices: NetDevice[]): string {
  const header = ["device", "interface", "mode", "address", "cidr", "gateway", "vlan", "mac", "hostname"];
  const lines = [header.join(",")];
  for (const device of devices) {
    for (const iface of device.interfaces) {
      lines.push(
        [device.label, iface.name, iface.mode, iface.address, iface.cidr ?? "", iface.gateway, iface.vlan ?? "", iface.mac, iface.hostname]
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(","),
      );
    }
  }
  return lines.join("\n");
}

export const NETWORK_SCHEMA = "pvllc.network/1.0.0";

export function networkDocument(show: string, devices: NetDevice[]) {
  return { schema: NETWORK_SCHEMA, show, devices };
}
