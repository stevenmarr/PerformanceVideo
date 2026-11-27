/** A flat custom module: name, maker, category, jacks, and one network record per IP jack. */

import { isNetworkSignal, migratePorts, blankPort, type NetworkPort } from "../network/schema.ts";

export type PortDraft = {
  id: string;
  label: string;
  direction: "input" | "output";
  signal: string;
  connector: string;
};

export type SystemDraft = {
  id?: number;
  name: string;
  manufacturer: string;
  modelNumber: string;
  category: string;
  notes: string;
  ports: PortDraft[];
  network: NetworkPort[];
};

export function emptyDraft(category = "Switcher"): SystemDraft {
  return {
    name: "",
    manufacturer: "",
    modelNumber: "",
    category,
    notes: "",
    ports: [{ id: "pin-1", label: "", direction: "input", signal: "", connector: "" }],
    network: [],
  };
}

export function duplicateDraft(draft: SystemDraft): SystemDraft {
  const name = draft.name.trim();
  return {
    ...draft,
    id: undefined,
    name: name ? `${name} copy` : "",
    ports: draft.ports.map((port) => ({ ...port })),
    network: draft.network.map((port) => blankPort(port)),
  };
}

export function notesForDraft(draft: SystemDraft): string {
  const model = draft.modelNumber.trim();
  const body = draft.notes.trim();
  const line = model ? `Model ${model}` : "";
  return [line, body].filter(Boolean).join(". ").slice(0, 500);
}

export function syncNetworkToPorts(ports: PortDraft[], network: NetworkPort[]): NetworkPort[] {
  const wanted = ports.filter((port) => isNetworkSignal(port.signal) && port.label.trim());
  const kept: NetworkPort[] = [];
  for (const port of wanted) {
    const prior = network.find((item) => item.name === port.label.trim());
    kept.push(prior ? { ...blankPort(prior), name: port.label.trim() } : blankPort({ name: port.label.trim(), role: "control" }));
  }
  return kept;
}

export function validateDraft(draft: SystemDraft, signals: string[]): string | null {
  if (!draft.name.trim()) return "Name the module.";
  if (!draft.manufacturer.trim()) return "Name the manufacturer. Use Unbranded if it is a one-off.";
  if (!draft.category.trim()) return "Pick a category.";
  const known = new Set(signals);
  const labels = new Set<string>();
  let jacks = 0;
  for (const port of draft.ports) {
    if (!port.label.trim() && !port.signal.trim()) continue;
    if (!port.label.trim() || !port.signal.trim()) return "Each jack needs a name and a signal.";
    if (!known.has(port.signal)) return `${port.label} needs a signal from the library.`;
    if (labels.has(port.label.trim())) return `${port.label} is used twice.`;
    labels.add(port.label.trim());
    jacks += 1;
  }
  if (!jacks) return "Add at least one jack.";
  return null;
}

export type InstanceNode = {
  id: string;
  data: {
    equipmentId: number;
    model: string;
    manufacturer: string;
    deviceType: string;
    kind: string;
    color: string;
    pins: { id: string; label: string; direction: "input" | "output"; signal: string; connector?: string }[];
    custom?: boolean;
  };
};

export type DefinitionPatch = {
  equipmentId: number;
  model: string;
  manufacturer: string;
  deviceType: string;
  kind: string;
  color: string;
  pins: InstanceNode["data"]["pins"];
};

/** "All" rewrites every box of this module. "One" points a single box at a new library row. */
export function applyDefinition<N extends InstanceNode>(
  nodes: N[],
  definition: DefinitionPatch,
  scope: { mode: "all"; fromId: number } | { mode: "one"; nodeId: string },
): { nodes: N[]; updated: number } {
  let updated = 0;
  const next = nodes.map((node) => {
    const hit =
      scope.mode === "all" ? node.data.equipmentId === scope.fromId : node.id === scope.nodeId;
    if (!hit) return node;
    updated += 1;
    return {
      ...node,
      data: {
        ...node.data,
        equipmentId: definition.equipmentId,
        model: definition.model,
        manufacturer: definition.manufacturer,
        deviceType: definition.deviceType,
        kind: definition.kind,
        color: definition.color,
        pins: definition.pins,
        custom: true,
      },
    };
  });
  return { nodes: next, updated };
}

export function draftNetwork(raw: unknown): NetworkPort[] {
  return migratePorts(raw);
}
