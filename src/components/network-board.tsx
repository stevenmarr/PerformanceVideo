import { useState } from "react";
import { Badge, Button, EmptyState, Field, HelpPane } from "@/components/ui/kit";
import { HELP } from "@/lib/help/copy";
import type { NetworkInterface } from "@/lib/drawing";
import { groupNetwork, networkDocument, networkToCsv, validateNetwork, type NetDevice, type NetIssue } from "@/lib/network/address";
import { validateLinks, type NetLink } from "@/lib/network/links";
import { assignAddressPlan } from "@/lib/network/plan";
import { MEDIA_TRANSPORTS, NIC_ROLES, PTP_ROLES, blankPort, cidrToMask, maskToCidr } from "@/lib/network/schema";

type Row = { id: string; label: string; interfaces: NetworkInterface[] };

function download(filename: string, body: string, type: string) {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function NetworkBoard({
  show,
  rows,
  links = [],
  onChange,
  onClose,
}: {
  show: string;
  rows: Row[];
  links?: NetLink[];
  onChange: (id: string, interfaces: NetworkInterface[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(rows[0]?.id ?? "");
  const devices: NetDevice[] = rows.map((row) => ({ id: row.id, label: row.label, interfaces: row.interfaces }));
  const issues = [...validateNetwork(devices), ...validateLinks(devices, links)];
  const groups = groupNetwork(devices);
  const current = rows.find((row) => row.id === selected) ?? rows[0];

  function update(index: number, patch: Partial<NetworkInterface>) {
    if (!current) return;
    const next = current.interfaces.map((iface, item) => (item === index ? { ...iface, ...patch } : iface));
    onChange(current.id, next);
  }

  function assign() {
    const planned = assignAddressPlan(devices);
    for (const device of planned.devices) {
      onChange(device.id, device.interfaces as NetworkInterface[]);
    }
  }

  return (
    <div className="absolute inset-0 z-20 overflow-auto bg-paper p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="ui-kicker">IP / VLAN</p>
          <h2 className="text-lg font-semibold">Network</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button title={HELP.plan} onClick={assign}>Assign plan</Button>
          <Button title="Download the network file" onClick={() => download("network.json", JSON.stringify(networkDocument(show, devices), null, 2), "application/json")}>JSON</Button>
          <Button title="Download the spreadsheet" onClick={() => download("network.csv", networkToCsv(devices), "text/csv")}>CSV</Button>
          <Button variant="primary" onClick={onClose}>Back to drawing</Button>
        </div>
      </div>
      <HelpPane title="How to read this table">{HELP.network} {HELP.plan}</HelpPane>
      <IssueList issues={issues} />
      {!rows.length ? (
        <div className="mt-4">
          <EmptyState title="No boxes on this show">Place gear first. A module with a LAN jack starts with a NIC row.</EmptyState>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[16rem_1fr]">
          <ul className="space-y-1">
            {rows.map((row) => (
              <li key={row.id}>
                <button type="button" className={`w-full rounded-lg px-3 py-2 text-left text-sm ${row.id === current?.id ? "bg-panel font-semibold" : ""}`} onClick={() => setSelected(row.id)}>
                  {row.label}
                  <span className="ml-2 text-xs text-muted">{row.interfaces.length} NIC</span>
                </button>
              </li>
            ))}
          </ul>
          {current ? (
            <div className="space-y-3">
              {current.interfaces.length === 0 ? (
                <EmptyState title="No NIC on this box">
                  <Button className="mt-3" onClick={() => onChange(current.id, [blankPort({ name: "LAN", role: "control" })])}>Add a NIC</Button>
                </EmptyState>
              ) : null}
              {current.interfaces.map((iface, index) => (
                <NicCard key={`${current.id}-${index}`} iface={iface} onChange={(patch) => update(index, patch)} onRemove={() => onChange(current.id, current.interfaces.filter((_, item) => item !== index))} />
              ))}
              {current.interfaces.length ? (
                <Button onClick={() => onChange(current.id, [...current.interfaces, blankPort({ name: `eth${current.interfaces.length}` })])}>Add NIC</Button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
      <div className="mt-6 overflow-x-auto">
        <table className="ui-table min-w-[40rem]">
          <thead>
            <tr>
              <th>VLAN</th>
              <th>Subnet</th>
              <th>Device</th>
              <th>Address</th>
              <th>Hostname</th>
            </tr>
          </thead>
          <tbody>
            {groups.flatMap((group) =>
              group.devices.map((device) => (
                <tr key={`${group.vlan}-${group.subnet}-${device.id}-${device.address}`}>
                  <td>{group.vlan}</td>
                  <td>{group.subnet}</td>
                  <td>{device.label}</td>
                  <td>{device.address}</td>
                  <td>{device.hostname || "—"}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IssueList({ issues }: { issues: NetIssue[] }) {
  if (!issues.length) return <p className="mt-3 text-sm text-muted">No duplicate addresses, mask errors, or VLAN mismatches.</p>;
  return (
    <ul className="mt-3 space-y-1 text-sm text-danger">
      {issues.slice(0, 16).map((issue) => (
        <li key={`${issue.code}-${issue.deviceId}-${issue.message}`}>{issue.message}</li>
      ))}
    </ul>
  );
}

function NicCard({
  iface,
  onChange,
  onRemove,
}: {
  iface: NetworkInterface;
  onChange: (patch: Partial<NetworkInterface>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="ui-panel space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="font-semibold">{iface.name || "NIC"}</p>
          <Badge tone={iface.role === "media" ? "warn" : iface.role === "control" ? "custom" : "builtin"}>{iface.role}</Badge>
        </div>
        <Button variant="danger" onClick={onRemove}>Remove NIC</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Name" help="The jack name, such as LAN or Dante primary.">
          <input className="ui-input" value={iface.name} onChange={(event) => onChange({ name: event.target.value })} />
        </Field>
        <Field label="Role" help={HELP.role}>
          <select className="ui-select" value={iface.role} onChange={(event) => onChange({ role: event.target.value as NetworkInterface["role"] })}>
            {NIC_ROLES.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </Field>
        <Field label="Addressing" help="Static if you assign it. DHCP if the switch hands it out.">
          <select className="ui-select" value={iface.mode} onChange={(event) => onChange({ mode: event.target.value === "dhcp" ? "dhcp" : "static" })}>
            <option value="static">Static</option>
            <option value="dhcp">DHCP</option>
          </select>
        </Field>
        <Field label="VLAN" help={HELP.vlan}>
          <input className="ui-input" value={iface.vlan ?? ""} placeholder="10" onChange={(event) => onChange({ vlan: event.target.value === "" ? null : Number(event.target.value) })} />
        </Field>
        <Field label="IP address" help={HELP.ip}>
          <input className="ui-input" value={iface.address} placeholder="10.10.10.21" onChange={(event) => onChange({ address: event.target.value })} />
        </Field>
        <Field label="Prefix" help="24 is a /24. IPv6 can be 64.">
          <input className="ui-input" value={iface.cidr ?? ""} placeholder="24" onChange={(event) => {
            const cidr = event.target.value === "" ? null : Number(event.target.value);
            onChange({ cidr, mask: cidr == null ? iface.mask : cidrToMask(cidr) || iface.mask });
          }} />
        </Field>
        <Field label="Subnet mask" help={HELP.mask}>
          <input className="ui-input" value={iface.mask} placeholder="255.255.255.0" onChange={(event) => {
            const mask = event.target.value;
            onChange({ mask, cidr: maskToCidr(mask) ?? iface.cidr });
          }} />
        </Field>
        <Field label="Gateway" help={HELP.gateway}>
          <input className="ui-input" value={iface.gateway} onChange={(event) => onChange({ gateway: event.target.value })} />
        </Field>
        <Field label="Hostname" help={HELP.hostname}>
          <input className="ui-input" value={iface.hostname} onChange={(event) => onChange({ hostname: event.target.value })} />
        </Field>
        <Field label="MAC" help={HELP.mac}>
          <input className="ui-input" value={iface.mac} placeholder="aa:bb:cc:dd:ee:ff" onChange={(event) => onChange({ mac: event.target.value })} />
        </Field>
        <Field label="Control protocol" help={HELP.protocol}>
          <input className="ui-input" value={iface.controlProtocol} placeholder="ATEM" onChange={(event) => onChange({ controlProtocol: event.target.value })} />
        </Field>
        <Field label="Control port" help={HELP.controlPort}>
          <input className="ui-input" value={iface.controlPort ?? ""} onChange={(event) => onChange({ controlPort: event.target.value === "" ? null : Number(event.target.value) })} />
        </Field>
        <Field label="Media transport" help={HELP.transport}>
          <select className="ui-select" value={iface.mediaTransport} onChange={(event) => onChange({ mediaTransport: event.target.value as NetworkInterface["mediaTransport"] })}>
            {MEDIA_TRANSPORTS.map((item) => (
              <option key={item || "none"} value={item}>{item || "None"}</option>
            ))}
          </select>
        </Field>
        <Field label="Multicast" help={HELP.multicast}>
          <input className="ui-input" value={iface.multicast.join(", ")} onChange={(event) => onChange({ multicast: event.target.value.split(/[,\s]+/).map((item) => item.trim()).filter(Boolean) })} />
        </Field>
        <Field label="PTP domain" help={HELP.ptp}>
          <input className="ui-input" value={iface.ptpDomain ?? ""} onChange={(event) => onChange({ ptpDomain: event.target.value === "" ? null : Number(event.target.value) })} />
        </Field>
        <Field label="PTP role" help={HELP.ptp}>
          <select className="ui-select" value={iface.ptpRole} onChange={(event) => onChange({ ptpRole: event.target.value as NetworkInterface["ptpRole"] })}>
            {PTP_ROLES.map((item) => (
              <option key={item || "none"} value={item}>{item || "None"}</option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}
