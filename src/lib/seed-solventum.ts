/**
 * Solventum as a saved drawing. The PDF labeled hops such as HDMI>SDI without
 * drawing the converter. Those converters are real boxes here. A 3G output
 * lands on the 12G router. A 12G router output does not land on a 3G input.
 */
import { getSql } from "@/lib/db";
import type { DrawingEdge, DrawingFile, DrawingNode } from "@/lib/drawing";

type Pin = { id: string; label: string; direction: string; signal: string };

type GearRow = { id: number; maker: string; model: string; pins: Pin[] };

type Spot = {
  id: string;
  maker: string;
  model: string;
  unitId: string;
  ip?: string;
  notes?: string;
  x: number;
  y: number;
};

const spots: Spot[] = [
  { id: "gfx1", maker: "Apple", model: "Mac Studio", unitId: "GFX-01", notes: "WIDE GFX 01 · 3240×1080", x: 20, y: 0 },
  { id: "gfx2", maker: "Apple", model: "Mac Studio", unitId: "GFX-02", notes: "WIDE GFX 02 · 3240×1080", x: 20, y: 270 },
  { id: "gfx3", maker: "Apple", model: "Mac Studio", unitId: "GFX-03", notes: "16:9 GFX 03 · 1920×1080", x: 20, y: 540 },
  { id: "mill", maker: "Apple", model: "Mac Studio", unitId: "MILL-MAIN", notes: "MILLUMIN MAIN · 3840×2160", x: 20, y: 810 },
  { id: "bkup", maker: "Apple", model: "Mac Studio", unitId: "MILL-BKUP", notes: "MILLUMIN BKUP", x: 20, y: 1080 },
  { id: "slido", maker: "Apple", model: "MacBook Pro", unitId: "SLIDO", notes: "SLIDO", x: 20, y: 1350 },
  { id: "stage", maker: "Apple", model: "Mac Studio", unitId: "STAGE", notes: "STAGE LINE", x: 20, y: 1620 },
  { id: "timer", maker: "Apple", model: "Mac Studio", unitId: "TIMER", notes: "SPEAKER TIMER", x: 20, y: 1890 },
  { id: "prompt", maker: "Apple", model: "MacBook Pro", unitId: "PROMPT", notes: "PROMPTER", x: 20, y: 2160 },

  { id: "ha5-gfx1", maker: "AJA", model: "HA5-12G", unitId: "HA5-GFX01", notes: "HDMI>SDI. The sheet only labeled this hop.", x: 320, y: 0 },
  { id: "mc-gfx2", maker: "Blackmagic Design", model: "Micro Converter HDMI to SDI 12G", unitId: "MC-GFX02", notes: "HDMI>SDI", x: 320, y: 270 },
  { id: "lx-gfx3", maker: "Decimator", model: "MD-LX", unitId: "LX-GFX03", notes: "HD cross convert. 3G into the 12G router.", x: 320, y: 540 },
  { id: "ha5-mill", maker: "AJA", model: "HA5-12G", unitId: "HA5-MILL", notes: "HDMI>SDI", x: 320, y: 810 },
  { id: "dp-bkup", maker: "Unbranded", model: "DisplayPort to HDMI", unitId: "DP-BKUP", notes: "DisplayPort does not land on HDMI.", x: 320, y: 1080 },
  { id: "mc-bkup", maker: "Blackmagic Design", model: "Micro Converter HDMI to SDI 12G", unitId: "MC-BKUP", notes: "HDMI>SDI after the DisplayPort adapter.", x: 620, y: 1080 },
  { id: "lx-slido", maker: "Decimator", model: "MD-LX", unitId: "LX-SLIDO", notes: "HDMI>SDI", x: 320, y: 1350 },
  { id: "lx-stage", maker: "Decimator", model: "MD-LX", unitId: "LX-STAGE", notes: "HDMI>SDI", x: 320, y: 1620 },
  { id: "lx-timer", maker: "Decimator", model: "MD-LX", unitId: "LX-TIMER", notes: "HDMI>SDI", x: 320, y: 1890 },
  { id: "lx-prompt", maker: "Decimator", model: "MD-LX", unitId: "LX-PROMPT", notes: "HDMI>SDI", x: 320, y: 2160 },

  { id: "router", maker: "Blackmagic Design", model: "Smart Videohub 40x40 12G", unitId: "RTR-40", notes: "40×40 router", x: 960, y: 0 },
  { id: "e2", maker: "Barco", model: "E2", unitId: "E2-01", ip: "192.168.0.175", notes: "VP# 01 master", x: 1320, y: 0 },

  { id: "pj-left", maker: "Barco", model: "UDM-4K22", unitId: "PJ-LEFT", notes: "LEFT WIDE", x: 1680, y: 0 },
  { id: "pj-cntr", maker: "Barco", model: "UDM-4K22", unitId: "PJ-CNTR", notes: "CNTR WIDE", x: 1680, y: 280 },
  { id: "pj-right", maker: "Barco", model: "UDM-4K22", unitId: "PJ-RIGHT", notes: "RIGHT WIDE", x: 1680, y: 560 },
  { id: "hi5-bl1", maker: "AJA", model: "Hi5-12G", unitId: "HI5-BL1", notes: "SDI>HDMI for the left blend.", x: 1320, y: 840 },
  { id: "pj-bl1", maker: "Barco", model: "UDM-4K22", unitId: "PJ-BL1", notes: "LEFT BLEND PJ 01", x: 1680, y: 840 },
  { id: "mc-bl2", maker: "Blackmagic Design", model: "Micro Converter SDI to HDMI 12G", unitId: "MC-BL2", notes: "SDI>HDMI", x: 1320, y: 1120 },
  { id: "pj-bl2", maker: "Barco", model: "UDM-4K22", unitId: "PJ-BL2", notes: "LEFT BLEND PJ 02", x: 1680, y: 1120 },
  { id: "hi5-pr", maker: "AJA", model: "Hi5-12G", unitId: "HI5-PR1", notes: "Router is 12G. Prompt projector SDI is 3G, so this is HDMI.", x: 1320, y: 1400 },
  { id: "pj-pr1", maker: "Panasonic", model: "PT-RZ21K", unitId: "PJ-PR1", notes: "PROMPT PJ 01", x: 1680, y: 1400 },
  { id: "mc-pr", maker: "Blackmagic Design", model: "Micro Converter SDI to HDMI 12G", unitId: "MC-PR2", notes: "SDI>HDMI", x: 1320, y: 1680 },
  { id: "pj-pr2", maker: "Panasonic", model: "PT-RZ21K", unitId: "PJ-PR2", notes: "PROMPT PJ 02", x: 1680, y: 1680 },

  { id: "scan-c", maker: "Decimator", model: "12G-CROSS", unitId: "SCAN-C", notes: "SCAN C · center destination to record", x: 1320, y: 2100 },
  { id: "rec", maker: "Blackmagic Design", model: "HyperDeck Studio 4K Pro", unitId: "REC-1", notes: "Program record", x: 1680, y: 2100 },

  { id: "ccu1", maker: "Unbranded", model: "CCU chain", unitId: "CCU-1", notes: "1920×1080@60", x: 20, y: 2700 },
  { id: "dsm-a", maker: "Blackmagic Design", model: "SmartView Duo", unitId: "DSM-A", notes: "DSM A", x: 320, y: 2700 },
  { id: "ccu2", maker: "Unbranded", model: "CCU chain", unitId: "CCU-2", notes: "1920×1080@60", x: 20, y: 3000 },
  { id: "ccu3", maker: "Unbranded", model: "CCU chain", unitId: "CCU-3", notes: "1920×1080@60", x: 20, y: 3300 },
  { id: "switcher", maker: "Unbranded", model: "Camera switcher", unitId: "CAM-SW", notes: "PGM, clean, and aux as drawn", x: 700, y: 2700 },
  { id: "dsm-b", maker: "Sony", model: "LMD-A170", unitId: "DSM-B", notes: "DSM B", x: 1320, y: 2700 },
  { id: "dsm-c", maker: "TVLogic", model: "LVM-171S", unitId: "DSM-C", notes: "DSM C", x: 1320, y: 3100 },
  { id: "dsm-d", maker: "SmallHD", model: "1303", unitId: "DSM-D", notes: "DSM D", x: 1680, y: 2700 },
  { id: "foh", maker: "Blackmagic Design", model: "SmartView 4K", unitId: "FOH-MV", notes: "FOH multiview", x: 1680, y: 3100 },
];

type Hop = {
  source: string;
  sourcePin: string;
  target: string;
  targetPin: string;
  length?: string;
  notes?: string;
};

const hops: Hop[] = [
  { source: "gfx1", sourcePin: "HDMI Out", target: "ha5-gfx1", targetPin: "HDMI In", length: "Patch" },
  { source: "ha5-gfx1", sourcePin: "SDI Out", target: "router", targetPin: "In 1", length: "25 ft" },
  { source: "gfx2", sourcePin: "HDMI Out", target: "mc-gfx2", targetPin: "HDMI In", length: "Patch" },
  { source: "mc-gfx2", sourcePin: "SDI Out", target: "router", targetPin: "In 2", length: "25 ft" },
  { source: "gfx3", sourcePin: "HDMI Out", target: "lx-gfx3", targetPin: "HDMI In", length: "Patch" },
  {
    source: "lx-gfx3",
    sourcePin: "SDI Out",
    target: "router",
    targetPin: "In 3",
    length: "25 ft",
    notes: "3G-SDI into a 12G-SDI connection.",
  },
  { source: "mill", sourcePin: "HDMI Out", target: "ha5-mill", targetPin: "HDMI In", length: "Patch" },
  { source: "ha5-mill", sourcePin: "SDI Out", target: "router", targetPin: "In 4", length: "25 ft" },
  { source: "bkup", sourcePin: "DisplayPort Out", target: "dp-bkup", targetPin: "DisplayPort In", length: "Patch" },
  { source: "dp-bkup", sourcePin: "HDMI Out", target: "mc-bkup", targetPin: "HDMI In", length: "Patch" },
  { source: "mc-bkup", sourcePin: "SDI Out", target: "router", targetPin: "In 5", length: "25 ft" },
  { source: "slido", sourcePin: "HDMI Out", target: "lx-slido", targetPin: "HDMI In", length: "Patch" },
  {
    source: "lx-slido",
    sourcePin: "SDI Out",
    target: "router",
    targetPin: "In 6",
    length: "15 ft",
    notes: "3G-SDI into a 12G-SDI connection.",
  },
  { source: "stage", sourcePin: "HDMI Out", target: "lx-stage", targetPin: "HDMI In", length: "Patch" },
  { source: "lx-stage", sourcePin: "SDI Out", target: "router", targetPin: "In 7", length: "50 ft" },
  { source: "timer", sourcePin: "HDMI Out", target: "lx-timer", targetPin: "HDMI In", length: "Patch" },
  { source: "lx-timer", sourcePin: "SDI Out", target: "router", targetPin: "In 8", length: "25 ft" },
  { source: "prompt", sourcePin: "HDMI Out", target: "lx-prompt", targetPin: "HDMI In", length: "Patch" },
  { source: "lx-prompt", sourcePin: "SDI Out", target: "router", targetPin: "In 9", length: "25 ft" },

  { source: "router", sourcePin: "Out 1", target: "e2", targetPin: "SDI In 1", length: "Patch" },
  { source: "router", sourcePin: "Out 2", target: "e2", targetPin: "SDI In 2", length: "Patch" },
  { source: "e2", sourcePin: "SDI Out 1", target: "pj-left", targetPin: "SDI In", length: "100 ft" },
  { source: "e2", sourcePin: "SDI Out 2", target: "pj-cntr", targetPin: "SDI In", length: "100 ft" },
  { source: "router", sourcePin: "Out 3", target: "pj-right", targetPin: "SDI In", length: "100 ft" },
  { source: "router", sourcePin: "Out 4", target: "hi5-bl1", targetPin: "SDI In", length: "Patch" },
  { source: "hi5-bl1", sourcePin: "HDMI Out", target: "pj-bl1", targetPin: "HDMI In", length: "50 ft" },
  { source: "router", sourcePin: "Out 5", target: "mc-bl2", targetPin: "SDI In", length: "Patch" },
  { source: "mc-bl2", sourcePin: "HDMI Out", target: "pj-bl2", targetPin: "HDMI In", length: "50 ft" },
  { source: "router", sourcePin: "Out 13", target: "hi5-pr", targetPin: "SDI In", length: "25 ft" },
  { source: "hi5-pr", sourcePin: "HDMI Out", target: "pj-pr1", targetPin: "HDMI In", length: "75 ft" },
  { source: "router", sourcePin: "Out 14", target: "mc-pr", targetPin: "SDI In", length: "25 ft" },
  { source: "mc-pr", sourcePin: "HDMI Out", target: "pj-pr2", targetPin: "HDMI In", length: "75 ft" },
  { source: "router", sourcePin: "Out 10", target: "scan-c", targetPin: "SDI In", length: "Patch" },
  { source: "scan-c", sourcePin: "SDI Out 1", target: "rec", targetPin: "SDI In", length: "Patch" },
  { source: "router", sourcePin: "Out 12", target: "foh", targetPin: "SDI In", length: "25 ft" },

  { source: "ccu1", sourcePin: "SDI 2", target: "dsm-a", targetPin: "SDI In 1", length: "Patch", notes: "Inside Camera chain 1." },
  { source: "ccu1", sourcePin: "SDI 1", target: "switcher", targetPin: "SDI In 1", length: "25 ft" },
  { source: "ccu2", sourcePin: "SDI 1", target: "switcher", targetPin: "SDI In 2", length: "25 ft" },
  { source: "ccu3", sourcePin: "SDI 1", target: "switcher", targetPin: "SDI In 3", length: "25 ft" },
  {
    source: "switcher",
    sourcePin: "PGM 1",
    target: "router",
    targetPin: "In 21",
    length: "50 ft",
    notes: "3G-SDI into a 12G-SDI connection.",
  },
  { source: "switcher", sourcePin: "PGM 2", target: "dsm-b", targetPin: "SDI In 1", length: "15 ft" },
  { source: "switcher", sourcePin: "Clean", target: "dsm-c", targetPin: "SDI A", length: "15 ft" },
  { source: "switcher", sourcePin: "Aux 1", target: "dsm-d", targetPin: "SDI In 1", length: "15 ft" },
];

function parsePins(raw: string): Pin[] {
  try {
    const parsed = JSON.parse(raw) as Pin[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function buildSolventum(gear: GearRow[]): DrawingFile {
  const byModel = new Map(gear.map((row) => [`${row.maker}\0${row.model}`, row]));
  const nodes: DrawingNode[] = [];
  for (const spot of spots) {
    const row = byModel.get(`${spot.maker}\0${spot.model}`);
    if (!row) throw new Error(`Solventum is missing ${spot.maker} ${spot.model}.`);
    nodes.push({
      id: spot.id,
      equipmentId: row.id,
      unitId: spot.unitId,
      ip: spot.ip ?? "",
      specialNotes: spot.notes ?? "",
      x: spot.x,
      y: spot.y,
    });
  }
  const pinOf = (id: string, label: string) => {
    const spot = spots.find((item) => item.id === id);
    const row = spot ? byModel.get(`${spot.maker}\0${spot.model}`) : undefined;
    const pin = row?.pins.find((item) => item.label === label);
    if (!pin?.id) throw new Error(`Solventum has no “${label}” on ${id}.`);
    return pin.id;
  };
  const edges: DrawingEdge[] = hops.map((hop, index) => ({
    id: `sol-${index + 1}`,
    source: hop.source,
    target: hop.target,
    sourceHandle: pinOf(hop.source, hop.sourcePin),
    targetHandle: pinOf(hop.target, hop.targetPin),
    length: hop.length ?? "",
    notes: hop.notes ?? "",
  }));
  return {
    title: {
      event: "Solventum",
      location: "Orlando",
      date: "02/2026",
      drawnBy: "Phillip Rude",
      version: "01",
    },
    nodes,
    edges,
    groups: [
      { id: "g-chain-1", name: "Camera chain 1", nodeIds: ["ccu1", "dsm-a"] },
      { id: "g-left-blend", name: "Left blend", nodeIds: ["pj-bl1", "pj-bl2"] },
    ],
  };
}

export async function seedSolventumDrawing(userId: string) {
  const sql = await getSql();
  const existing = await sql<{ id: number }>`
    select id from drawings where user_id = ${userId} and template_key = ${"solventum"}
  `;
  if (existing.length) return;
  const rows = await sql<{ id: number; model: string; maker: string; pins_json: string }>`
    select e.id, e.model, m.name as maker, e.pins_json
    from equipment e
    join manufacturers m on m.id = e.manufacturer_id and m.user_id = e.user_id
    where e.user_id = ${userId}
  `;
  const graph = buildSolventum(
    rows.map((row) => ({ id: row.id, maker: row.maker, model: row.model, pins: parsePins(row.pins_json) })),
  );
  await sql`
    insert into drawings (user_id, name, template_key, graph_json)
    values (${userId}, ${"Solventum"}, ${"solventum"}, ${JSON.stringify(graph)})
  `;
}
