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

export const GEAR_NODE_WIDTH = 256;

const BORDER = 1;
const HEADER = 36;
const BODY_PAD_TOP = 8;
const LINE = 18;
const BODY_PAD_BOTTOM = 6;
const NOTE = 34;
const PIN_PAD = 8;
const PIN_ROW = 32;
const PIN_ROW_H = 28;

export type GearExtras = { ip?: string; notes?: string; unit?: string };

function bodyHeight(extra?: GearExtras): number {
  const lines = 2 + (extra?.unit ? 1 : 0) + (extra?.ip ? 1 : 0);
  return BODY_PAD_TOP + lines * LINE + (extra?.notes ? NOTE : 0) + BODY_PAD_BOTTOM;
}

export function gearNodeSize(pins: { direction: string }[], extra?: GearExtras) {
  const inputs = pins.filter((pin) => pin.direction === "input").length;
  const outputs = pins.filter((pin) => pin.direction === "output").length;
  const rows = Math.max(inputs, outputs, 1);
  return { width: GEAR_NODE_WIDTH, height: BORDER + HEADER + bodyHeight(extra) + PIN_PAD + rows * PIN_ROW + BORDER };
}

/** Jack position relative to the node origin. Outputs sit on the right edge, inputs on the left. */
export function jackOffset(
  pins: { id?: string; direction: string }[],
  pinId: string,
  extra?: GearExtras,
): { x: number; y: number } | null {
  const inputs = pins.filter((pin) => pin.direction === "input");
  const outputs = pins.filter((pin) => pin.direction === "output");
  let index = inputs.findIndex((pin) => pin.id === pinId);
  let side: "input" | "output" | null = index >= 0 ? "input" : null;
  if (side == null) {
    index = outputs.findIndex((pin) => pin.id === pinId);
    if (index >= 0) side = "output";
  }
  if (side == null || index < 0) return null;
  return {
    x: side === "input" ? 0 : GEAR_NODE_WIDTH,
    y: BORDER + HEADER + bodyHeight(extra) + PIN_PAD + index * PIN_ROW + PIN_ROW_H / 2,
  };
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
  const chrome = bodyHeight({ ip, notes: detail, unit });

  return (
    <div
      className={`w-64 overflow-visible rounded-xl border bg-panel text-ink shadow-sm ${selected ? "border-ink" : "border-line"}`}
    >
      <div
        className="flex items-center justify-between gap-2 rounded-t-xl px-3 text-xs font-semibold tracking-[0.14em] uppercase"
        style={{ background: color, color: inkOn(color), height: HEADER }}
      >
        <span className="min-w-0 truncate">{deviceType || "Device"}</span>
        {pins.some((pin) => /unverified|count unknown/i.test(pin.label)) ? (
          <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-semibold tracking-normal text-ink normal-case">
            Unverified
          </span>
        ) : null}
        {selected ? (
          <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-semibold tracking-normal text-ink normal-case">
            Selected
          </span>
        ) : null}
      </div>
      <div className="overflow-hidden px-3" style={{ height: chrome, paddingTop: BODY_PAD_TOP }}>
        <p className="truncate text-sm font-semibold" style={{ lineHeight: `${LINE}px` }}>{manufacturer || "Manufacturer"}</p>
        <p className="truncate text-sm" style={{ lineHeight: `${LINE}px` }}>{model || "Model"}</p>
        {unit ? <p className="truncate text-xs font-semibold text-ink" style={{ lineHeight: `${LINE}px` }}>{unit}</p> : null}
        {ip ? <p className="truncate text-xs text-muted" style={{ lineHeight: `${LINE}px` }}>{ip}</p> : null}
        {detail ? (
          <p className="line-clamp-2 text-xs text-muted" style={{ height: NOTE - 2, marginTop: 2, lineHeight: "16px" }}>
            {detail}
          </p>
        ) : null}
      </div>
      <div className="relative" style={{ height: PIN_PAD + rows * PIN_ROW }}>
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="absolute right-0 left-0 flex" style={{ top: PIN_PAD + index * PIN_ROW, height: PIN_ROW_H }}>
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
