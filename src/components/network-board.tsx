import { useState } from "react";
import type { NetworkInterface } from "@/lib/drawing";
import { groupNetwork, networkDocument, networkToCsv, validateNetwork, type NetDevice } from "@/lib/network/address";

type Row = { id: string; label: string; interfaces: NetworkInterface[] };

const blank = (): NetworkInterface => ({
  name: "eth0",
  mode: "static",
  address: "",
  cidr: 24,
  gateway: "",
  vlan: null,
  mac: "",
  hostname: "",
});

export function NetworkBoard({
  show,
  rows,
  onChange,
  onClose,
}: {
  show: string;
  rows: Row[];
  onChange: (id: string, interfaces: NetworkInterface[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(rows[0]?.id ?? "");
  const devices: NetDevice[] = rows.map((row) => ({ id: row.id, label: row.label, interfaces: row.interfaces }));
  const issues = validateNetwork(devices);
  const groups = groupNetwork(devices);
  const current = rows.find((row) => row.id === selected) ?? rows[0];

  function update(index: number, patch: Partial<NetworkInterface>) {
    if (!current) return;
    const next = current.interfaces.map((iface, item) => (item === index ? { ...iface, ...patch } : iface));
    onChange(current.id, next);
  }

  return (
    <div className="absolute inset-0 z-20 overflow-auto bg-paper/95 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Network</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">IPv4 and IPv6 stay on the drawing. Warnings cover duplicates, masks, gateways, and VLAN mismatches.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-full border border-line px-4 py-2 text-sm"
            onClick={() => {
              const blob = new Blob([JSON.stringify(networkDocument(show, devices), null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = "network.json";
              anchor.click();
              URL.revokeObjectURL(url);
            }}
          >
            JSON
          </button>
          <button
            type="button"
            className="rounded-full border border-line px-4 py-2 text-sm"
            onClick={() => {
              const blob = new Blob([networkToCsv(devices)], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = "network.csv";
              anchor.click();
              URL.revokeObjectURL(url);
            }}
          >
            CSV
          </button>
          <button type="button" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper" onClick={onClose}>
            Back to drawing
          </button>
        </div>
      </div>
      {issues.length ? (
        <ul className="mb-4 space-y-1 text-sm text-danger">
          {issues.slice(0, 12).map((issue) => (
            <li key={`${issue.code}-${issue.deviceId}-${issue.message}`}>{issue.message}</li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-muted">No network warnings.</p>
      )}
      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <ul className="space-y-1">
          {rows.map((row) => (
            <li key={row.id}>
              <button type="button" className={`w-full rounded-lg px-3 py-2 text-left text-sm ${row.id === current?.id ? "bg-panel font-semibold" : ""}`} onClick={() => setSelected(row.id)}>
                {row.label}
              </button>
            </li>
          ))}
        </ul>
        {current ? (
          <div className="space-y-3">
            {current.interfaces.map((iface, index) => (
              <div key={`${current.id}-${index}`} className="grid gap-2 rounded-2xl border border-line p-3 sm:grid-cols-4">
                <input value={iface.name} onChange={(event) => update(index, { name: event.target.value })} className="rounded-lg border border-line bg-panel px-2 py-1 text-sm" aria-label="Interface" />
                <select value={iface.mode} onChange={(event) => update(index, { mode: event.target.value === "dhcp" ? "dhcp" : "static" })} className="rounded-lg border border-line bg-panel px-2 py-1 text-sm">
                  <option value="static">Static</option>
                  <option value="dhcp">DHCP</option>
                </select>
                <input value={iface.address} onChange={(event) => update(index, { address: event.target.value })} placeholder="IPv4 or IPv6" className="rounded-lg border border-line bg-panel px-2 py-1 text-sm" />
                <input value={iface.cidr ?? ""} onChange={(event) => update(index, { cidr: event.target.value === "" ? null : Number(event.target.value) })} placeholder="CIDR" className="rounded-lg border border-line bg-panel px-2 py-1 text-sm" />
                <input value={iface.gateway} onChange={(event) => update(index, { gateway: event.target.value })} placeholder="Gateway" className="rounded-lg border border-line bg-panel px-2 py-1 text-sm" />
                <input value={iface.vlan ?? ""} onChange={(event) => update(index, { vlan: event.target.value === "" ? null : Number(event.target.value) })} placeholder="VLAN" className="rounded-lg border border-line bg-panel px-2 py-1 text-sm" />
                <input value={iface.mac} onChange={(event) => update(index, { mac: event.target.value })} placeholder="MAC" className="rounded-lg border border-line bg-panel px-2 py-1 text-sm" />
                <input value={iface.hostname} onChange={(event) => update(index, { hostname: event.target.value })} placeholder="Hostname" className="rounded-lg border border-line bg-panel px-2 py-1 text-sm" />
              </div>
            ))}
            <button type="button" className="rounded-full border border-line px-4 py-2 text-sm" onClick={() => onChange(current.id, [...current.interfaces, blank()])}>
              Add interface
            </button>
          </div>
        ) : null}
      </div>
      <div className="mt-6 space-y-3">
        {groups.map((group) => (
          <section key={`${group.vlan}-${group.subnet}`}>
            <h3 className="text-sm font-semibold">{group.vlan} · {group.subnet}</h3>
            <ul className="mt-1 text-sm text-muted">
              {group.devices.map((device) => (
                <li key={`${group.subnet}-${device.id}-${device.address}`}>{device.label} · {device.address} · {device.hostname || "no hostname"}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
