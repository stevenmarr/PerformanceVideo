import { Handle, Position } from "@xyflow/react";

export type CardPin = {
  id?: string;
  label: string;
  direction: "input" | "output" | string;
  signal: string;
};

export function inkOn(hex: string): string {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return "#f3efe6";
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  const y = (r * 299 + g * 587 + b * 114) / 1000;
  return y > 160 ? "#111111" : "#f3efe6";
}

export function gearNodeSize(
  pins: { direction: string }[],
  extra?: { ip?: string; notes?: string },
) {
  const inputs = pins.filter((pin) => pin.direction === "input").length;
  const outputs = pins.filter((pin) => pin.direction === "output").length;
  const rows = Math.max(inputs, outputs, 1);
  const detail = (extra?.ip ? 18 : 0) + (extra?.notes ? 32 : 0);
  return { width: 256, height: 108 + detail + rows * 32 + 8 };
}

export function GearNodeCard({
  deviceType,
  manufacturer,
  model,
  instanceId,
  unitId,
  ip,
  notes,
  specialNotes,
  color,
  pins,
  signalColors,
  wired = false,
  selected = false,
}: {
  deviceType: string;
  manufacturer: string;
  model: string;
  instanceId?: string;
  unitId?: string;
  ip?: string;
  notes?: string;
  specialNotes?: string;
  color: string;
  pins: CardPin[];
  signalColors: Record<string, string>;
  wired?: boolean;
  selected?: boolean;
}) {
  const inputs = pins.filter((pin) => pin.direction === "input");
  const outputs = pins.filter((pin) => pin.direction === "output");
  const rows = Math.max(inputs.length, outputs.length, 1);
  const unit = unitId || instanceId;
  const detail = specialNotes || notes;

  return (
    <div
      className={`w-64 overflow-visible rounded-xl border bg-panel text-ink shadow-sm ${selected ? "border-ink" : "border-line"}`}
    >
      <div
        className="flex items-center justify-between gap-2 rounded-t-xl px-3 py-2 text-xs font-semibold tracking-[0.14em] uppercase"
        style={{ background: color, color: inkOn(color) }}
      >
        <span className="min-w-0 truncate">{deviceType || "Device"}</span>
        {selected ? (
          <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-semibold tracking-normal text-ink normal-case">
            Selected
          </span>
        ) : null}
      </div>
      <div className="px-3 pt-2 pb-1">
        <p className="truncate text-sm font-semibold leading-tight">{manufacturer || "Manufacturer"}</p>
        <p className="truncate text-sm leading-tight">{model || "Model"}</p>
        {unit ? <p className="truncate text-xs font-semibold text-ink">{unit}</p> : null}
        {ip ? <p className="truncate text-xs text-muted">{ip}</p> : null}
        {detail ? <p className="mt-1 line-clamp-2 text-xs text-muted">{detail}</p> : null}
      </div>
      <div className="relative" style={{ height: rows * 32 + 8 }}>
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="absolute right-0 left-0 flex" style={{ top: 8 + index * 32, height: 28 }}>
            <div className="relative flex w-1/2 min-w-0 items-center gap-1">
              {inputs[index] ? (
                <PinRow pin={inputs[index]} side="input" color={signalColors[inputs[index].signal] ?? "#e7e5e4"} wired={wired} />
              ) : null}
            </div>
            <div className="relative flex w-1/2 min-w-0 items-center justify-end gap-1">
              {outputs[index] ? (
                <PinRow pin={outputs[index]} side="output" color={signalColors[outputs[index].signal] ?? "#e7e5e4"} wired={wired} />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PinRow({
  pin,
  side,
  color,
  wired,
}: {
  pin: CardPin;
  side: "input" | "output";
  color: string;
  wired: boolean;
}) {
  const dot = (
    <span className="h-3 w-3 shrink-0 rounded-full border" style={{ background: color, borderColor: color }} />
  );
  const label = `${pin.label || "Connection"} · ${pin.signal || "Signal"}`;
  return (
    <>
      {side === "input" && wired ? (
        <Handle
          type="target"
          position={Position.Left}
          id={pin.id}
          style={{ background: color, borderColor: color, width: 12, height: 12, left: -6 }}
        />
      ) : null}
      {side === "input" && !wired ? <span className="ml-1">{dot}</span> : null}
      <span className={`min-w-0 truncate px-2 text-xs leading-tight ${side === "input" ? "text-left" : "text-right"}`} title={label}>
        {pin.label || "Connection"}
        <span style={{ color }}> · {pin.signal || "Signal"}</span>
      </span>
      {side === "output" && !wired ? <span className="mr-1">{dot}</span> : null}
      {side === "output" && wired ? (
        <Handle
          type="source"
          position={Position.Right}
          id={pin.id}
          style={{ background: color, borderColor: color, width: 12, height: 12, right: -6 }}
        />
      ) : null}
    </>
  );
}
