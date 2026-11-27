/** Fill empty static addresses from a show VLAN plan. Existing addresses stay. */

import type { NetDevice } from "./address.ts";
import { formatIpv4, parseIpv4 } from "./address.ts";
import { blankPort, cidrToMask, slugHost, type NetworkPort, type NicRole } from "./schema.ts";

export type VlanPlan = {
  role: NicRole;
  vlan: number;
  network: string;
  cidr: number;
  gateway: string;
};

export const DEFAULT_PLAN: VlanPlan[] = [
  { role: "management", vlan: 10, network: "10.10.10.0", cidr: 24, gateway: "10.10.10.1" },
  { role: "media", vlan: 20, network: "10.10.20.0", cidr: 24, gateway: "10.10.20.1" },
  { role: "control", vlan: 30, network: "10.10.30.0", cidr: 24, gateway: "10.10.30.1" },
];

export type PlanResult = {
  devices: NetDevice[];
  assigned: number;
  kept: number;
};

function hostAddress(network: string, cidr: number, host: number): string | null {
  const base = parseIpv4(network);
  if (base == null || cidr < 1 || cidr > 30) return null;
  const size = 2 ** (32 - cidr);
  if (host <= 0 || host >= size - 1) return null;
  return formatIpv4((base + host) >>> 0);
}

export function assignAddressPlan(devices: NetDevice[], plans: VlanPlan[] = DEFAULT_PLAN): PlanResult {
  const used = new Set<string>();
  for (const device of devices) {
    for (const iface of device.interfaces) {
      if (iface.mode === "static" && iface.address.trim()) used.add(iface.address.trim());
    }
  }
  const nextHost = new Map<NicRole, number>();
  for (const plan of plans) nextHost.set(plan.role, 10);
  let assigned = 0;
  let kept = 0;
  const next = devices.map((device) => ({
    ...device,
    interfaces: device.interfaces.map((iface) => {
      const port = blankPort(iface as Partial<NetworkPort>);
      const plan = plans.find((item) => item.role === port.role) ?? plans[0];
      if (!plan) return port;
      if (port.mode === "dhcp") {
        kept += 1;
        return port;
      }
      if (port.address.trim()) {
        kept += 1;
        if (port.vlan == null) port.vlan = plan.vlan;
        if (!port.mask && port.cidr != null) port.mask = cidrToMask(port.cidr);
        return port;
      }
      let host = nextHost.get(plan.role) ?? 10;
      let address: string | null = null;
      while (host < 250) {
        const candidate = hostAddress(plan.network, plan.cidr, host);
        host += 1;
        if (!candidate || used.has(candidate) || candidate === plan.gateway) continue;
        address = candidate;
        break;
      }
      nextHost.set(plan.role, host);
      if (!address) return port;
      used.add(address);
      assigned += 1;
      return {
        ...port,
        mode: "static" as const,
        address,
        cidr: plan.cidr,
        mask: cidrToMask(plan.cidr),
        gateway: port.gateway.trim() || plan.gateway,
        vlan: port.vlan ?? plan.vlan,
        hostname: port.hostname.trim() || slugHost(device.label, port.name),
      };
    }),
  }));
  return { devices: next, assigned, kept };
}
