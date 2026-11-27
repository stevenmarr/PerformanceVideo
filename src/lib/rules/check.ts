/**
 * Show rules a video engineer expects before a patch is printed.
 * A slower SDI rate may land on a faster SDI jack. Everything else needs a box.
 */

export type RulePin = {
  id?: string;
  label: string;
  direction: string;
  signal: string;
};

export type RuleNode = {
  id: string;
  label: string;
  pins: RulePin[];
};

export type RuleEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

export type RuleFinding = {
  level: "error" | "warning";
  code: "incompatible" | "sdi-rate" | "ok";
  message: string;
  suggestion: string;
  edgeId: string;
};

function pinOf(node: RuleNode | undefined, handle: string | null | undefined): RulePin | null {
  if (!node || !handle) return null;
  return node.pins.find((pin) => pin.id === handle) ?? null;
}

function sdiRank(signal: string): number | null {
  if (/12g/i.test(signal)) return 12;
  if (/6g/i.test(signal)) return 6;
  if (/3g/i.test(signal)) return 3;
  if (/sdi/i.test(signal)) return 1;
  return null;
}

function family(signal: string): string {
  const rank = sdiRank(signal);
  if (rank != null) return "sdi";
  if (/hdmi/i.test(signal)) return "hdmi";
  if (/displayport/i.test(signal)) return "displayport";
  if (/dvi/i.test(signal)) return "dvi";
  if (/ethernet|dante|ndi|2110|2022/i.test(signal)) return "ethernet";
  if (/led 10g/i.test(signal)) return "led-10g";
  if (/led fiber/i.test(signal)) return "led-fiber";
  if (/led data/i.test(signal)) return "led-data";
  if (/optical|fiber/i.test(signal)) return "optical";
  if (/analog audio/i.test(signal)) return "audio";
  return signal.toLowerCase();
}

/** The converter a shop would pull, named the way the library names it. */
export function converterFor(source: string, target: string): string {
  const from = family(source);
  const to = family(target);
  const sourceRank = sdiRank(source);
  const targetRank = sdiRank(target);
  if (from === "sdi" && to === "sdi" && sourceRank != null && targetRank != null && sourceRank > targetRank) {
    return "Decimator 12G-CROSS, or a scaler that can down-convert that rate";
  }
  if (from === "hdmi" && to === "sdi") return "Decimator MD-HX, or a Blackmagic Micro Converter HDMI to SDI";
  if (from === "sdi" && to === "hdmi") return "Decimator MD-HX, or a Blackmagic Micro Converter SDI to HDMI";
  if (from === "displayport" && to === "hdmi") return "DisplayPort to HDMI adapter";
  if (from === "hdmi" && to === "displayport") return "an active HDMI to DisplayPort converter, not a passive cable";
  if (from === "hdmi" && to === "dvi") return "HDMI to DVI adapter";
  if (from === "dvi" && to === "hdmi") return "DVI to HDMI adapter";
  if (from === "led-10g" && to === "led-data") return "Brompton Tessera XD";
  if (from === "led-fiber" && to === "led-data") return "Novastar CVT10";
  if (from === "optical" && to === "sdi") return "a fiber receiver for that camera path";
  if (from === "sdi" && to === "optical") return "a fiber transmitter for that camera path";
  return "a converter box between those two signals";
}

export function checkConnection(source: string, target: string): { ok: boolean; warning: boolean; suggestion: string; message: string } {
  if (!source || !target) {
    return { ok: true, warning: false, suggestion: "", message: "" };
  }
  const sourceRank = sdiRank(source);
  const targetRank = sdiRank(target);
  if (sourceRank != null && targetRank != null) {
    if (sourceRank <= targetRank) {
      const warning = sourceRank < targetRank;
      return {
        ok: true,
        warning,
        suggestion: "",
        message: warning ? `${source} can land on a ${target} input.` : "",
      };
    }
    return {
      ok: false,
      warning: false,
      suggestion: converterFor(source, target),
      message: `${source} will not lock on a ${target} input.`,
    };
  }
  if (family(source) === family(target)) {
    return { ok: true, warning: false, suggestion: "", message: "" };
  }
  return {
    ok: false,
    warning: false,
    suggestion: converterFor(source, target),
    message: `${source} does not land on ${target}.`,
  };
}

export function checkDesign(nodes: RuleNode[], edges: RuleEdge[]): RuleFinding[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const findings: RuleFinding[] = [];
  for (const edge of edges) {
    const source = pinOf(byId.get(edge.source), edge.sourceHandle);
    const target = pinOf(byId.get(edge.target), edge.targetHandle);
    if (!source || !target) continue;
    const result = checkConnection(source.signal, target.signal);
    if (!result.message && result.ok) continue;
    const from = byId.get(edge.source)?.label ?? "Source";
    const to = byId.get(edge.target)?.label ?? "Destination";
    if (!result.ok) {
      findings.push({
        level: "error",
        code: "incompatible",
        edgeId: edge.id,
        message: `${from} ${source.label} → ${to} ${target.label}: ${result.message}`,
        suggestion: result.suggestion,
      });
    } else if (result.warning) {
      findings.push({
        level: "warning",
        code: "sdi-rate",
        edgeId: edge.id,
        message: `${from} ${source.label} → ${to} ${target.label}: ${result.message}`,
        suggestion: "",
      });
    }
  }
  return findings;
}
