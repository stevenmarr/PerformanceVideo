/**
 * Network templates for the built-in live-production modules.
 * A control LAN is added only where the rear panel is known to have one.
 * Video jack counts are not guessed here.
 */

import type { GearPin, GearSeed } from "../corporate-nodes.ts";
import { blankPort, isNetworkSignal, slugHost, type NetworkPort, type NicRole } from "./schema.ts";

export type ControlProfile = {
  protocol: string;
  port: number | null;
  role: NicRole;
};

/** Models whose control jack was missing from the patch map. */
export const CONTROL_LAN: Record<string, ControlProfile> = {
  "ATEM Mini Pro": { protocol: "ATEM", port: 9910, role: "control" },
  "ATEM Television Studio HD8": { protocol: "ATEM", port: 9910, role: "control" },
  "Smart Videohub 40x40 12G": { protocol: "Videohub", port: 9990, role: "control" },
  "Smart Videohub 20x20 12G": { protocol: "Videohub", port: 9990, role: "control" },
  "V-8HD": { protocol: "Roland", port: 80, role: "control" },
  VX1000: { protocol: "HTTP", port: 80, role: "control" },
  "MX40 Pro": { protocol: "HTTP", port: 80, role: "control" },
  Fx4: { protocol: "HTTP", port: 80, role: "control" },
  "ImagePRO-4K": { protocol: "HTTP", port: 80, role: "control" },
  "Aquilon RS6": { protocol: "AWJ", port: 80, role: "control" },
  "PT-RZ21K": { protocol: "PJLink", port: 4352, role: "control" },
  "SmartView Duo": { protocol: "Blackmagic", port: null, role: "control" },
  "AW-UE160": { protocol: "Panasonic AW", port: 80, role: "control" },
  "AW-UE150": { protocol: "Panasonic AW", port: 80, role: "control" },
  "AW-UE80": { protocol: "Panasonic AW", port: 80, role: "control" },
  "AW-HE130": { protocol: "Panasonic AW", port: 80, role: "control" },
  "ILME-FR7": { protocol: "VISCA over IP", port: 52381, role: "control" },
  "BRC-AM7": { protocol: "VISCA over IP", port: 52381, role: "control" },
  "Tessera SX40": { protocol: "HTTP", port: 80, role: "management" },
};

const LAN_PIN: GearPin = ["LAN", "output", "Ethernet"];

export function withControlLan(pins: GearPin[], model: string): GearPin[] {
  if (!CONTROL_LAN[model]) return pins;
  if (pins.some((pin) => isNetworkSignal(pin[2]))) return pins;
  return [...pins, LAN_PIN];
}

export function applyModuleFixes(sample: GearSeed): GearSeed {
  return { ...sample, pins: withControlLan(sample.pins, sample.model) };
}

type PinLike = { label: string; signal: string };

export function networkTemplates(model: string, pins: PinLike[]): NetworkPort[] {
  const profile = CONTROL_LAN[model];
  return pins.filter((pin) => isNetworkSignal(pin.signal)).map((pin) =>
    blankPort({
      name: pin.label || "LAN",
      role: profile?.role ?? "management",
      mode: "static",
      address: "",
      cidr: 24,
      gateway: "",
      vlan: null,
      controlProtocol: profile?.protocol ?? "",
      controlPort: profile?.port ?? null,
      mediaTransport: "",
      multicast: [],
    }),
  );
}

/** A new box gets the module's NIC roles, not another box's address. */
export function freshInterfaces(model: string, pins: PinLike[], unitId: string, saved?: NetworkPort[]): NetworkPort[] {
  const source = saved?.length ? saved : networkTemplates(model, pins);
  return source.map((port) => blankPort({ ...port, address: "", mac: "", hostname: slugHost(unitId, port.name) }));
}

export type ModuleAudit = { model: string; problems: string[] };

export function auditModules(gear: GearSeed[]): ModuleAudit[] {
  const reports: ModuleAudit[] = [];
  for (const sample of gear) {
    const fixed = applyModuleFixes(sample);
    const problems: string[] = [];
    const labels = new Set<string>();
    for (const [label, direction, signal] of fixed.pins) {
      if (!label.trim()) problems.push("A jack has no name.");
      if (direction !== "input" && direction !== "output") problems.push(`${label} has no direction.`);
      if (!signal.trim()) problems.push(`${label} has no signal.`);
      if (labels.has(label)) problems.push(`${label} is listed twice.`);
      labels.add(label);
    }
    if (CONTROL_LAN[sample.model] && !fixed.pins.some((pin) => isNetworkSignal(pin[2]))) {
      problems.push("Control LAN is still missing.");
    }
    const ports = networkTemplates(sample.model, fixed.pins.map(([label, , signal]) => ({ label, signal })));
    if (fixed.pins.some((pin) => isNetworkSignal(pin[2])) && ports.length === 0) {
      problems.push("Ethernet jack has no network template.");
    }
    for (const port of ports) {
      if (!port.role) problems.push(`${port.name} has no NIC role.`);
      if (port.mediaTransport && port.multicast.length === 0 && port.mediaTransport !== "ndi") {
        problems.push(`${port.name} ${port.mediaTransport} has no multicast group.`);
      }
    }
    if (problems.length) reports.push({ model: sample.model, problems });
  }
  return reports;
}
