/** A saved show. Gear inside a system is not stored here; the system is one node. */

export type DrawingTitle = {
  event: string;
  location: string;
  date: string;
  drawnBy: string;
  version: string;
};

export type DrawingNode = {
  id: string;
  equipmentId: number;
  unitId: string;
  ip: string;
  specialNotes: string;
  x: number;
  y: number;
};

export type DrawingEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  length: string;
  notes: string;
};

export type DrawingGroup = {
  id: string;
  name: string;
  nodeIds: string[];
};

export type DrawingFile = {
  title: DrawingTitle;
  nodes: DrawingNode[];
  edges: DrawingEdge[];
  groups: DrawingGroup[];
};

export const EMPTY_TITLE: DrawingTitle = {
  event: "",
  location: "",
  date: "",
  drawnBy: "",
  version: "",
};

export function emptyDrawing(): DrawingFile {
  return { title: { ...EMPTY_TITLE }, nodes: [], edges: [], groups: [] };
}

export function asDrawingFile(raw: unknown): DrawingFile {
  const file = (raw && typeof raw === "object" ? raw : {}) as Partial<DrawingFile>;
  const title = (file.title ?? {}) as Partial<DrawingTitle>;
  return {
    title: {
      event: String(title.event ?? ""),
      location: String(title.location ?? ""),
      date: String(title.date ?? ""),
      drawnBy: String(title.drawnBy ?? ""),
      version: String(title.version ?? ""),
    },
    nodes: Array.isArray(file.nodes) ? file.nodes : [],
    edges: Array.isArray(file.edges) ? file.edges : [],
    groups: Array.isArray(file.groups) ? file.groups : [],
  };
}
