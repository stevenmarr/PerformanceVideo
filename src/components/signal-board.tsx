import { useEffect, useState } from "react";
import { propagate, type TimedDevice, type TimedEdge } from "@/lib/signal/propagate";

export function SignalBoard({
  devices,
  edges,
  onTiming,
  onClose,
  onActive,
}: {
  devices: TimedDevice[];
  edges: TimedEdge[];
  onTiming: (id: string, patch: Partial<TimedDevice>) => void;
  onClose: () => void;
  onActive: (edgeIds: string[]) => void;
}) {
  const [sourceId, setSourceId] = useState(devices[0]?.id ?? "");
  const [playing, setPlaying] = useState(false);
  const result = propagate(sourceId, devices, edges);
  const selected = devices.find((device) => device.id === sourceId) ?? devices[0];

  useEffect(() => {
    if (!playing) return;
    const order = result.paths.flatMap((path) => path.edgeIds);
    const unique = [...new Set(order)];
    let step = 0;
    onActive([]);
    const timer = window.setInterval(() => {
      step += 1;
      onActive(unique.slice(0, step));
      if (step >= unique.length) {
        window.clearInterval(timer);
        setPlaying(false);
      }
    }, 350);
    return () => window.clearInterval(timer);
  }, [playing, sourceId]);

  return (
    <div className="absolute inset-0 z-20 overflow-auto bg-paper/95 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Signal</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Pick a source. Latency defaults are estimates until you type a measured value. The total includes every device on the path.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper" onClick={() => setPlaying(true)}>
            Play
          </button>
          <button type="button" className="rounded-full border border-line px-4 py-2 text-sm" onClick={onClose}>
            Back to drawing
          </button>
        </div>
      </div>
      <label className="text-sm">
        Source
        <select value={sourceId} onChange={(event) => setSourceId(event.target.value)} className="ml-2 rounded-lg border border-line bg-panel px-2 py-1">
          {devices.map((device) => (
            <option key={device.id} value={device.id}>{device.label}</option>
          ))}
        </select>
      </label>
      {selected ? (
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <input
            value={selected.latencyMs}
            onChange={(event) => onTiming(selected.id, { latencyMs: Number(event.target.value) || 0, estimate: false })}
            className="w-24 rounded-lg border border-line bg-panel px-2 py-1"
            aria-label="Latency milliseconds"
          />
          <span className="self-center text-muted">ms</span>
          <input
            value={selected.latencyFrames}
            onChange={(event) => onTiming(selected.id, { latencyFrames: Number(event.target.value) || 0, estimate: false })}
            className="w-20 rounded-lg border border-line bg-panel px-2 py-1"
            aria-label="Latency frames"
          />
          <span className="self-center text-muted">frames</span>
          <input
            value={selected.format}
            onChange={(event) => onTiming(selected.id, { format: event.target.value })}
            placeholder="Format"
            className="rounded-lg border border-line bg-panel px-2 py-1"
          />
          {selected.estimate ? <span className="self-center text-xs text-muted">Estimate</span> : null}
        </div>
      ) : null}
      <ul className="mt-4 space-y-2">
        {result.paths.map((path) => (
          <li key={path.deviceId} className="rounded-xl border border-line px-3 py-2 text-sm">
            <span className="font-semibold">{path.label}</span>
            <span className="text-muted"> · {path.latencyMs} ms · {path.latencyFrames} frames</span>
            {path.estimate ? <span className="text-muted"> · estimate</span> : null}
          </li>
        ))}
        {!result.paths.length ? <li className="text-sm text-muted">Nothing is downstream of that source.</li> : null}
      </ul>
      {result.warnings.length ? (
        <ul className="mt-4 space-y-1 text-sm text-danger">
          {result.warnings.filter((warning) => warning.code !== "estimate").map((warning) => (
            <li key={`${warning.code}-${warning.deviceId}-${warning.message}`}>{warning.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
