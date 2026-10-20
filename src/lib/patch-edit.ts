/** Patch-sheet edits. A row is one cable. Changing a connection moves that cable. */

export type PatchPin = { id: string; label: string; direction: "input" | "output"; signal: string };
export type PatchBox = { id: string; unitId: string; pins: PatchPin[] };
export type PatchCable = {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  length: string;
  notes: string;
};
export type PatchField = "sourceUnit" | "from" | "to" | "destUnit" | "length" | "notes";

const SDI_LEVEL: Record<string, number> = { "3G-SDI": 3, "12G-SDI": 12 };

function signalsFit(source: string, target: string): "same" | "sdi" | "no" {
  if (source === target) return "same";
  const from = SDI_LEVEL[source];
  const to = SDI_LEVEL[target];
  if (from && to && from < to) return "sdi";
  return "no";
}

function pinLabel(boxes: PatchBox[], nodeId: string, pinId: string) {
  return boxes.find((box) => box.id === nodeId)?.pins.find((pin) => pin.id === pinId)?.label ?? "";
}

export function assignCable(
  boxes: PatchBox[],
  cables: PatchCable[],
  edgeId: string,
  change: {
    sourceId?: string;
    destId?: string;
    sourceUnit?: string;
    destUnit?: string;
    from?: string;
    to?: string;
    length?: string;
    notes?: string;
  },
): { cables: PatchCable[]; error: string | null; signal: string } {
  const current = cables.find((cable) => cable.id === edgeId);
  if (!current) return { cables, error: "That cable is not on the drawing.", signal: "" };
  const sourceBox = change.sourceId
    ? boxes.find((box) => box.id === change.sourceId)
    : change.sourceUnit !== undefined
      ? boxes.find((box) => box.unitId === change.sourceUnit)
      : boxes.find((box) => box.id === current.source);
  const targetBox = change.destId
    ? boxes.find((box) => box.id === change.destId)
    : change.destUnit !== undefined
      ? boxes.find((box) => box.unitId === change.destUnit)
      : boxes.find((box) => box.id === current.target);
  if (!sourceBox) return { cables, error: "No box uses that unit ID.", signal: "" };
  if (!targetBox) return { cables, error: "No box uses that unit ID.", signal: "" };
  const fromLabel = change.from ?? pinLabel(boxes, current.source, current.sourceHandle);
  const toLabel = change.to ?? pinLabel(boxes, current.target, current.targetHandle);
  const sourcePin = sourceBox.pins.find((pin) => pin.direction === "output" && pin.label === fromLabel);
  const targetPin = targetBox.pins.find((pin) => pin.direction === "input" && pin.label === toLabel);
  if (!sourcePin) return { cables, error: "That output is not on this box.", signal: "" };
  if (!targetPin) return { cables, error: "That input is not on this box.", signal: "" };
  if (sourceBox.id === targetBox.id) return { cables, error: "A box cannot cable to itself.", signal: "" };
  const fit = signalsFit(sourcePin.signal, targetPin.signal);
  if (fit === "no") {
    const from = SDI_LEVEL[sourcePin.signal];
    const to = SDI_LEVEL[targetPin.signal];
    if (from && to && from > to) {
      return { cables, error: `${sourcePin.signal} will not lock on a ${targetPin.signal} connection.`, signal: "" };
    }
    return { cables, error: `${sourcePin.signal} cannot connect to ${targetPin.signal}.`, signal: "" };
  }
  const others = cables.filter((cable) => cable.id !== edgeId);
  if (others.some((cable) => cable.source === sourceBox.id && cable.sourceHandle === sourcePin.id)) {
    return { cables, error: "That output already has a cable.", signal: "" };
  }
  if (others.some((cable) => cable.target === targetBox.id && cable.targetHandle === targetPin.id)) {
    return { cables, error: "That input already has a cable.", signal: "" };
  }
  const next: PatchCable = {
    id: edgeId,
    source: sourceBox.id,
    target: targetBox.id,
    sourceHandle: sourcePin.id,
    targetHandle: targetPin.id,
    length: change.length ?? current.length,
    notes: change.notes ?? current.notes,
  };
  return { cables: cables.map((cable) => (cable.id === edgeId ? next : cable)), error: null, signal: sourcePin.signal };
}

export function reassignCable(
  boxes: PatchBox[],
  cables: PatchCable[],
  edgeId: string,
  field: PatchField,
  value: string,
  unitBy: "id" | "unit" = "id",
): { cables: PatchCable[]; error: string | null; signal: string } {
  if (field === "length" || field === "notes") return assignCable(boxes, cables, edgeId, { [field]: value });
  if (field === "from") return assignCable(boxes, cables, edgeId, { from: value });
  if (field === "to") return assignCable(boxes, cables, edgeId, { to: value });
  if (field === "sourceUnit") {
    return assignCable(boxes, cables, edgeId, unitBy === "id" ? { sourceId: value } : { sourceUnit: value });
  }
  return assignCable(boxes, cables, edgeId, unitBy === "id" ? { destId: value } : { destUnit: value });
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((item) => item.trim())) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  row.push(cell);
  if (row.some((item) => item.trim())) rows.push(row);
  return rows;
}

export function applyPatchCsv(
  boxes: PatchBox[],
  cables: PatchCable[],
  text: string,
): { cables: PatchCable[]; applied: number; errors: string[] } {
  const table = parseCsv(text);
  const header = (table[0] ?? []).map((cell) => cell.trim().toLowerCase());
  const column = (name: string) => header.indexOf(name);
  const idCol = column("cable id");
  if (idCol < 0) return { cables, applied: 0, errors: ["The CSV needs a Cable ID column."] };
  let next = cables;
  let applied = 0;
  const errors: string[] = [];
  table.slice(1).forEach((cells, index) => {
    const edgeId = cells[idCol]?.trim();
    if (!edgeId) return;
    const at = (name: string) => {
      const indexOf = column(name);
      return indexOf < 0 ? undefined : (cells[indexOf] ?? "");
    };
    const result = assignCable(boxes, next, edgeId, {
      sourceUnit: at("source unit id"),
      from: at("from connection"),
      destUnit: at("destination unit id"),
      to: at("to connection"),
      length: at("length"),
      notes: at("notes"),
    });
    if (result.error) {
      errors.push(`Row ${index + 2}: ${result.error}`);
      return;
    }
    next = result.cables;
    applied += 1;
  });
  return { cables: next, applied, errors };
}
