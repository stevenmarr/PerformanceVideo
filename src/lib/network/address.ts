/** IPv4 checks for per-device interfaces. IPv6 is left for a later pass. */

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

export function networkOf(address: number, cidr: number): number {
  const mask = cidr === 0 ? 0 : (0xffffffff << (32 - cidr)) >>> 0;
  return (address & mask) >>> 0;
}

export function inSubnet(address: number, network: number, cidr: number): boolean {
  return networkOf(address, cidr) === network;
}

export function validateNetwork(devices: NetDevice[]): NetIssue[] {
  const issues: NetIssue[] = [];
  const ips = new Map<string, string>();
  const macs = new Map<string, string>();
  const hosts = new Map<string, string>();
  const subnets: { deviceId: string; vlan: number | null; network: number; cidr: number; label: string }[] = [];

  for (const device of devices) {
    for (const iface of device.interfaces) {
      const address = iface.mode === "dhcp" ? null : parseIpv4(iface.address);
      if (iface.mode === "static" && iface.address.trim() && address == null) {
        issues.push({ level: "error", code: "invalid-address", deviceId: device.id, message: `${device.label} ${iface.name} is not an IPv4 address.` });
      }
      if (iface.gateway.trim() && parseIpv4(iface.gateway) == null) {
        issues.push({ level: "error", code: "invalid-address", deviceId: device.id, message: `${device.label} gateway is not an IPv4 address.` });
      }
      if (iface.cidr != null && (iface.cidr < 0 || iface.cidr > 32 || !Number.isInteger(iface.cidr))) {
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
        subnets.push({ deviceId: device.id, vlan: iface.vlan, network, cidr: iface.cidr, label: device.label });
        const key = formatIpv4(address);
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
      if (!a || !b || a.deviceId === b.deviceId) continue;
      const wider = a.cidr <= b.cidr ? a : b;
      const narrower = a.cidr <= b.cidr ? b : a;
      const overlap = inSubnet(narrower.network, wider.network, wider.cidr) && !(a.network === b.network && a.cidr === b.cidr);
      if (overlap) {
        issues.push({
          level: "warning",
          code: "overlapping-subnets",
          deviceId: narrower.deviceId,
          message: `${a.label} ${formatIpv4(a.network)}/${a.cidr} overlaps ${b.label} ${formatIpv4(b.network)}/${b.cidr}.`,
        });
      }
      if (a.network === b.network && a.cidr === b.cidr && a.vlan != null && b.vlan != null && a.vlan !== b.vlan) {
        issues.push({
          level: "warning",
          code: "vlan-mismatch",
          deviceId: b.deviceId,
          message: `${formatIpv4(a.network)}/${a.cidr} is VLAN ${a.vlan} on ${a.label} and VLAN ${b.vlan} on ${b.label}.`,
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
      const subnet = address != null && iface.cidr != null ? `${formatIpv4(networkOf(address, iface.cidr))}/${iface.cidr}` : iface.mode === "dhcp" ? "DHCP" : "Unaddressed";
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
