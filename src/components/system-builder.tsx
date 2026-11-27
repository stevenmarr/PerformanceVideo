import { useMemo, useState } from "react";
import { Button, Dialog, Field, HelpPane } from "@/components/ui/kit";
import { HELP } from "@/lib/help/copy";
import {
  duplicateDraft,
  emptyDraft,
  notesForDraft,
  syncNetworkToPorts,
  validateDraft,
  type SystemDraft,
} from "@/lib/library/custom-system";
import { MEDIA_TRANSPORTS, NIC_ROLES, blankPort } from "@/lib/network/schema";

export type BuilderSave = {
  draft: SystemDraft;
  scope: "all" | "one";
};

export function SystemBuilder({
  initial,
  categories,
  manufacturers,
  signals,
  placed = false,
  onClose,
  onSave,
}: {
  initial?: SystemDraft;
  categories: string[];
  manufacturers: string[];
  signals: string[];
  placed?: boolean;
  onClose: () => void;
  onSave: (save: BuilderSave) => Promise<string | null>;
}) {
  const [draft, setDraft] = useState<SystemDraft>(initial ?? emptyDraft(categories[0] ?? "Switcher"));
  const [scope, setScope] = useState<"all" | "one">("all");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const network = useMemo(() => syncNetworkToPorts(draft.ports, draft.network), [draft.ports, draft.network]);

  function patch(partial: Partial<SystemDraft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  async function save() {
    const next = { ...draft, network };
    const problem = validateDraft(next, signals);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    const message = await onSave({ draft: next, scope: draft.id && placed ? scope : "all" });
    setBusy(false);
    if (message) setError(message);
  }

  return (
    <Dialog title={draft.id ? "Edit module" : "Build a module"} onClose={onClose}>
      <HelpPane title="What this builds">{HELP.customName} {HELP.scopeAll}</HelpPane>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Name" help={HELP.customName}>
          <input className="ui-input" value={draft.name} onChange={(event) => patch({ name: event.target.value })} />
        </Field>
        <Field label="Manufacturer" help={HELP.customMaker}>
          <input className="ui-input" list="builder-makers" value={draft.manufacturer} onChange={(event) => patch({ manufacturer: event.target.value })} />
          <datalist id="builder-makers">
            {manufacturers.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </Field>
        <Field label="Model number" help={HELP.customModel}>
          <input className="ui-input" value={draft.modelNumber} onChange={(event) => patch({ modelNumber: event.target.value })} />
        </Field>
        <Field label="Category" help={HELP.customCategory}>
          <select className="ui-select" value={draft.category} onChange={(event) => patch({ category: event.target.value })}>
            {categories.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Notes" help={HELP.notes}>
        <textarea className="ui-input mt-1 min-h-16" value={draft.notes} onChange={(event) => patch({ notes: event.target.value })} />
      </Field>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm font-semibold">Jacks</p>
        <Button onClick={() => patch({ ports: [...draft.ports, { id: `pin-${draft.ports.length + 1}`, label: "", direction: "input", signal: signals[0] ?? "", connector: "" }] })}>Add jack</Button>
      </div>
      <ul className="mt-2 space-y-2">
        {draft.ports.map((port, index) => (
          <li key={port.id} className="grid gap-2 rounded-xl border border-line p-2 sm:grid-cols-5">
            <Field label="Name" help={HELP.customPort}>
              <input className="ui-input" value={port.label} onChange={(event) => patch({ ports: draft.ports.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) })} />
            </Field>
            <Field label="Direction" help="Input takes a cable. Output sends one.">
              <select className="ui-select" value={port.direction} onChange={(event) => patch({ ports: draft.ports.map((item, itemIndex) => itemIndex === index ? { ...item, direction: event.target.value === "output" ? "output" : "input" } : item) })}>
                <option value="input">Input</option>
                <option value="output">Output</option>
              </select>
            </Field>
            <Field label="Signal" help="Has to match a signal color already in the library.">
              <select className="ui-select" value={port.signal} onChange={(event) => patch({ ports: draft.ports.map((item, itemIndex) => itemIndex === index ? { ...item, signal: event.target.value } : item) })}>
                <option value="">Pick</option>
                {signals.map((signal) => (
                  <option key={signal} value={signal}>{signal}</option>
                ))}
              </select>
            </Field>
            <Field label="Connector" help={HELP.connector}>
              <input className="ui-input" value={port.connector} placeholder="BNC" onChange={(event) => patch({ ports: draft.ports.map((item, itemIndex) => itemIndex === index ? { ...item, connector: event.target.value } : item) })} />
            </Field>
            <Button variant="danger" onClick={() => patch({ ports: draft.ports.filter((_, itemIndex) => itemIndex !== index) })}>Remove</Button>
          </li>
        ))}
      </ul>
      {network.length ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-semibold">Network jacks</p>
          {network.map((port, index) => (
            <div key={port.name} className="grid gap-2 sm:grid-cols-3">
              <Field label={port.name} help={HELP.role}>
                <select className="ui-select" value={port.role} onChange={(event) => {
                  const next = network.map((item, itemIndex) => itemIndex === index ? blankPort({ ...item, role: event.target.value as typeof port.role }) : item);
                  patch({ network: next });
                }}>
                  {NIC_ROLES.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </Field>
              <Field label="Protocol" help={HELP.protocol}>
                <input className="ui-input" value={port.controlProtocol} onChange={(event) => patch({ network: network.map((item, itemIndex) => itemIndex === index ? { ...item, controlProtocol: event.target.value } : item) })} />
              </Field>
              <Field label="Transport" help={HELP.transport}>
                <select className="ui-select" value={port.mediaTransport} onChange={(event) => patch({ network: network.map((item, itemIndex) => itemIndex === index ? { ...item, mediaTransport: event.target.value as typeof port.mediaTransport } : item) })}>
                  {MEDIA_TRANSPORTS.map((item) => (
                    <option key={item || "none"} value={item}>{item || "None"}</option>
                  ))}
                </select>
              </Field>
            </div>
          ))}
        </div>
      ) : null}
      {draft.id && placed ? (
        <fieldset className="mt-4 space-y-1 text-sm">
          <legend className="font-semibold">Where should this land?</legend>
          <label className="flex gap-2" title={HELP.scopeAll}><input type="radio" checked={scope === "all"} onChange={() => setScope("all")} /> Update every box of this module</label>
          <label className="flex gap-2" title={HELP.scopeOne}><input type="radio" checked={scope === "one"} onChange={() => setScope("one")} /> Only the selected box</label>
        </fieldset>
      ) : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="primary" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save for review"}</Button>
        {!draft.id ? <Button onClick={() => setDraft(duplicateDraft(draft))}>Duplicate this draft</Button> : null}
        <p className="self-center text-xs text-muted">{notesForDraft(draft) ? "Notes will include the model number." : ""}</p>
      </div>
    </Dialog>
  );
}
