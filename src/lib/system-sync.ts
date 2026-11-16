/**
 * Custom systems saved from a drawing group, and how a later edit of one
 * updates every instance already on the show.
 */
export type SystemPin = {
  id: string;
  label: string;
  direction: "input" | "output";
  signal: string;
};

export const SYSTEMS_CUSTOM = "Systems (custom)";

export function isCustomSystem(item: { kind: string }): boolean {
  return item.kind === "system";
}

export function libraryGroupName(item: { kind: string; deviceType: string }): string {
  return isCustomSystem(item) ? SYSTEMS_CUSTOM : item.deviceType;
}

export function equipmentTypeNames(equipment: { kind: string; deviceType: string }[]): string[] {
  const types = new Set<string>();
  let hasSystems = false;
  for (const item of equipment) {
    if (isCustomSystem(item)) hasSystems = true;
    else types.add(item.deviceType);
  }
  const list = [...types].sort((a, b) => a.localeCompare(b));
  if (hasSystems) list.unshift(SYSTEMS_CUSTOM);
  return list;
}

export function equipmentOfType<T extends { kind: string; deviceType: string }>(
  equipment: T[],
  typeName: string,
): T[] {
  if (typeName === SYSTEMS_CUSTOM) return equipment.filter((item) => isCustomSystem(item));
  return equipment.filter((item) => !isCustomSystem(item) && item.deviceType === typeName);
}

export type SystemPortRef = { id: string; nodeId: string; pinId: string };
export type SystemGraphNode = { id: string; equipmentId: number };

export function exposedPinsFromPorts(
  ports: SystemPortRef[],
  nodes: SystemGraphNode[],
  pinsByEquipment: Map<number, SystemPin[]>,
): SystemPin[] {
  const byNode = new Map(nodes.map((node) => [node.id, node]));
  const pins: SystemPin[] = [];
  for (const port of ports) {
    const node = byNode.get(port.nodeId);
    if (!node) continue;
    const inner = pinsByEquipment.get(node.equipmentId)?.find((pin) => pin.id === port.pinId);
    if (!inner) continue;
    pins.push({
      id: port.id,
      label: inner.label,
      direction: inner.direction,
      signal: inner.signal,
    });
  }
  return pins;
}

export type SystemDefinition = {
  id: number;
  model: string;
  manufacturer: string;
  deviceType: string;
  kind: string;
  color: string;
  pins: SystemPin[];
};

export type SyncableNode = {
  id: string;
  data: {
    equipmentId: number;
    pins: SystemPin[];
    model: string;
    manufacturer: string;
    deviceType: string;
    kind: string;
    color: string;
  };
};

export type SyncableEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

export type SyncSystemResult<N extends SyncableNode, E extends SyncableEdge> = {
  nodes: N[];
  edges: E[];
  updatedInstances: number;
  removedCables: number;
};

export function syncSystemInstances<N extends SyncableNode, E extends SyncableEdge>(
  nodes: N[],
  edges: E[],
  system: SystemDefinition,
): SyncSystemResult<N, E> {
  const updated = new Set<string>();
  const nextNodes = nodes.map((node) => {
    if (node.data.equipmentId !== system.id) return node;
    updated.add(node.id);
    return {
      ...node,
      data: {
        ...node.data,
        model: system.model,
        manufacturer: system.manufacturer,
        deviceType: system.deviceType,
        kind: system.kind,
        color: system.color,
        pins: system.pins,
      },
    };
  });
  if (!updated.size) {
    return { nodes, edges, updatedInstances: 0, removedCables: 0 };
  }
  const pinsByNode = new Map(
    nextNodes.filter((node) => updated.has(node.id)).map((node) => [node.id, new Set(node.data.pins.map((pin) => pin.id))]),
  );
  const nextEdges: E[] = [];
  let removedCables = 0;
  for (const edge of edges) {
    const sourcePins = pinsByNode.get(edge.source);
    const targetPins = pinsByNode.get(edge.target);
    if (sourcePins && edge.sourceHandle && !sourcePins.has(edge.sourceHandle)) {
      removedCables += 1;
      continue;
    }
    if (targetPins && edge.targetHandle && !targetPins.has(edge.targetHandle)) {
      removedCables += 1;
      continue;
    }
    nextEdges.push(edge);
  }
  return { nodes: nextNodes, edges: nextEdges, updatedInstances: updated.size, removedCables };
}

export function systemUpdateHint(model: string, updatedInstances: number, removedCables: number): string {
  if (!updatedInstances) return "Back on the show.";
  const box = updatedInstances === 1 ? `${model} updated on the show.` : `${updatedInstances} ${model} boxes updated on the show.`;
  if (!removedCables) return box;
  const cable = removedCables === 1 ? "1 cable was dropped because that jack is gone." : `${removedCables} cables were dropped because those jacks are gone.`;
  return `${box} ${cable}`;
}
