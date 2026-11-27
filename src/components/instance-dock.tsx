import type { FormEvent } from "react";
import { Badge, Button, Field, HelpPane } from "@/components/ui/kit";
import { HELP } from "@/lib/help/copy";

export function InstanceDock({
  side,
  manufacturer,
  model,
  kind,
  unitId,
  ip,
  notes,
  custom = false,
  readOnly = false,
  onUnitId,
  onIp,
  onNotes,
  onEdit,
  onDuplicate,
}: {
  side: "bottom" | "side";
  manufacturer: string;
  model: string;
  kind: string;
  unitId: string;
  ip: string;
  notes: string;
  custom?: boolean;
  readOnly?: boolean;
  onUnitId: (value: string) => void;
  onIp: (value: string) => void;
  onNotes: (value: string) => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
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
      <div className="flex items-center gap-2">
        <p className="ui-kicker">This box</p>
        {custom || kind === "system" ? <Badge tone="custom">Custom</Badge> : <Badge tone="builtin">Built-in</Badge>}
      </div>
      <p className="mt-1 text-sm font-semibold">
        {manufacturer} {model}
      </p>
      <HelpPane title="This box">{HELP.unitId}</HelpPane>
      <div className="mt-3 space-y-2">
        <Field label="Unit ID" help={HELP.unitId}>
          <input className="ui-input" value={unitId} readOnly={readOnly} onChange={(event) => onUnitId(event.target.value)} />
        </Field>
        <Field label="IP address" help={HELP.ip}>
          <input className="ui-input" value={ip} readOnly={readOnly} placeholder="10.10.10.21" onChange={(event) => onIp(event.target.value)} />
        </Field>
        <Field label="Special notes" help={HELP.notes}>
          <input className="ui-input" value={notes} readOnly={readOnly} onChange={(event) => onNotes(event.target.value)} />
        </Field>
      </div>
      {!readOnly && (onEdit || onDuplicate) ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {onEdit ? <Button onClick={onEdit}>Edit module</Button> : null}
          {onDuplicate ? <Button onClick={onDuplicate}>Duplicate module</Button> : null}
        </div>
      ) : null}
    </form>
  );
}
