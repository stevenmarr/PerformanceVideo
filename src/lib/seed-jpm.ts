/**
 * JPM, from the 67245 in/out sheet. Routers keep the printed input numbers.
 * A named converter on the transmission column is its own box. One output
 * does not feed two inputs, so a camera chain or a 12G-CROSS does the split.
 */
import type { DrawingEdge, DrawingFile, DrawingNode } from "@/lib/drawing";

type Pin = { id: string; label: string; direction: string; signal: string };
type GearRow = { id: number; maker: string; model: string; pins: Pin[] };

type Spot = {
  id: string;
  maker: string;
  model: string;
  unitId: string;
  notes?: string;
  x: number;
  y: number;
};

type Hop = {
  source: string;
  sourcePin: string;
  target: string;
  targetPin: string;
  length?: string;
  notes?: string;
};

const spots: Spot[] = [
  { id: "cam1", maker: "Unbranded", model: "CCU chain", unitId: "CAM-1", notes: "Camera 1. 42x lens. SMPTE fiber, then 3G copper.", x: 0, y: 0 },
  { id: "cam2", maker: "Unbranded", model: "CCU chain", unitId: "CAM-2", notes: "Camera 2. 42x lens. SMPTE fiber, then 3G copper.", x: 0, y: 280 },
  { id: "spy", maker: "Panasonic", model: "AW-HE130", unitId: "DSM-SPY", notes: "DSM Spy. Network kit, then 3G copper.", x: 0, y: 560 },

  { id: "gfxA1", maker: "Apple", model: "Mac Studio", unitId: "GFX-A1", notes: "Slides.", x: 0, y: 860 },
  { id: "xA1", maker: "Decimator", model: "12G-CROSS", unitId: "XC-GFXA1", notes: "12G Cross for GFX A-1.", x: 340, y: 860 },
  { id: "gfxA2", maker: "Apple", model: "Mac Studio", unitId: "GFX-A2", notes: "Notes. HDMI copper.", x: 0, y: 1120 },
  { id: "gfxB1", maker: "Apple", model: "Mac Studio", unitId: "GFX-B1", notes: "Slides.", x: 0, y: 1380 },
  { id: "xB1", maker: "Decimator", model: "12G-CROSS", unitId: "XC-GFXB1", notes: "12G Cross for GFX B-1.", x: 340, y: 1380 },
  { id: "gfxB2", maker: "Apple", model: "Mac Studio", unitId: "GFX-B2", notes: "Notes. HDMI copper.", x: 0, y: 1640 },

  { id: "millA1", maker: "Apple", model: "Mac Studio", unitId: "MILL-A1", notes: "768×1344. DP copper.", x: 0, y: 1920 },
  { id: "millA2", maker: "Apple", model: "Mac Studio", unitId: "MILL-A2", notes: "3648×1920. DP copper.", x: 0, y: 2140 },
  { id: "millA3", maker: "Apple", model: "Mac Studio", unitId: "MILL-A3", notes: "3648×1920. DP copper.", x: 0, y: 2360 },
  { id: "millA4", maker: "Apple", model: "Mac Studio", unitId: "MILL-A4", notes: "768×1344. DP copper.", x: 0, y: 2580 },
  { id: "millB1", maker: "Apple", model: "Mac Studio", unitId: "MILL-B1", notes: "768×1344. DP copper.", x: 0, y: 2800 },
  { id: "millB2", maker: "Apple", model: "Mac Studio", unitId: "MILL-B2", notes: "3648×1920. DP copper.", x: 0, y: 3020 },
  { id: "millB3", maker: "Apple", model: "Mac Studio", unitId: "MILL-B3", notes: "3648×1920. DP copper.", x: 0, y: 3240 },
  { id: "millB4", maker: "Apple", model: "Mac Studio", unitId: "MILL-B4", notes: "768×1344. DP copper.", x: 0, y: 3460 },

  { id: "playA", maker: "Apple", model: "Mac Studio", unitId: "PLAY-A", notes: "Playback A.", x: 0, y: 3720 },
  { id: "xPlayA", maker: "Decimator", model: "12G-CROSS", unitId: "XC-PLAYA", notes: "12G Cross / 3G copper / HDMI copper.", x: 340, y: 3720 },
  { id: "playB", maker: "Apple", model: "Mac Studio", unitId: "PLAY-B", notes: "Playback B.", x: 0, y: 3980 },
  { id: "xPlayB", maker: "Decimator", model: "12G-CROSS", unitId: "XC-PLAYB", notes: "12G Cross / 3G copper / HDMI copper.", x: 340, y: 3980 },
  { id: "timer", maker: "Apple", model: "Mac Studio", unitId: "TIMER", notes: "Speaker timer. Dell.", x: 0, y: 4240 },
  { id: "xTimer", maker: "Decimator", model: "12G-CROSS", unitId: "XC-TIMER", notes: "Tac 12-5 / 12G Cross / 3G FiDO.", x: 340, y: 4240 },
  { id: "cue", maker: "Apple", model: "MacBook Pro", unitId: "CUE", notes: "Perfect Cue. DSAN video clock / network kit.", x: 0, y: 4500 },

  { id: "kumo", maker: "AJA", model: "KUMO 1616", unitId: "KUMO-CAM", notes: "Camera rack. Inputs 3–6 are returns (RS6 M/V, REC M/V, BM M/V, PGM) with no printed source output.", x: 760, y: 0 },
  { id: "foh", maker: "Blackmagic Design", model: "Videohub 12x12 12G", unitId: "FOH-12", notes: "FOH router. Inputs 1–6 come from the Kumo.", x: 1180, y: 0 },
  { id: "bm", maker: "Blackmagic Design", model: "Smart Videohub 20x20 12G", unitId: "BM-4K", notes: "BM 4K. Input 16 is labeled PGM and has no printed source.", x: 760, y: 1500 },
  { id: "rs6", maker: "Analog Way", model: "Aquilon RS6", unitId: "RS6-0", notes: "Cards 1–2 12G-SDI, 3–5 DisplayPort, 6–8 HDMI in. Cards 9–12 HDMI out, 13–14 12G-SDI out.", x: 1680, y: 0 },

  { id: "xTd1", maker: "Decimator", model: "12G-CROSS", unitId: "XC-TD1", notes: "Rolling stand. 12G Cross, HDMI copper, HDMI DA.", x: 2140, y: 0 },
  { id: "td1", maker: "Unbranded", model: "Show monitor", unitId: "TD-MV-1", notes: "43\" RS6 TD M/V #1.", x: 2520, y: 0 },
  { id: "xTd2", maker: "Decimator", model: "12G-CROSS", unitId: "XC-TD2", notes: "Rolling stand. 12G Cross, HDMI copper, HDMI DA.", x: 2140, y: 260 },
  { id: "td2", maker: "Unbranded", model: "Show monitor", unitId: "TD-MV-2", notes: "43\" RS6 TD M/V #2.", x: 2520, y: 260 },
  { id: "xAtem", maker: "Decimator", model: "12G-CROSS", unitId: "XC-ATEM", notes: "12G Cross in front of the ATEM multiview.", x: 2140, y: 520 },
  { id: "atemMv", maker: "Unbranded", model: "Show monitor", unitId: "ATEM-MV", notes: "32\" BM ATEM TD M/V #1.", x: 2520, y: 520 },

  { id: "ledAC", maker: "Novastar", model: "VX1000", unitId: "LED-AC", notes: "LED A & C. 1536×1344.", x: 2140, y: 860 },
  { id: "ledHL", maker: "Novastar", model: "VX1000", unitId: "LED-BHL", notes: "LED B HL. 3648×1920.", x: 2140, y: 1160 },
  { id: "ledHR", maker: "Novastar", model: "VX1000", unitId: "LED-BHR", notes: "LED B HR. 3648×1920.", x: 2140, y: 1460 },
  { id: "dsm1", maker: "Unbranded", model: "Show monitor", unitId: "DSM-1", notes: "55\" DSM 1.", x: 2520, y: 860 },
  { id: "dsm2", maker: "Unbranded", model: "Show monitor", unitId: "DSM-2", notes: "55\" DSM 2.", x: 2520, y: 1080 },
  { id: "millMv", maker: "Unbranded", model: "Show monitor", unitId: "MILL-MV", notes: "43\" Millumin M/V. Rolling stand.", x: 2520, y: 1300 },
  { id: "mcMill", maker: "Blackmagic Design", model: "Micro Converter SDI to HDMI 12G", unitId: "MC-MILL", notes: "HDMI copper after the 12G output.", x: 2140, y: 1300 },
  { id: "gfxMv", maker: "Unbranded", model: "Show monitor", unitId: "GFX-MV", notes: "43\" Prompter / GFX M/V. Rolling stand.", x: 2520, y: 1520 },
  { id: "mcGfx", maker: "Blackmagic Design", model: "Micro Converter SDI to HDMI 12G", unitId: "MC-GFX", notes: "HDMI copper after the 12G output.", x: 2140, y: 1560 },
  { id: "xRec", maker: "Decimator", model: "12G-CROSS", unitId: "XC-RECMV", notes: "Sheet calls this a Decimator 12S.", x: 2140, y: 1760 },
  { id: "recMv", maker: "Unbranded", model: "Show monitor", unitId: "REC-MV", notes: "32\" Record M/V.", x: 2520, y: 1760 },
  { id: "eic", maker: "Unbranded", model: "Show monitor", unitId: "EIC-32", notes: "32\" EIC. HDMI copper.", x: 2520, y: 1980 },
  { id: "mcSm", maker: "Blackmagic Design", model: "Micro Converter SDI to HDMI 12G", unitId: "MC-SM", notes: "TAC 12-1, Quad Fido 1, 3G copper / MD-LX.", x: 2140, y: 2060 },
  { id: "smMv", maker: "Unbranded", model: "Show monitor", unitId: "SM-MV", notes: "32\" Stage Manager M/V.", x: 2520, y: 2200 },
  { id: "mcA1", maker: "Blackmagic Design", model: "Micro Converter SDI to HDMI 12G", unitId: "MC-A1", notes: "TAC 12-2, Quad Fido 2, 3G copper / MD-LX / BM router.", x: 2140, y: 2320 },
  { id: "a1Mv", maker: "Unbranded", model: "Show monitor", unitId: "A1-MV", notes: "32\" A1 Record M/V from RS6.", x: 2520, y: 2460 },
  { id: "mcLd", maker: "Blackmagic Design", model: "Micro Converter SDI to HDMI 12G", unitId: "MC-LD", notes: "TAC 12-3, Quad Fido 3, 3G copper / BM router.", x: 2140, y: 2580 },
  { id: "ldMv", maker: "Unbranded", model: "Show monitor", unitId: "LD-REF", notes: "17\" LD Reference from RS6.", x: 2520, y: 2720 },

  { id: "fohSm", maker: "Blackmagic Design", model: "SmartView 4K", unitId: "FOH-SM", notes: "32\" SM Multiview.", x: 1560, y: 1500 },
  { id: "fohA1", maker: "Blackmagic Design", model: "SmartView 4K", unitId: "FOH-A1", notes: "32\" A1 Rec M/V off the FOH router.", x: 1560, y: 1740 },
  { id: "fohLd", maker: "Blackmagic Design", model: "SmartView 4K", unitId: "FOH-LD", notes: "17\" LD Reference off the FOH router.", x: 1560, y: 1980 },

  { id: "recY2", maker: "Blackmagic Design", model: "HyperDeck Studio 4K Pro", unitId: "REC-Y2", notes: "Cam 1. 3G copper.", x: 1180, y: 1500 },
  { id: "recY3", maker: "Blackmagic Design", model: "HyperDeck Studio 4K Pro", unitId: "REC-Y3", notes: "Cam 2. 3G copper.", x: 1180, y: 1740 },
  { id: "recY4", maker: "Blackmagic Design", model: "HyperDeck Studio 4K Pro", unitId: "REC-Y4", notes: "Sheet marks this ??.", x: 1180, y: 1980 },
  { id: "recZ2", maker: "Blackmagic Design", model: "HyperDeck Studio 4K Pro", unitId: "REC-Z2", notes: "Cam 1. 3G copper.", x: 1180, y: 2220 },
  { id: "recZ3", maker: "Blackmagic Design", model: "HyperDeck Studio 4K Pro", unitId: "REC-Z3", notes: "Cam 2. 3G copper.", x: 1180, y: 2460 },
  { id: "recZ4", maker: "Blackmagic Design", model: "HyperDeck Studio 4K Pro", unitId: "REC-Z4", notes: "Sheet marks this ??.", x: 1180, y: 2700 },
  { id: "embed", maker: "Unbranded", model: "Audio embedder", unitId: "EMBED", notes: "To Embed / from embedder MUX.", x: 1180, y: 2940 },
  { id: "scope", maker: "Blackmagic Design", model: "SmartView 4K", unitId: "ENG-SCOPE", notes: "ENG scope.", x: 1560, y: 2220 },
];

const hops: Hop[] = [
  { source: "cam1", sourcePin: "SDI 1", target: "kumo", targetPin: "In 1", notes: "Camera 1 into the rack router." },
  { source: "cam1", sourcePin: "SDI 2", target: "bm", targetPin: "In 1", notes: "3G-SDI into a 12G-SDI connection." },
  { source: "cam1", sourcePin: "SDI 3", target: "rs6", targetPin: "In 1", notes: "3G-SDI into a 12G-SDI connection." },
  { source: "cam2", sourcePin: "SDI 1", target: "kumo", targetPin: "In 2" },
  { source: "cam2", sourcePin: "SDI 2", target: "bm", targetPin: "In 2", notes: "3G-SDI into a 12G-SDI connection." },
  { source: "cam2", sourcePin: "SDI 3", target: "rs6", targetPin: "In 2", notes: "3G-SDI into a 12G-SDI connection." },
  { source: "spy", sourcePin: "SDI Out", target: "rs6", targetPin: "In 8", notes: "DSM Spy. 3G-SDI into a 12G-SDI connection." },

  { source: "kumo", sourcePin: "Out 1", target: "foh", targetPin: "In 1", notes: "Cam 1. 3G-SDI into a 12G-SDI connection." },
  { source: "kumo", sourcePin: "Out 2", target: "foh", targetPin: "In 2", notes: "Cam 2. 3G-SDI into a 12G-SDI connection." },
  { source: "kumo", sourcePin: "Out 3", target: "foh", targetPin: "In 3", notes: "RS6 M/V 1." },
  { source: "kumo", sourcePin: "Out 4", target: "foh", targetPin: "In 4", notes: "REC M/V." },
  { source: "kumo", sourcePin: "Out 5", target: "foh", targetPin: "In 5", notes: "BM M/V." },
  { source: "kumo", sourcePin: "Out 6", target: "foh", targetPin: "In 6", notes: "PGM." },

  { source: "gfxA1", sourcePin: "HDMI Out", target: "xA1", targetPin: "HDMI In", length: "Patch" },
  { source: "xA1", sourcePin: "SDI Out 1", target: "bm", targetPin: "In 3", notes: "GFX A-1 slides." },
  { source: "xA1", sourcePin: "HDMI Out", target: "rs6", targetPin: "In 21", notes: "GFX A-1." },
  { source: "gfxA2", sourcePin: "HDMI Out", target: "rs6", targetPin: "In 22", notes: "HDMI copper." },
  { source: "gfxB1", sourcePin: "HDMI Out", target: "xB1", targetPin: "HDMI In", length: "Patch" },
  { source: "xB1", sourcePin: "SDI Out 1", target: "bm", targetPin: "In 4", notes: "GFX B-1 slides." },
  { source: "xB1", sourcePin: "HDMI Out", target: "rs6", targetPin: "In 23", notes: "GFX B-1." },
  { source: "gfxB2", sourcePin: "HDMI Out", target: "rs6", targetPin: "In 24", notes: "HDMI copper." },

  { source: "millA1", sourcePin: "DisplayPort Out", target: "rs6", targetPin: "In 9", notes: "768×1344." },
  { source: "millA2", sourcePin: "DisplayPort Out", target: "rs6", targetPin: "In 10", notes: "3648×1920." },
  { source: "millA3", sourcePin: "DisplayPort Out", target: "rs6", targetPin: "In 11", notes: "3648×1920." },
  { source: "millA4", sourcePin: "DisplayPort Out", target: "rs6", targetPin: "In 12", notes: "768×1344." },
  { source: "millB1", sourcePin: "DisplayPort Out", target: "rs6", targetPin: "In 13", notes: "768×1344." },
  { source: "millB2", sourcePin: "DisplayPort Out", target: "rs6", targetPin: "In 14", notes: "3648×1920." },
  { source: "millB3", sourcePin: "DisplayPort Out", target: "rs6", targetPin: "In 15", notes: "3648×1920." },
  { source: "millB4", sourcePin: "DisplayPort Out", target: "rs6", targetPin: "In 16", notes: "768×1344." },

  { source: "playA", sourcePin: "HDMI Out", target: "xPlayA", targetPin: "HDMI In", length: "Patch" },
  { source: "xPlayA", sourcePin: "SDI Out 1", target: "bm", targetPin: "In 5", notes: "Playback A." },
  { source: "xPlayA", sourcePin: "HDMI Out", target: "rs6", targetPin: "In 25" },
  { source: "playB", sourcePin: "HDMI Out", target: "xPlayB", targetPin: "HDMI In", length: "Patch" },
  { source: "xPlayB", sourcePin: "SDI Out 1", target: "bm", targetPin: "In 6", notes: "Playback B." },
  { source: "xPlayB", sourcePin: "HDMI Out", target: "rs6", targetPin: "In 26" },
  { source: "timer", sourcePin: "HDMI Out", target: "xTimer", targetPin: "HDMI In", length: "Patch" },
  { source: "xTimer", sourcePin: "HDMI Out", target: "rs6", targetPin: "In 27", notes: "Speaker timer." },
  { source: "cue", sourcePin: "HDMI Out", target: "rs6", targetPin: "In 28", notes: "Perfect Cue. HDMI copper." },

  { source: "bm", sourcePin: "Out 1", target: "rs6", targetPin: "In 3", notes: "PGM to RS6." },
  { source: "bm", sourcePin: "Out 2", target: "rs6", targetPin: "In 4", notes: "IMAG to RS6." },
  { source: "bm", sourcePin: "Out 7", target: "recY2", targetPin: "SDI In", notes: "REC Y-2 Cam 1." },
  { source: "bm", sourcePin: "Out 8", target: "recY3", targetPin: "SDI In", notes: "REC Y-3 Cam 2." },
  { source: "bm", sourcePin: "Out 9", target: "recY4", targetPin: "SDI In", notes: "REC Y-4." },
  { source: "bm", sourcePin: "Out 10", target: "recZ2", targetPin: "SDI In", notes: "REC Z-2 Cam 1." },
  { source: "bm", sourcePin: "Out 11", target: "recZ3", targetPin: "SDI In", notes: "REC Z-3 Cam 2." },
  { source: "bm", sourcePin: "Out 12", target: "recZ4", targetPin: "SDI In", notes: "REC Z-4." },
  { source: "bm", sourcePin: "Out 15", target: "embed", targetPin: "SDI In", notes: "To Embed." },
  { source: "embed", sourcePin: "SDI Out", target: "bm", targetPin: "In 15", notes: "From embedder MUX." },
  { source: "bm", sourcePin: "Out 16", target: "scope", targetPin: "SDI In", notes: "ENG scope." },

  { source: "foh", sourcePin: "Out 1", target: "fohSm", targetPin: "SDI In", notes: "32\" SM Multiview." },
  { source: "foh", sourcePin: "Out 2", target: "fohA1", targetPin: "SDI In", notes: "32\" A1 Rec M/V." },
  { source: "foh", sourcePin: "Out 3", target: "fohLd", targetPin: "SDI In", notes: "17\" LD Reference." },

  { source: "rs6", sourcePin: "Out 1", target: "ledAC", targetPin: "HDMI In 1", notes: "LED A & C. HDMI copper." },
  { source: "rs6", sourcePin: "Out 2", target: "ledHL", targetPin: "HDMI In 1", notes: "LED B HL. HDMI copper." },
  { source: "rs6", sourcePin: "Out 3", target: "ledHR", targetPin: "HDMI In 1", notes: "LED B HR. HDMI copper." },
  { source: "rs6", sourcePin: "Out 5", target: "dsm1", targetPin: "HDMI In", length: "150 ft", notes: "HDMI armored." },
  { source: "rs6", sourcePin: "Out 6", target: "dsm2", targetPin: "HDMI In", length: "150 ft", notes: "HDMI armored." },
  { source: "rs6", sourcePin: "Out 13", target: "xTd1", targetPin: "HDMI In", notes: "TD multiview 1. The sheet does not print this output number." },
  { source: "xTd1", sourcePin: "HDMI Out", target: "td1", targetPin: "HDMI In" },
  { source: "rs6", sourcePin: "Out 14", target: "xTd2", targetPin: "HDMI In", notes: "TD multiview 2. The sheet does not print this output number." },
  { source: "xTd2", sourcePin: "HDMI Out", target: "td2", targetPin: "HDMI In" },
  { source: "rs6", sourcePin: "Out 16", target: "eic", targetPin: "HDMI In", notes: "32\" EIC. HDMI copper." },
  { source: "rs6", sourcePin: "Out 17", target: "xAtem", targetPin: "SDI In", notes: "RS6 to BM ATEM." },
  { source: "xAtem", sourcePin: "HDMI Out", target: "atemMv", targetPin: "HDMI In", notes: "12G Cross / HDMI copper." },
  { source: "xAtem", sourcePin: "SDI Loop 1", target: "bm", targetPin: "In 8", notes: "RS6 to BM ATEM." },
  { source: "rs6", sourcePin: "Out 18", target: "mcMill", targetPin: "SDI In" },
  { source: "mcMill", sourcePin: "HDMI Out", target: "millMv", targetPin: "HDMI In", notes: "HDMI copper." },
  { source: "rs6", sourcePin: "Out 19", target: "mcGfx", targetPin: "SDI In" },
  { source: "mcGfx", sourcePin: "HDMI Out", target: "gfxMv", targetPin: "HDMI In", notes: "HDMI copper." },
  { source: "rs6", sourcePin: "Out 20", target: "xRec", targetPin: "SDI In" },
  { source: "xRec", sourcePin: "HDMI Out", target: "recMv", targetPin: "HDMI In", notes: "Decimator 12S / HDMI copper." },
  { source: "rs6", sourcePin: "Out 22", target: "mcSm", targetPin: "SDI In" },
  { source: "mcSm", sourcePin: "HDMI Out", target: "smMv", targetPin: "HDMI In" },
  { source: "rs6", sourcePin: "Out 23", target: "mcA1", targetPin: "SDI In" },
  { source: "mcA1", sourcePin: "HDMI Out", target: "a1Mv", targetPin: "HDMI In" },
  { source: "rs6", sourcePin: "Out 24", target: "mcLd", targetPin: "SDI In" },
  { source: "mcLd", sourcePin: "HDMI Out", target: "ldMv", targetPin: "HDMI In" },
];

function parsePins(raw: string): Pin[] {
  try {
    const parsed = JSON.parse(raw) as Pin[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function buildJpm(gear: GearRow[]): DrawingFile {
  const byModel = new Map(gear.map((row) => [`${row.maker}\0${row.model}`, row]));
  const nodes: DrawingNode[] = [];
  for (const spot of spots) {
    const row = byModel.get(`${spot.maker}\0${spot.model}`);
    if (!row) throw new Error(`JPM is missing ${spot.maker} ${spot.model}.`);
    nodes.push({
      id: spot.id,
      equipmentId: row.id,
      unitId: spot.unitId,
      ip: "",
      specialNotes: spot.notes ?? "",
      x: spot.x,
      y: spot.y,
    });
  }
  const pinOf = (id: string, label: string) => {
    const spot = spots.find((item) => item.id === id);
    const row = spot ? byModel.get(`${spot.maker}\0${spot.model}`) : undefined;
    const pin = row?.pins.find((item) => item.label === label);
    if (!pin?.id) throw new Error(`JPM has no “${label}” on ${id}.`);
    return pin.id;
  };
  const edges: DrawingEdge[] = hops.map((hop, index) => ({
    id: `jpm-${index + 1}`,
    source: hop.source,
    target: hop.target,
    sourceHandle: pinOf(hop.source, hop.sourcePin),
    targetHandle: pinOf(hop.target, hop.targetPin),
    length: hop.length ?? "",
    notes: hop.notes ?? "",
  }));
  return {
    title: {
      event: "JPM",
      location: "",
      date: "",
      drawnBy: "",
      version: "67245 v1",
    },
    nodes,
    edges,
    groups: [
      { id: "g-cam", name: "Cameras", nodeIds: ["cam1", "cam2", "spy"] },
      { id: "g-mill", name: "Millumin", nodeIds: ["millA1", "millA2", "millA3", "millA4", "millB1", "millB2", "millB3", "millB4"] },
      { id: "g-led", name: "LED", nodeIds: ["ledAC", "ledHL", "ledHR"] },
      { id: "g-rec", name: "Records", nodeIds: ["recY2", "recY3", "recY4", "recZ2", "recZ3", "recZ4"] },
    ],
    cableStyle: "curve",
  };
}

export async function seedJpmDrawing(userId: string) {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const existing = await sql<{ id: number }>`
    select id from drawings where user_id = ${userId} and template_key = ${"jpm"}
  `;
  if (existing.length) return;
  const rows = await sql<{ id: number; model: string; maker: string; pins_json: string }>`
    select e.id, e.model, m.name as maker, e.pins_json
    from equipment e
    join manufacturers m on m.id = e.manufacturer_id and m.user_id = e.user_id
    where e.user_id = ${userId}
  `;
  const graph = buildJpm(
    rows.map((row) => ({ id: row.id, maker: row.maker, model: row.model, pins: parsePins(row.pins_json) })),
  );
  await sql`
    insert into drawings (user_id, name, template_key, graph_json)
    values (${userId}, ${"JPM"}, ${"jpm"}, ${JSON.stringify(graph)})
  `;
}
