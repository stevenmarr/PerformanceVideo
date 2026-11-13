import { useEffect, useState } from "react";
import {
  adminDeleteDevice,
  adminDevices,
  adminSaveDevice,
  type DeviceDefinitionRow,
} from "@/lib/admin/manage.functions";

const empty = {
  id: "",
  ownerUserId: "",
  manufacturer: "",
  model: "",
  family: "",
  category: "",
  notes: "",
  portsJson: "[]",
  unverified: true,
};

export function DevicesPanel() {
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("global");
  const [rows, setRows] = useState<DeviceDefinitionRow[]>([]);
  const [form, setForm] = useState(empty);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function load(nextOwner = owner, nextSearch = search) {
    const result = await adminDevices({ data: { search: nextSearch, owner: nextOwner } });
    setRows(result.devices);
  }

  useEffect(() => {
    void load().catch(() => setError("The device library could not be loaded."));
  }, []);

  return (
    <div className="mt-6 space-y-6">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void load().catch(() => setError("The search failed."));
        }}
      >
        <select value={owner} onChange={(event) => setOwner(event.target.value)} className="rounded-xl border border-line bg-panel px-3 py-2 text-sm">
          <option value="global">Global library</option>
          <option value="">Every definition</option>
        </select>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Manufacturer, model, family, category" className="min-w-64 flex-1 rounded-xl border border-line bg-panel px-3 py-2 text-sm" />
        <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper">Search</button>
      </form>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {note ? <p className="text-sm">{note}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
              <th className="py-2 pr-3 font-medium">Device</th>
              <th className="py-2 pr-3 font-medium">Category</th>
              <th className="py-2 pr-3 font-medium">Owner</th>
              <th className="py-2 font-medium">Ports</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-line">
                <td className="py-2 pr-3">
                  <button
                    type="button"
                    className="font-semibold underline underline-offset-4"
                    onClick={() =>
                      setForm({
                        id: row.id,
                        ownerUserId: row.ownerUserId,
                        manufacturer: row.manufacturer,
                        model: row.model,
                        family: row.family,
                        category: row.category,
                        notes: row.notes,
                        portsJson: row.portsJson,
                        unverified: row.portsUnverified,
                      })
                    }
                  >
                    {row.manufacturer} {row.model}
                  </button>
                </td>
                <td className="py-2 pr-3 text-muted">{row.category || row.family}</td>
                <td className="py-2 pr-3">{row.ownerUserId || "Global"}</td>
                <td className="py-2">{row.portsUnverified ? "Unverified" : row.portDataConfidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? <p className="mt-3 text-sm text-muted">No device definitions yet.</p> : null}
      </div>
      <form
        className="grid gap-2 rounded-2xl border border-line p-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void adminSaveDevice({ data: form }).then(async (result) => {
            setError(result.error ?? "");
            if (!result.error) {
              setNote("Device saved.");
              setForm({ ...empty, id: result.id });
              await load();
            }
          });
        }}
      >
        <p className="text-sm font-semibold sm:col-span-2">{form.id ? `Edit ${form.id}` : "New device definition"}</p>
        <input placeholder="Manufacturer" value={form.manufacturer} onChange={(event) => setForm({ ...form, manufacturer: event.target.value })} className="rounded-xl border border-line bg-panel px-3 py-2 text-sm" />
        <input placeholder="Model" value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} className="rounded-xl border border-line bg-panel px-3 py-2 text-sm" />
        <input placeholder="Family" value={form.family} onChange={(event) => setForm({ ...form, family: event.target.value })} className="rounded-xl border border-line bg-panel px-3 py-2 text-sm" />
        <input placeholder="Category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="rounded-xl border border-line bg-panel px-3 py-2 text-sm" />
        <input placeholder="Owner user id, empty for global" value={form.ownerUserId} onChange={(event) => setForm({ ...form, ownerUserId: event.target.value })} className="rounded-xl border border-line bg-panel px-3 py-2 text-sm sm:col-span-2" />
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={form.unverified} onChange={(event) => setForm({ ...form, unverified: event.target.checked })} />
          Ports are unverified placeholders
        </label>
        <textarea value={form.portsJson} onChange={(event) => setForm({ ...form, portsJson: event.target.value })} className="min-h-28 rounded-xl border border-line bg-panel px-3 py-2 font-mono text-xs sm:col-span-2" />
        <textarea placeholder="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="min-h-16 rounded-xl border border-line bg-panel px-3 py-2 text-sm sm:col-span-2" />
        <div className="flex gap-2 sm:col-span-2">
          <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper">Save device</button>
          <button type="button" className="rounded-full border border-line px-4 py-2 text-sm" onClick={() => setForm(empty)}>Clear</button>
        </div>
      </form>
      {form.id ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void adminDeleteDevice({ data: { id: form.id, confirm } }).then(async (result) => {
              setError(result.error ?? "");
              if (!result.error) {
                setForm(empty);
                setConfirm("");
                setNote("Device deleted.");
                await load();
              }
            });
          }}
        >
          <input value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Type DELETE DEVICE" className="rounded-xl border border-line bg-panel px-3 py-2 text-sm" />
          <button type="submit" className="rounded-full border border-line px-4 py-2 text-sm text-danger">Delete device</button>
        </form>
      ) : null}
    </div>
  );
}
