/** Follow a signal from one source and add up latency along every path. */

export type TimedDevice = {
  id: string;
  label: string;
  latencyMs: number;
  latencyFrames: number;
  estimate: boolean;
  format: string;
};

export type TimedEdge = {
  id: string;
  source: string;
  target: string;
  format: string;
};

export type PathResult = {
  deviceId: string;
  label: string;
  edgeIds: string[];
  latencyMs: number;
  latencyFrames: number;
  estimate: boolean;
  broken: boolean;
};

export type SignalWarning = {
  code: "format-mismatch" | "broken-path" | "estimate";
  message: string;
  deviceId: string;
};

export type Propagation = {
  sourceId: string;
  paths: PathResult[];
  warnings: SignalWarning[];
};

const DEFAULT_MS = 0;
const DEFAULT_FRAMES = 1;

export function deviceTiming(partial: Partial<TimedDevice> & { id: string; label: string }): TimedDevice {
  return {
    id: partial.id,
    label: partial.label,
    latencyMs: Number.isFinite(partial.latencyMs) ? Number(partial.latencyMs) : DEFAULT_MS,
    latencyFrames: Number.isFinite(partial.latencyFrames) ? Number(partial.latencyFrames) : DEFAULT_FRAMES,
    estimate: partial.estimate !== false,
    format: partial.format ?? "",
  };
}

export function propagate(sourceId: string, devices: TimedDevice[], edges: TimedEdge[]): Propagation {
  const byId = new Map(devices.map((device) => [device.id, device]));
  const warnings: SignalWarning[] = [];
  const outgoing = new Map<string, TimedEdge[]>();
  for (const edge of edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target)) {
      warnings.push({
        code: "broken-path",
        deviceId: byId.has(edge.source) ? edge.target : edge.source,
        message: `Cable ${edge.id} is missing a device.`,
      });
      continue;
    }
    const list = outgoing.get(edge.source) ?? [];
    list.push(edge);
    outgoing.set(edge.source, list);
  }
  const source = byId.get(sourceId);
  if (!source) {
    return {
      sourceId,
      paths: [],
      warnings: [{ code: "broken-path", deviceId: sourceId, message: "That source is not on the drawing." }],
    };
  }

  const paths: PathResult[] = [];
  const queue: { id: string; edgeIds: string[]; ms: number; frames: number; estimate: boolean; format: string }[] = [
    {
      id: source.id,
      edgeIds: [],
      ms: source.latencyMs,
      frames: source.latencyFrames,
      estimate: source.estimate,
      format: source.format,
    },
  ];
  const seen = new Set<string>();
  while (queue.length) {
    const current = queue.shift();
    if (!current || seen.has(current.id)) continue;
    seen.add(current.id);
    const device = byId.get(current.id);
    if (!device) continue;
    if (current.id !== sourceId) {
      paths.push({
        deviceId: device.id,
        label: device.label,
        edgeIds: current.edgeIds,
        latencyMs: current.ms,
        latencyFrames: current.frames,
        estimate: current.estimate,
        broken: false,
      });
    }
    if (current.estimate) {
      warnings.push({
        code: "estimate",
        deviceId: device.id,
        message: `${device.label} latency is an estimate.`,
      });
    }
    for (const edge of outgoing.get(current.id) ?? []) {
      const next = byId.get(edge.target);
      if (!next) continue;
      if (current.format && edge.format && current.format !== edge.format) {
        warnings.push({
          code: "format-mismatch",
          deviceId: next.id,
          message: `${device.label} is ${current.format} and the cable to ${next.label} is ${edge.format}.`,
        });
      }
      queue.push({
        id: next.id,
        edgeIds: [...current.edgeIds, edge.id],
        ms: current.ms + next.latencyMs,
        frames: current.frames + next.latencyFrames,
        estimate: current.estimate || next.estimate,
        format: edge.format || next.format || current.format,
      });
    }
  }
  return { sourceId, paths, warnings };
}

export { DEFAULT_FRAMES, DEFAULT_MS };
