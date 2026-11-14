import type { FormEvent } from "react";

export function InstanceDock({
  side,
  manufacturer,
  model,
  kind,
  unitId,
  ip,
  notes,
  readOnly = false,
  onUnitId,
  onIp,
  onNotes,
}: {
  side: "bottom" | "side";
  manufacturer: string;
  model: string;
  kind: string;
  unitId: string;
  ip: string;
  notes: string;
  readOnly?: boolean;
  onUnitId: (value: string) => void;
  onIp: (value: string) => void;
  onNotes: (value: string) => void;
}) {
  const docked =
    side === "side"
      ? "h-full w-80 shrink-0 overflow-y-auto border-l border-line bg-panel p-4 text-ink"
      : "max-h-[min(22rem,45dvh)] shrink-0 overflow-y-auto border-t border-line bg-panel p-4 text-ink";
  return (
    <form
      aria-label="This instance"
      className={docked}
      onSubmit={(event: FormEvent) => event.preventDefault()}
    >
      <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">This instance</p>
      <p className="mt-1 text-sm font-semibold">
        {manufacturer} {model}
      </p>
      {kind === "system" ? <p className="text-xs text-muted">System. The pull list counts it as one unit.</p> : null}
      <label className="mt-3 block text-sm">
        Unit ID
        <input
          className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-ink outline-none"
          value={unitId}
          readOnly={readOnly}
          onChange={(event) => onUnitId(event.target.value)}
        />
      </label>
      <label className="mt-2 block text-sm">
        IP address
        <input
          className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-ink outline-none"
          value={ip}
          readOnly={readOnly}
          placeholder="192.168.0.175"
          onChange={(event) => onIp(event.target.value)}
        />
      </label>
      <label className="mt-2 block text-sm">
        Special notes
        <input
          className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-ink outline-none"
          value={notes}
          readOnly={readOnly}
          onChange={(event) => onNotes(event.target.value)}
        />
      </label>
    </form>
  );
}
