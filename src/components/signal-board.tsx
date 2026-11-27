import { useEffect, useState } from "react";
import { Button, Field, HelpPane } from "@/components/ui/kit";
import { HELP } from "@/lib/help/copy";
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
    <div className="absolute inset-0 z-20 overflow-auto bg-paper p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="ui-kicker">Latency</p>
          <h2 className="text-lg font-semibold">Signal</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => setPlaying(true)}>Play</Button>
          <Button onClick={onClose}>Back to drawing</Button>
        </div>
      </div>
      <HelpPane title="How the path is timed">{HELP.signal}</HelpPane>
      {!devices.length ? <p className="mt-4 text-sm text-muted">Place a source before running the path.</p> : null}
      <div className="mt-3 max-w-sm">
        <Field label="Source" help="The box where this path starts. Downstream delay adds up from here.">
          <select className="ui-select" value={sourceId} onChange={(event) => setSourceId(event.target.value)}>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>{device.label}</option>
            ))}
          </select>
        </Field>
      </div>
      {selected ? (
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Field label="Milliseconds" help="Measured glass-to-glass for this box. Replaces the estimate.">
            <input className="ui-input w-28" value={selected.latencyMs} aria-label="Latency milliseconds" onChange={(event) => onTiming(selected.id, { latencyMs: Number(event.target.value) || 0, estimate: false })} />
          </Field>
          <Field label="Frames" help="Frame delay at the show format. 1 frame at 59.94 is about 16.7 ms.">
            <input className="ui-input w-24" value={selected.latencyFrames} aria-label="Latency frames" onChange={(event) => onTiming(selected.id, { latencyFrames: Number(event.target.value) || 0, estimate: false })} />
          </Field>
          <Field label="Format" help="The raster this path is timed at, such as 1080p59.94 or 2160p60.">
            <input className="ui-input" value={selected.format} placeholder="1080p59.94" onChange={(event) => onTiming(selected.id, { format: event.target.value })} />
          </Field>
          {selected.estimate ? <span className="self-center text-xs text-muted">Estimate</span> : null}
        </div>
      ) : null}
      <ul className="mt-4 space-y-2">
        {result.paths.map((path) => (
          <li key={path.deviceId} className="rounded-xl border border-line px-3 py-2 text-sm">
            <span className="font-semibold">{path.label}</span>
            {path.via ? <span className="text-muted"> · {path.via}</span> : null}
            <span className="text-muted"> · {path.latencyMs} ms · {path.latencyFrames} frames</span>
            {path.estimate ? <span className="text-muted"> · estimate</span> : null}
            {path.caution ? <span className="text-danger"> · {path.caution}</span> : null}
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
