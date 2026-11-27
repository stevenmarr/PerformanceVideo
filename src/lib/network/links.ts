/** VLAN and subnet checks for an Ethernet cable between two ports. */

import type { NetDevice, NetIssue } from "./address.ts";
import { formatIpv4, networkOf, parseIpv4, parseIpv6, networkOf6 } from "./address.ts";

export type NetLink = {
  id: string;
  sourceId: string;
  sourcePort: string;
  targetId: string;
  targetPort: string;
};

function findPort(device: NetDevice | undefined, portName: string) {
  if (!device) return null;
  const needle = portName.trim().toLowerCase();
  return device.interfaces.find((iface) => iface.name.trim().toLowerCase() === needle) ?? (device.interfaces.length === 1 ? device.interfaces[0] : null);
}

export function validateLinks(devices: NetDevice[], links: NetLink[]): NetIssue[] {
  const byId = new Map(devices.map((device) => [device.id, device]));
  const issues: NetIssue[] = [];
  for (const link of links) {
    const source = byId.get(link.sourceId);
    const target = byId.get(link.targetId);
    const left = findPort(source, link.sourcePort);
    const right = findPort(target, link.targetPort);
    if (!left || !right || !source || !target) continue;
    if (left.vlan != null && right.vlan != null && left.vlan !== right.vlan) {
      issues.push({
        level: "error",
        code: "link-vlan-mismatch",
        deviceId: target.id,
        message: `${source.label} ${left.name} is VLAN ${left.vlan} and ${target.label} ${right.name} is VLAN ${right.vlan}. A direct link needs the same VLAN.`,
      });
    }
    const left4 = left.mode === "static" ? parseIpv4(left.address) : null;
    const right4 = right.mode === "static" ? parseIpv4(right.address) : null;
    if (left4 != null && right4 != null && left.cidr != null && right.cidr != null) {
      const a = `${formatIpv4(networkOf(left4, left.cidr))}/${left.cidr}`;
      const b = `${formatIpv4(networkOf(right4, right.cidr))}/${right.cidr}`;
      if (a !== b) {
        issues.push({
          level: "error",
          code: "link-subnet-mismatch",
          deviceId: target.id,
          message: `${source.label} is on ${a} and ${target.label} is on ${b}. They will not talk on this link.`,
        });
      }
    }
    const left6 = left4 == null && left.mode === "static" ? parseIpv6(left.address) : null;
    const right6 = right4 == null && right.mode === "static" ? parseIpv6(right.address) : null;
    if (left6 != null && right6 != null && left.cidr != null && right.cidr != null) {
      const a = `${networkOf6(left6, left.cidr).toString(16)}/${left.cidr}`;
      const b = `${networkOf6(right6, right.cidr).toString(16)}/${right.cidr}`;
      if (a !== b) {
        issues.push({
          level: "error",
          code: "link-subnet-mismatch",
          deviceId: target.id,
          message: `${source.label} and ${target.label} are on different IPv6 prefixes.`,
        });
      }
    }
  }
  return issues;
}
