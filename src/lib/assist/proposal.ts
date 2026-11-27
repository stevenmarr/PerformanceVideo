/** Turn a model reply into ports the engineer can accept or throw away. No key lives here. */

import { blankPort, MEDIA_TRANSPORTS, type MediaTransport, type NetworkPort } from "../network/schema.ts";

export type ProposedPort = {
  label: string;
  direction: "input" | "output";
  signal: string;
  connector: string;
};

export type DeviceProposal = {
  manufacturer: string;
  model: string;
  category: string;
  notes: string;
  ports: ProposedPort[];
  network: NetworkPort[];
};

function asDirection(value: unknown): "input" | "output" | "" {
  const text = String(value ?? "").toLowerCase();
  if (text === "out" || text === "output") return "output";
  if (text === "in" || text === "input" || text === "bidirectional") return "input";
  return "";
}

export function parseProposal(text: string): { proposal: DeviceProposal | null; error: string } {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return { proposal: null, error: "The reply had no device JSON." };
  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return { proposal: null, error: "The reply was not valid JSON." };
  }
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const model = String(row.model ?? "").trim();
  if (!model) return { proposal: null, error: "The reply did not name a model." };
  const ports: ProposedPort[] = [];
  const list = Array.isArray(row.ports) ? row.ports : [];
  for (const item of list) {
    const port = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const label = String(port.label ?? port.name ?? "").trim();
    const signal = String(port.signal ?? port.signal_type ?? "").trim();
    const direction = asDirection(port.direction);
    if (!label || !signal || !direction) continue;
    ports.push({
      label: label.slice(0, 48),
      direction,
      signal: signal.slice(0, 64),
      connector: String(port.connector ?? "").trim().slice(0, 32),
    });
  }
  if (!ports.length) return { proposal: null, error: "The reply did not include any jacks." };
  const network: NetworkPort[] = [];
  const nics = Array.isArray(row.network) ? row.network : [];
  for (const item of nics) {
    const nic = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const transport = String(nic.mediaTransport ?? nic.transport ?? "");
    network.push(
      blankPort({
        name: String(nic.name ?? "LAN").slice(0, 32),
        role: nic.role === "media" || nic.role === "control" || nic.role === "management" ? nic.role : "management",
        mode: nic.mode === "dhcp" ? "dhcp" : "static",
        address: "",
        cidr: 24,
        vlan: null,
        controlProtocol: String(nic.controlProtocol ?? nic.protocol ?? "").slice(0, 40),
        controlPort: Number.isFinite(Number(nic.controlPort)) ? Number(nic.controlPort) : null,
        mediaTransport: MEDIA_TRANSPORTS.includes(transport as MediaTransport) ? (transport as MediaTransport) : "",
        multicast: Array.isArray(nic.multicast) ? nic.multicast.map((group) => String(group)).slice(0, 8) : [],
        ptpDomain: nic.ptpDomain == null || nic.ptpDomain === "" ? null : Number(nic.ptpDomain),
        ptpRole: nic.ptpRole === "grandmaster" || nic.ptpRole === "boundary" || nic.ptpRole === "ordinary" || nic.ptpRole === "transparent" ? nic.ptpRole : "",
      }),
    );
  }
  return {
    proposal: {
      manufacturer: String(row.manufacturer ?? "").trim().slice(0, 80),
      model,
      category: String(row.category ?? "other").trim().slice(0, 40),
      notes: String(row.notes ?? "").trim().slice(0, 500),
      ports,
      network,
    },
    error: "",
  };
}

export function extractPdfText(latin1: string): string {
  const chunks: string[] = [];
  const literal = /\(((?:\\\)|\\[()\\nrt]|[^\\)]){3,})\)/g;
  for (const match of latin1.matchAll(literal)) {
    const text = match[1]
      .replace(/\\n/g, " ")
      .replace(/\\r/g, " ")
      .replace(/\\t/g, " ")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\\\/g, "\\")
      .replace(/[^\t\n\r -~]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length > 2 && /[A-Za-z]/.test(text)) chunks.push(text);
  }
  return chunks.join(" ").slice(0, 12000);
}
