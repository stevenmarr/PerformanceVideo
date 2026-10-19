import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { GearNodeCard } from "@/components/gear-node";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  addConnectionType,
  addDeviceType,
  addEquipment,
  addManufacturer,
  deleteConnectionType,
  deleteDeviceType,
  deleteEquipment,
  deleteManufacturer,
  getCatalog,
  updateConnectionType,
  updateDeviceType,
  updateEquipment,
  updateManufacturer,
  type Catalog,
  type EquipmentRow,
} from "@/lib/catalog.functions";

export const Route = createFileRoute("/library")({ component: LibraryPage });

const inputClass =
  "mt-1 w-full rounded-xl border border-line bg-panel px-3 py-3 text-ink outline-none focus:border-ink";

const KINDS = [
  ["device", "Device"],
  ["converter", "Converter"],
  ["splitter", "Splitter"],
  ["distribution", "Distribution amp"],
  ["adapter", "Adapter"],
  ["system", "System"],
] as const;

type Tab = "gear" | "signals" | "types" | "makers";

function LibraryPage() {
  const { user, isPending } = useCurrentUserState();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("gear");

  async function refresh() {
    const next = await getCatalog();
    setCatalog(next);
  }

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    getCatalog()
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch(() => {
        if (!cancelled) setError("The library could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (isPending) {
    return (
      <AppShell>
        <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-line" />
      </AppShell>
    );
  }
  if (!user) return <RedirectToSignIn />;

  return (
    <AppShell>
      <p className="text-xs font-semibold tracking-[0.22em] text-muted uppercase">Library</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Equipment and signals</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Saved models are on the left. Build or edit one on the right, including its connections and how the box will look
        on the drawing.
      </p>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      {!catalog ? (
        <div className="mt-8 h-40 animate-pulse rounded-[var(--radius-card)] bg-line" />
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            {(
              [
                ["gear", "Gear"],
                ["signals", "Signals"],
                ["types", "Types"],
                ["makers", "Manufacturers"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={
                  tab === id
                    ? "rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper"
                    : "rounded-full border border-line bg-panel px-4 py-2 text-sm font-medium text-muted"
                }
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-8">
            {tab === "gear" ? <GearPanel catalog={catalog} onChange={refresh} /> : null}
            {tab === "signals" ? <SignalPanel catalog={catalog} onChange={refresh} /> : null}
            {tab === "types" ? <TypePanel catalog={catalog} onChange={refresh} /> : null}
            {tab === "makers" ? <MakerPanel catalog={catalog} onChange={refresh} /> : null}
          </div>
        </>
      )}
    </AppShell>
  );
}

function Notice({ error, status }: { error: string; status: string }) {
  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (status) return <p className="text-sm">{status}</p>;
  return null;
}

function GearPanel({ catalog, onChange }: { catalog: Catalog; onChange: () => Promise<void> }) {
  const [deviceTypeId, setDeviceTypeId] = useState(catalog.deviceTypes[0]?.id ?? 0);
  const [manufacturerId, setManufacturerId] = useState(catalog.manufacturers[0]?.id ?? 0);
  const [model, setModel] = useState("");
  const [kind, setKind] = useState<string>("device");
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState("");
  const [pins, setPins] = useState([{ label: "", direction: "input", signal: catalog.connectionTypes[0]?.name ?? "" }]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const grouped = new Map<string, EquipmentRow[]>();
  for (const item of catalog.equipment) {
    const list = grouped.get(item.deviceType) ?? [];
    list.push(item);
    grouped.set(item.deviceType, list);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setStatus("");
    const payload = {
      deviceTypeId: Number(deviceTypeId),
      manufacturerId: Number(manufacturerId),
      model,
      kind,
      notes,
      website,
      pins,
    };
    const result = editingId
      ? await updateEquipment({ data: { ...payload, id: editingId } })
      : await addEquipment({ data: payload });
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditingId(null);
    setModel("");
    setNotes("");
    setWebsite("");
    setPins([{ label: "", direction: "input", signal: catalog.connectionTypes[0]?.name ?? "" }]);
    setStatus(editingId ? "Model updated." : "Saved. It can be placed on the drawing.");
    await onChange();
  }

  function startEdit(item: EquipmentRow) {
    setError("");
    setStatus("");
    setEditingId(item.id);
    setDeviceTypeId(item.deviceTypeId);
    setManufacturerId(item.manufacturerId);
    setModel(item.model);
    setKind(item.kind);
    setNotes(item.notes);
    setWebsite(item.productWebsite);
    setPins(
      item.pins.length
        ? item.pins.map((pin) => ({ label: pin.label, direction: pin.direction, signal: pin.signal }))
        : [{ label: "", direction: "input", signal: catalog.connectionTypes[0]?.name ?? "" }],
    );
  }

  async function remove(id: number) {
    const result = await deleteEquipment({ data: id });
    if (result.error) setError(result.error);
    else {
      if (editingId === id) setEditingId(null);
      await onChange();
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <form onSubmit={onSubmit} className="order-1 space-y-4 rounded-[var(--radius-card)] border border-line bg-panel p-5 lg:order-2">
        <h2 className="text-lg font-semibold">{editingId ? "Edit model" : "New model"}</h2>
        <label className="block text-sm">
          <span className="font-medium">Device type</span>
          <select className={inputClass} value={deviceTypeId} onChange={(event) => setDeviceTypeId(Number(event.target.value))}>
            {catalog.deviceTypes.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Manufacturer</span>
          <select className={inputClass} value={manufacturerId} onChange={(event) => setManufacturerId(Number(event.target.value))}>
            {catalog.manufacturers.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Model</span>
          <input className={inputClass} value={model} onChange={(event) => setModel(event.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Kind of box</span>
          <select className={inputClass} value={kind} onChange={(event) => setKind(event.target.value)}>
            {KINDS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Notes</span>
          <input className={inputClass} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Product website</span>
          <input className={inputClass} value={website} onChange={(event) => setWebsite(event.target.value)} />
        </label>
        <div className="space-y-3">
          <p className="text-sm font-medium">Connections</p>
          <p className="text-sm text-muted">Shown while you build or edit the model. The list below stays to the name.</p>
          {pins.map((pin, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[1fr_7rem_1fr_auto]">
              <input
                aria-label="Connection name"
                className={inputClass}
                placeholder="Connection name"
                value={pin.label}
                onChange={(event) =>
                  setPins((current) => current.map((row, i) => (i === index ? { ...row, label: event.target.value } : row)))
                }
              />
              <select
                aria-label="Direction"
                className={inputClass}
                value={pin.direction}
                onChange={(event) =>
                  setPins((current) =>
                    current.map((row, i) => (i === index ? { ...row, direction: event.target.value } : row)),
                  )
                }
              >
                <option value="input">Input</option>
                <option value="output">Output</option>
              </select>
              <select
                aria-label="Signal"
                className={inputClass}
                value={pin.signal}
                onChange={(event) =>
                  setPins((current) => current.map((row, i) => (i === index ? { ...row, signal: event.target.value } : row)))
                }
              >
                {catalog.connectionTypes.map((signal) => (
                  <option key={signal.id} value={signal.name}>
                    {signal.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="mt-1 rounded-xl px-3 py-3 text-sm text-danger"
                onClick={() => setPins((current) => current.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-sm font-semibold underline underline-offset-4"
            onClick={() =>
              setPins((current) => [
                ...current,
                { label: "", direction: "output", signal: catalog.connectionTypes[0]?.name ?? "" },
              ])
            }
          >
            Add connection
          </button>
        </div>
        <div className="max-h-[32rem] overflow-auto rounded-xl border border-line bg-paper p-4">
          <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-muted uppercase">On the drawing</p>
          <GearNodeCard
            deviceType={catalog.deviceTypes.find((row) => row.id === deviceTypeId)?.name ?? ""}
            manufacturer={catalog.manufacturers.find((row) => row.id === manufacturerId)?.name ?? ""}
            model={model}
            notes={notes}
            color={catalog.deviceTypes.find((row) => row.id === deviceTypeId)?.color ?? "#3f3a34"}
            pins={pins.filter((pin) => pin.label || pin.signal)}
            signalColors={Object.fromEntries(catalog.connectionTypes.map((signal) => [signal.name, signal.color]))}
          />
        </div>
        <Notice error={error} status={status} />
        <button type="submit" className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper">
          {editingId ? "Save changes" : "Save model"}
        </button>
        {editingId ? (
          <button
            type="button"
            className="ml-3 text-sm text-muted underline underline-offset-4"
            onClick={() => {
              setEditingId(null);
              setModel("");
              setNotes("");
              setWebsite("");
              setStatus("");
            }}
          >
            Cancel
          </button>
        ) : null}
      </form>
      <div className="order-2 space-y-6 lg:order-1">
        {catalog.equipment.length === 0 ? (
          <p className="text-sm text-muted">No models yet. Save one, then place it on the drawing.</p>
        ) : null}
        {[...grouped.entries()].map(([typeName, items]) => (
          <section key={typeName}>
            <h2 className="text-sm font-semibold tracking-[0.16em] text-muted uppercase">{typeName}</h2>
            <ul className="mt-3 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-panel">
              {items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-4 px-4 py-4">
                  <div>
                    <p className="font-semibold">
                      {item.manufacturer} {item.model}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {KINDS.find(([value]) => value === item.kind)?.[1] ?? item.kind}
                    </p>
                    {item.notes ? <p className="mt-1 text-sm">{item.notes}</p> : null}
                  </div>
                  <div className="flex shrink-0 gap-3">
                    <button type="button" className="py-2 text-sm font-semibold" onClick={() => startEdit(item)}>
                      Edit
                    </button>
                    <button type="button" className="py-2 text-sm text-danger" onClick={() => remove(item.id)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function SignalPanel({ catalog, onChange }: { catalog: Catalog; onChange: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#e7e5e4");
  const [specLevel, setSpecLevel] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<{ id: number; name: string; color: string; specLevel: string } | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setStatus("");
    const result = await addConnectionType({ data: { name, color, specLevel } });
    if (result.error) {
      setError(result.error);
      return;
    }
    setName("");
    setSpecLevel("");
    setStatus("Signal added.");
    await onChange();
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setError("");
    const result = await updateConnectionType({ data: editing });
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditing(null);
    setStatus("Signal updated.");
    await onChange();
  }

  async function remove(id: number) {
    setError("");
    const result = await deleteConnectionType({ data: id });
    if (result.error) setError(result.error);
    else await onChange();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <form onSubmit={onSubmit} className="order-1 space-y-4 rounded-[var(--radius-card)] border border-line bg-panel p-5 lg:order-2">
        <h2 className="text-lg font-semibold">New signal</h2>
        <label className="block text-sm">
          <span className="font-medium">Name</span>
          <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Wire color</span>
          <input className={`${inputClass} h-12`} type="color" value={color} onChange={(event) => setColor(event.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Spec</span>
          <input className={inputClass} value={specLevel} placeholder="HDMI 2.0, 12G-SDI" onChange={(event) => setSpecLevel(event.target.value)} />
        </label>
        <Notice error={error} status={status} />
        <button type="submit" className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper">
          Save signal
        </button>
      </form>
      <ul className="order-2 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-panel lg:order-1">
        {catalog.connectionTypes.map((row) => (
          <li key={row.id} className="px-4 py-4">
            {editing?.id === row.id ? (
              <form onSubmit={saveEdit} className="grid gap-2 sm:grid-cols-[1fr_4.5rem_1fr_auto]">
                <input className={inputClass} aria-label="Signal name" value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
                <input className={`${inputClass} h-12`} aria-label="Wire color" type="color" value={editing.color} onChange={(event) => setEditing({ ...editing, color: event.target.value })} />
                <input className={inputClass} aria-label="Spec" value={editing.specLevel} onChange={(event) => setEditing({ ...editing, specLevel: event.target.value })} />
                <div className="flex gap-3">
                  <button type="submit" className="text-sm font-semibold">Save</button>
                  <button type="button" className="text-sm text-muted" onClick={() => setEditing(null)}>Cancel</button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="h-4 w-4 rounded-full border border-line" style={{ background: row.color }} />
                  <div>
                    <p className="font-semibold">{row.name}</p>
                    <p className="text-sm text-muted">{row.specLevel || "No spec"}</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-3">
                  <button type="button" className="py-2 text-sm font-semibold" onClick={() => setEditing({ id: row.id, name: row.name, color: row.color, specLevel: row.specLevel })}>
                    Edit
                  </button>
                  <button type="button" className="py-2 text-sm text-danger" onClick={() => remove(row.id)}>
                    Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TypePanel({ catalog, onChange }: { catalog: Catalog; onChange: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#8a847c");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<{ id: number; name: string; color: string } | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setStatus("");
    const result = await addDeviceType({ data: { name, color } });
    if (result.error) {
      setError(result.error);
      return;
    }
    setName("");
    setStatus("Type added.");
    await onChange();
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setError("");
    const result = await updateDeviceType({ data: editing });
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditing(null);
    setStatus("Type updated.");
    await onChange();
  }

  async function remove(id: number) {
    setError("");
    const result = await deleteDeviceType({ data: id });
    if (result.error) setError(result.error);
    else await onChange();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <form onSubmit={onSubmit} className="order-1 space-y-4 rounded-[var(--radius-card)] border border-line bg-panel p-5 lg:order-2">
        <h2 className="text-lg font-semibold">New device type</h2>
        <label className="block text-sm">
          <span className="font-medium">Name</span>
          <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Banner color</span>
          <input className={`${inputClass} h-12`} type="color" value={color} onChange={(event) => setColor(event.target.value)} />
        </label>
        <Notice error={error} status={status} />
        <button type="submit" className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper">
          Save type
        </button>
      </form>
      <ul className="order-2 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-panel lg:order-1">
        {catalog.deviceTypes.map((row) => (
          <li key={row.id} className="px-4 py-4">
            {editing?.id === row.id ? (
              <form onSubmit={saveEdit} className="flex flex-wrap items-center gap-3">
                <input className={inputClass} aria-label="Type name" value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
                <input className={`${inputClass} h-12 w-20`} aria-label="Banner color" type="color" value={editing.color} onChange={(event) => setEditing({ ...editing, color: event.target.value })} />
                <button type="submit" className="text-sm font-semibold">Save</button>
                <button type="button" className="text-sm text-muted" onClick={() => setEditing(null)}>Cancel</button>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="h-4 w-4 rounded-full border border-line" style={{ background: row.color }} />
                  <p className="font-semibold">{row.name}</p>
                </div>
                <div className="flex shrink-0 gap-3">
                  <button type="button" className="py-2 text-sm font-semibold" onClick={() => setEditing({ id: row.id, name: row.name, color: row.color })}>
                    Edit
                  </button>
                  <button type="button" className="py-2 text-sm text-danger" onClick={() => remove(row.id)}>
                    Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MakerPanel({ catalog, onChange }: { catalog: Catalog; onChange: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<{ id: number; name: string; website: string } | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setStatus("");
    const result = await addManufacturer({ data: { name, website } });
    if (result.error) {
      setError(result.error);
      return;
    }
    setName("");
    setWebsite("");
    setStatus("Manufacturer added.");
    await onChange();
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setError("");
    const result = await updateManufacturer({ data: editing });
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditing(null);
    setStatus("Manufacturer updated.");
    await onChange();
  }

  async function remove(id: number) {
    setError("");
    const result = await deleteManufacturer({ data: id });
    if (result.error) setError(result.error);
    else await onChange();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <form onSubmit={onSubmit} className="order-1 space-y-4 rounded-[var(--radius-card)] border border-line bg-panel p-5 lg:order-2">
        <h2 className="text-lg font-semibold">New manufacturer</h2>
        <label className="block text-sm">
          <span className="font-medium">Name</span>
          <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Website</span>
          <input className={inputClass} value={website} onChange={(event) => setWebsite(event.target.value)} />
        </label>
        <Notice error={error} status={status} />
        <button type="submit" className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper">
          Save manufacturer
        </button>
      </form>
      <ul className="order-2 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-panel lg:order-1">
        {catalog.manufacturers.map((row) => (
          <li key={row.id} className="px-4 py-4">
            {editing?.id === row.id ? (
              <form onSubmit={saveEdit} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input className={inputClass} aria-label="Manufacturer" value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
                <input className={inputClass} aria-label="Website" value={editing.website} onChange={(event) => setEditing({ ...editing, website: event.target.value })} />
                <div className="flex gap-3">
                  <button type="submit" className="text-sm font-semibold">Save</button>
                  <button type="button" className="text-sm text-muted" onClick={() => setEditing(null)}>Cancel</button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{row.name}</p>
                  <p className="text-sm text-muted">{row.website || "No website"}</p>
                </div>
                <div className="flex shrink-0 gap-3">
                  <button type="button" className="py-2 text-sm font-semibold" onClick={() => setEditing({ id: row.id, name: row.name, website: row.website })}>
                    Edit
                  </button>
                  <button type="button" className="py-2 text-sm text-danger" onClick={() => remove(row.id)}>
                    Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
