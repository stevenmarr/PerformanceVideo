/**
 * Saved show drawing. A lower SDI rate can land on a faster SDI connection.
 * Each connection takes one cable. Selection matches a desktop file manager:
 * drag empty canvas to replace, Shift adds, Ctrl or Command toggles.
 * Drag a selected box to move the whole selection.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ViewportPortal,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Catalog, EquipmentRow, Pin } from "@/lib/catalog.functions";
import { saveSystem } from "@/lib/drawing.functions";
import type { DrawingFile, DrawingGroup, DrawingTitle } from "@/lib/drawing";
import { GearNodeCard, gearNodeSize } from "@/components/gear-node";

type EquipmentNodeData = {
  equipmentId: number;
  unitId: string;
  ip: string;
  specialNotes: string;
  deviceType: string;
  manufacturer: string;
  model: string;
  kind: string;
  color: string;
  pins: Pin[];
  signalColors: Record<string, string>;
};

type EquipmentNode = Node<EquipmentNodeData, "equipment">;
type CableData = { length: string; notes: string; signal: string };
type CableEdge = Edge<CableData>;
type ShowGroup = DrawingGroup;

type CanvasMenu =
  | { kind: "pane"; x: number; y: number; flowX: number; flowY: number }
  | { kind: "node"; x: number; y: number; nodeId: string }
  | { kind: "edge"; x: number; y: number; edgeId: string };

type PortChoice = {
  key: string;
  nodeId: string;
  pinId: string;
  unitId: string;
  label: string;
  direction: "input" | "output";
  signal: string;
  internal: boolean;
  expose: boolean;
};

type DrawingListItem = { id: number; name: string; templateKey: string };

type MarqueeMode = "replace" | "add" | "toggle";

type MarqueeGesture = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  lastClientX: number;
  lastClientY: number;
  startX: number;
  startY: number;
  mode: MarqueeMode;
  snapshot: Set<string>;
  moved: boolean;
  latest: Set<string>;
};

const SDI_LEVEL: Record<string, number> = {
  "3G-SDI": 3,
  "12G-SDI": 12,
};

function signalsFit(source: string, target: string): "same" | "sdi" | "no" {
  if (source === target) return "same";
  const from = SDI_LEVEL[source];
  const to = SDI_LEVEL[target];
  if (from && to && from < to) return "sdi";
  return "no";
}

function EquipmentNodeView({ data, selected }: NodeProps<EquipmentNode>) {
  return (
    <GearNodeCard
      wired
      selected={Boolean(selected)}
      deviceType={data.deviceType}
      manufacturer={data.manufacturer}
      model={data.model}
      unitId={data.unitId}
      ip={data.ip}
      specialNotes={data.specialNotes}
      color={data.color}
      pins={data.pins}
      signalColors={data.signalColors}
    />
  );
}

const nodeTypes = { equipment: EquipmentNodeView };

function pinOf(nodes: EquipmentNode[], nodeId: string | null | undefined, handleId: string | null | undefined) {
  if (!nodeId || !handleId) return null;
  const node = nodes.find((item) => item.id === nodeId);
  return node?.data.pins.find((pin) => pin.id === handleId) ?? null;
}

function rejectReason(
  nodes: EquipmentNode[],
  edges: CableEdge[],
  connection: { source?: string | null; target?: string | null; sourceHandle?: string | null; targetHandle?: string | null },
): string | null {
  if (!connection.source || !connection.target || connection.source === connection.target) {
    return "A box cannot cable to itself.";
  }
  const sourcePin = pinOf(nodes, connection.source, connection.sourceHandle);
  const targetPin = pinOf(nodes, connection.target, connection.targetHandle);
  if (!sourcePin || !targetPin) return "Pick a connection on each box.";
  if (sourcePin.direction !== "output" || targetPin.direction !== "input") {
    return "Drag from an output to an input.";
  }
  const fit = signalsFit(sourcePin.signal, targetPin.signal);
  if (fit === "no") {
    const from = SDI_LEVEL[sourcePin.signal];
    const to = SDI_LEVEL[targetPin.signal];
    if (from && to && from > to) {
      return `${sourcePin.signal} will not lock on a ${targetPin.signal} connection.`;
    }
    return `${sourcePin.signal} cannot connect to ${targetPin.signal}.`;
  }
  const takenOut = edges.some(
    (edge) => edge.source === connection.source && edge.sourceHandle === connection.sourceHandle,
  );
  const takenIn = edges.some(
    (edge) => edge.target === connection.target && edge.targetHandle === connection.targetHandle,
  );
  if (takenOut || takenIn) return "That connection already has a cable. Fan-out needs a distribution box.";
  return null;
}

function signalMap(catalog: Catalog) {
  const map: Record<string, string> = {};
  for (const signal of catalog.connectionTypes) map[signal.name] = signal.color;
  return map;
}

function hydrate(file: DrawingFile, catalog: Catalog) {
  const colors = signalMap(catalog);
  const gear = new Map(catalog.equipment.map((item) => [item.id, item]));
  const nodes: EquipmentNode[] = [];
  let missing = 0;
  for (const item of file.nodes) {
    const row = gear.get(item.equipmentId);
    if (!row) {
      missing += 1;
      continue;
    }
    nodes.push({
      id: item.id,
      type: "equipment",
      position: { x: item.x, y: item.y },
      data: {
        equipmentId: row.id,
        unitId: item.unitId,
        ip: item.ip ?? "",
        specialNotes: item.specialNotes ?? "",
        deviceType: row.deviceType,
        manufacturer: row.manufacturer,
        model: row.model,
        kind: row.kind,
        color: catalog.deviceTypes.find((type) => type.id === row.deviceTypeId)?.color ?? "#3f3a34",
        pins: row.pins,
        signalColors: colors,
      },
    });
  }
  const ids = new Set(nodes.map((node) => node.id));
  const edges: CableEdge[] = [];
  for (const edge of file.edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) continue;
    const signal = pinOf(nodes, edge.source, edge.sourceHandle)?.signal ?? "";
    edges.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      data: { length: edge.length ?? "", notes: edge.notes ?? "", signal },
      label: edge.length || undefined,
      labelStyle: { fill: "#f3efe6", fontSize: 11 },
      labelBgStyle: { fill: "#1c1a17" },
      style: { stroke: colors[signal] ?? "#e7e5e4", strokeWidth: 2 },
    });
  }
  const groups = file.groups
    .map((group) => ({ ...group, nodeIds: group.nodeIds.filter((id) => ids.has(id)) }))
    .filter((group) => group.nodeIds.length > 0);
  return { nodes, edges, groups, missing };
}

function toFile(nodes: EquipmentNode[], edges: CableEdge[], groups: ShowGroup[], title: DrawingTitle): DrawingFile {
  return {
    title,
    nodes: nodes.map((node) => ({
      id: node.id,
      equipmentId: node.data.equipmentId,
      unitId: node.data.unitId,
      ip: node.data.ip,
      specialNotes: node.data.specialNotes,
      x: node.position.x,
      y: node.position.y,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? "",
      targetHandle: edge.targetHandle ?? "",
      length: edge.data?.length ?? "",
      notes: edge.data?.notes ?? "",
    })),
    groups,
  };
}

function nodeBox(node: EquipmentNode) {
  return gearNodeSize(node.data.pins, { ip: node.data.ip, notes: node.data.specialNotes });
}

function downloadCsv(filename: string, rows: string[][]) {
  const body = rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function slugName(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || "drawing";
}

export function FlowCanvas({
  catalog,
  drawing,
  drawings,
  onOpen,
  onSave,
  onCreate,
  onDelete,
  onLibraryChange,
}: {
  catalog: Catalog;
  drawing: { id: number | null; name: string; graph: DrawingFile };
  drawings: DrawingListItem[];
  onOpen: (id: number) => void;
  onSave: (payload: { id: number | null; name: string; graph: DrawingFile }) => Promise<{ id: number | null; error: string | null }>;
  onCreate: () => void;
  onDelete: (id: number) => Promise<void>;
  onLibraryChange: () => Promise<void>;
}) {
  const seeded = hydrate(drawing.graph, catalog);
  const [nodes, setNodes, onNodesChange] = useNodesState<EquipmentNode>(seeded.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<CableEdge>(seeded.edges);
  const [hint, setHint] = useState(
    seeded.missing
      ? "Some boxes on this drawing are no longer in the library."
      : drawing.graph.nodes.length
        ? `${drawing.name} is open. Click a box to edit its unit ID, IP, and notes.`
        : "Place gear, then drag an output to an input it can lock.",
  );
  const [drawingId, setDrawingId] = useState(drawing.id);
  const [name, setName] = useState(drawing.name);
  const [title, setTitle] = useState<DrawingTitle>(drawing.graph.title);
  const [sheet, setSheet] = useState<"draw" | "patch" | "pull">("draw");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const signalColors = useMemo(() => signalMap(catalog), [catalog]);

  const groups = useMemo(() => {
    const map = new Map<string, EquipmentRow[]>();
    for (const item of catalog.equipment) {
      const list = map.get(item.deviceType) ?? [];
      list.push(item);
      map.set(item.deviceType, list);
    }
    return [...map.entries()];
  }, [catalog.equipment]);

  const place = useCallback(
    (item: EquipmentRow, at?: { x: number; y: number }) => {
      const same = nodes.filter((node) => node.data.equipmentId === item.id);
      const stamp = `${item.deviceType.slice(0, 3).toUpperCase()}-${same.length + 1}`;
      const node: EquipmentNode = {
        id: `box-${item.id}-${Date.now()}`,
        type: "equipment",
        position: at ?? { x: 48 + (nodes.length % 3) * 320, y: 36 + Math.floor(nodes.length / 3) * 280 },
        data: {
          equipmentId: item.id,
          unitId: stamp,
          ip: "",
          specialNotes: "",
          deviceType: item.deviceType,
          manufacturer: item.manufacturer,
          model: item.model,
          kind: item.kind,
          color: catalog.deviceTypes.find((type) => type.id === item.deviceTypeId)?.color ?? "#3f3a34",
          pins: item.pins,
          signalColors,
        },
      };
      setNodes((current) => [...current, node]);
      setHint(`${item.manufacturer} ${item.model} placed as ${stamp}.`);
    },
    [catalog.deviceTypes, nodes, setNodes, signalColors],
  );

  const [showGroups, setShowGroups] = useState<ShowGroup[]>(seeded.groups);
  const [draft, setDraft] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [pendingGroup, setPendingGroup] = useState<string[] | null>(null);
  const [groupName, setGroupName] = useState("");
  const [menu, setMenu] = useState<CanvasMenu | null>(null);
  const [systemFor, setSystemFor] = useState<string | null>(null);
  const [systemName, setSystemName] = useState("");
  const [systemPorts, setSystemPorts] = useState<PortChoice[]>([]);
  const [systemError, setSystemError] = useState("");
  const [systemBusy, setSystemBusy] = useState(false);
  const flowRef = useRef<ReactFlowInstance<EquipmentNode, CableEdge> | null>(null);
  const nodesRef = useRef(nodes);
  const marqueeRef = useRef<MarqueeGesture | null>(null);
  const detachMarquee = useRef<(() => void) | null>(null);
  const suppressClickRef = useRef(false);
  const spaceRef = useRef(false);
  const nodeGestureRef = useRef<{ id: string; snapshot: Set<string> } | null>(null);
  nodesRef.current = nodes;

  useEffect(() => {
    const ids = new Set(nodes.map((node) => node.id));
    setShowGroups((current) => {
      const next = current
        .map((group) => ({ ...group, nodeIds: group.nodeIds.filter((id) => ids.has(id)) }))
        .filter((group) => group.nodeIds.length > 0);
      const unchanged =
        next.length === current.length &&
        next.every(
          (group, index) =>
            group.nodeIds.length === current[index]?.nodeIds.length &&
            group.nodeIds.every((id, pin) => id === current[index]?.nodeIds[pin]),
        );
      return unchanged ? current : next;
    });
  }, [nodes]);

  const edgeSelection = edges.map((edge) => (edge.selected ? "1" : "0")).join("");
  useEffect(() => {
    setEdges((current) => {
      let changed = false;
      const next = current.map((edge) => {
        const width = edge.selected ? 4 : 2;
        if (edge.style?.strokeWidth === width) return edge;
        changed = true;
        return { ...edge, style: { ...edge.style, strokeWidth: width } };
      });
      return changed ? next : current;
    });
  }, [edgeSelection, setEdges]);

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => rejectReason(nodes, edges, connection) === null,
    [nodes, edges],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const reason = rejectReason(nodes, edges, connection);
      if (reason) {
        setHint(reason);
        return;
      }
      const sourcePin = pinOf(nodes, connection.source, connection.sourceHandle);
      const targetPin = pinOf(nodes, connection.target, connection.targetHandle);
      const color = sourcePin ? (signalColors[sourcePin.signal] ?? "#e7e5e4") : "#e7e5e4";
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            data: { length: "", notes: "", signal: sourcePin?.signal ?? "" },
            style: { stroke: color, strokeWidth: 2 },
          },
          current,
        ),
      );
      const fit = sourcePin && targetPin ? signalsFit(sourcePin.signal, targetPin.signal) : "same";
      setHint(
        fit === "sdi" && sourcePin && targetPin
          ? `${sourcePin.signal} into a ${targetPin.signal} connection.`
          : sourcePin
            ? `${sourcePin.signal} cable added.`
            : "Cable added.",
      );
    },
    [edges, nodes, setEdges, signalColors],
  );

  const selectedNodes = nodes.filter((node) => node.selected);
  const selectedEdges = edges.filter((edge) => edge.selected);
  const removeLabel =
    selectedNodes.length === 1
      ? `Remove ${selectedNodes[0].data.unitId || "box"}`
      : selectedNodes.length > 1
        ? `Remove ${selectedNodes.length}`
        : selectedEdges.length === 1
          ? "Remove cable"
          : selectedEdges.length > 1
            ? `Remove ${selectedEdges.length} cables`
            : "Remove";

  const removeIds = useCallback(
    (nodeIds: string[], edgeIds: string[]) => {
      const doomed = new Set(nodeIds);
      const edgeDoomed = new Set(edgeIds);
      if (doomed.size === 0 && edgeDoomed.size === 0) {
        setHint("Select a box or a cable first. A selected box has a light outline.");
        return;
      }
      setNodes((current) => current.filter((node) => !doomed.has(node.id)));
      setEdges((current) =>
        current.filter((edge) => !edgeDoomed.has(edge.id) && !doomed.has(edge.source) && !doomed.has(edge.target)),
      );
      setMenu(null);
      setHint("Removed from this drawing only. The library model stays.");
    },
    [setEdges, setNodes],
  );

  const applySelection = useCallback(
    (ids: Set<string>) => {
      setNodes((current) => {
        let changed = false;
        const next = current.map((node) => {
          const selected = ids.has(node.id);
          if (Boolean(node.selected) === selected) return node;
          changed = true;
          return { ...node, selected };
        });
        return changed ? next : current;
      });
      setEdges((current) => {
        let changed = false;
        const next = current.map((edge) => {
          const selected = ids.has(edge.source) && ids.has(edge.target);
          if (Boolean(edge.selected) === selected) return edge;
          changed = true;
          return { ...edge, selected };
        });
        return changed ? next : current;
      });
    },
    [setEdges, setNodes],
  );

  const selectedSnapshot = useCallback(
    () => new Set(nodesRef.current.filter((node) => node.selected).map((node) => node.id)),
    [],
  );

  function paintMarquee(gesture: MarqueeGesture, clientX: number, clientY: number) {
    const flow = flowRef.current;
    if (!flow) return new Set<string>();
    const point = flow.screenToFlowPosition({ x: clientX, y: clientY });
    const rect = { x1: gesture.startX, y1: gesture.startY, x2: point.x, y2: point.y };
    setDraft(rect);
    const hit = nodesRef.current.filter((node) => overlaps(node, normalize(rect))).map((node) => node.id);
    const next = pickSelection(gesture.mode, gesture.snapshot, hit);
    applySelection(next);
    return next;
  }

  function stopMarqueeListeners() {
    detachMarquee.current?.();
    detachMarquee.current = null;
  }

  function onCanvasPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.pointerType === "touch") return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (spaceRef.current && target.closest(".react-flow__pane")) {
      const startX = event.clientX;
      const startY = event.clientY;
      const pointerId = event.pointerId;
      const onUp = (up: globalThis.PointerEvent) => {
        if (up.pointerId !== pointerId) return;
        window.removeEventListener("pointerup", onUp);
        if (Math.hypot(up.clientX - startX, up.clientY - startY) > 3) suppressClickRef.current = true;
      };
      window.addEventListener("pointerup", onUp);
      return;
    }
    if (target.closest(".react-flow__handle")) return;
    const nodeEl = target.closest(".react-flow__node");
    if (nodeEl) {
      const id = nodeEl.getAttribute("data-id");
      if (!id) return;
      nodeGestureRef.current = { id, snapshot: selectedSnapshot() };
      return;
    }
    if (
      target.closest(
        "input, textarea, select, button, a, .react-flow__controls, .react-flow__minimap, .react-flow__panel, .react-flow__edge, .react-flow__attribution",
      )
    ) {
      return;
    }
    if (!target.closest(".react-flow__pane") || !flowRef.current) return;
    const point = flowRef.current.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const gesture: MarqueeGesture = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      startX: point.x,
      startY: point.y,
      mode: event.shiftKey ? "add" : event.metaKey || event.ctrlKey ? "toggle" : "replace",
      snapshot: selectedSnapshot(),
      moved: false,
      latest: selectedSnapshot(),
    };
    marqueeRef.current = gesture;
    const onMove = (move: globalThis.PointerEvent) => {
      const current = marqueeRef.current;
      if (!current || move.pointerId !== current.pointerId) return;
      if (!current.moved && Math.hypot(move.clientX - current.startClientX, move.clientY - current.startClientY) < 5) return;
      current.moved = true;
      current.lastClientX = move.clientX;
      current.lastClientY = move.clientY;
      current.latest = paintMarquee(current, move.clientX, move.clientY);
    };
    const onUp = (up: globalThis.PointerEvent) => {
      const current = marqueeRef.current;
      if (!current || up.pointerId !== current.pointerId) return;
      stopMarqueeListeners();
      marqueeRef.current = null;
      setDraft(null);
      if (!current.moved) return;
      suppressClickRef.current = true;
      const dropped = up.clientX === 0 && up.clientY === 0 && (current.lastClientX !== 0 || current.lastClientY !== 0);
      const next = dropped ? current.latest : paintMarquee(current, up.clientX, up.clientY);
      setDraft(null);
      const count = next.size;
      setHint(
        count > 1
          ? `${count} boxes selected. Drag any one to move them together.`
          : count === 1
            ? "1 box selected."
            : "Nothing in that square.",
      );
    };
    detachMarquee.current = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function onCanvasClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.stopPropagation();
    event.preventDefault();
  }

  function onNodePointerClick(event: MouseEvent, node: EquipmentNode) {
    setMenu(null);
    const gesture = nodeGestureRef.current;
    if (!gesture || gesture.id !== node.id) return;
    if (event.shiftKey) {
      const next = new Set(gesture.snapshot);
      next.add(node.id);
      applySelection(next);
      return;
    }
    // Ctrl+click is a context menu on macOS. Everywhere else it toggles, like a file manager.
    if (event.metaKey || (event.ctrlKey && !isMacPlatform())) {
      applySelection(toggled(gesture.snapshot, node.id));
      return;
    }
    if (event.ctrlKey) return;
    applySelection(new Set([node.id]));
  }

  function startGroup() {
    const ids = nodes.filter((node) => node.selected).map((node) => node.id);
    if (ids.length < 2) {
      setHint("Select at least two boxes, then group them.");
      return;
    }
    setPendingGroup(ids);
    setGroupName(`Group ${showGroups.length + 1}`);
    setDraft(null);
    setSystemFor(null);
  }

  function commitGroup(event: FormEvent) {
    event.preventDefault();
    if (!pendingGroup) return;
    const label = groupName.trim() || "Group";
    const taken = new Set(pendingGroup);
    setShowGroups((current) => [
      ...current
        .map((group) => ({ ...group, nodeIds: group.nodeIds.filter((id) => !taken.has(id)) }))
        .filter((group) => group.nodeIds.length > 0),
      { id: `group-${Date.now()}`, name: label, nodeIds: pendingGroup },
    ]);
    setPendingGroup(null);
    setHint(`${label} stays together. Save it as a system if you want to place it again as one box.`);
  }

  function openSystem(group: ShowGroup) {
    const ids = new Set(group.nodeIds);
    const internal = new Set<string>();
    for (const edge of edges) {
      if (!ids.has(edge.source) || !ids.has(edge.target)) continue;
      if (edge.sourceHandle) internal.add(`${edge.source}:${edge.sourceHandle}`);
      if (edge.targetHandle) internal.add(`${edge.target}:${edge.targetHandle}`);
    }
    const ports: PortChoice[] = [];
    for (const nodeId of group.nodeIds) {
      const node = nodes.find((item) => item.id === nodeId);
      if (!node) continue;
      for (const pin of node.data.pins) {
        const inside = internal.has(`${node.id}:${pin.id}`);
        ports.push({
          key: `${node.id}:${pin.id}`,
          nodeId: node.id,
          pinId: pin.id,
          unitId: node.data.unitId,
          label: pin.label,
          direction: pin.direction,
          signal: pin.signal,
          internal: inside,
          expose: !inside,
        });
      }
    }
    setSystemFor(group.id);
    setSystemName(group.name);
    setSystemPorts(ports);
    setSystemError("");
    setPendingGroup(null);
    setMenu(null);
  }

  async function commitSystem(event: FormEvent) {
    event.preventDefault();
    const group = showGroups.find((item) => item.id === systemFor);
    if (!group) return;
    const chosen = systemPorts.filter((port) => port.expose);
    if (!chosen.length) {
      setSystemError("Expose at least one connection.");
      return;
    }
    const members = nodes.filter((node) => group.nodeIds.includes(node.id));
    const minX = Math.min(...members.map((node) => node.position.x));
    const minY = Math.min(...members.map((node) => node.position.y));
    const memberIds = new Set(group.nodeIds);
    setSystemBusy(true);
    setSystemError("");
    const result = await saveSystem({
      data: {
        name: systemName,
        notes: "Saved from a drawing group. The pull list counts this as one unit.",
        ports: chosen.map((port) => ({
          nodeId: port.nodeId,
          pinId: port.pinId,
          label: `${port.unitId} ${port.label}`,
          direction: port.direction,
          signal: port.signal,
        })),
        graph: {
          nodes: members.map((node) => ({
            id: node.id,
            equipmentId: node.data.equipmentId,
            unitId: node.data.unitId,
            ip: node.data.ip,
            specialNotes: node.data.specialNotes,
            x: node.position.x - minX,
            y: node.position.y - minY,
          })),
          edges: edges
            .filter((edge) => memberIds.has(edge.source) && memberIds.has(edge.target))
            .map((edge) => ({
              id: edge.id,
              source: edge.source,
              target: edge.target,
              sourceHandle: edge.sourceHandle ?? "",
              targetHandle: edge.targetHandle ?? "",
              length: edge.data?.length ?? "",
              notes: edge.data?.notes ?? "",
            })),
          ports: [],
        },
      },
    });
    setSystemBusy(false);
    if (result.error) {
      setSystemError(result.error);
      return;
    }
    await onLibraryChange();
    setSystemFor(null);
    setHint(`${systemName.trim() || group.name} is in the library under System. It counts as one unit.`);
  }

  async function save() {
    setHint("Saving…");
    const result = await onSave({ id: drawingId, name, graph: toFile(nodes, edges, showGroups, title) });
    if (result.error || result.id == null) {
      setHint(result.error || "The drawing could not be saved.");
      return;
    }
    setDrawingId(result.id);
    setConfirmDelete(false);
    setHint(`${name.trim() || "Drawing"} saved.`);
  }

  function patchNode(id: string, patch: Partial<EquipmentNodeData>) {
    setNodes((current) => current.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...patch } } : node)));
  }

  function patchEdge(id: string, patch: Partial<CableData>) {
    setEdges((current) =>
      current.map((edge) => {
        if (edge.id !== id) return edge;
        const data = { length: edge.data?.length ?? "", notes: edge.data?.notes ?? "", signal: edge.data?.signal ?? "", ...patch };
        return {
          ...edge,
          data,
          label: data.length || undefined,
          labelStyle: { fill: "#f3efe6", fontSize: 11 },
          labelBgStyle: { fill: "#1c1a17" },
        };
      }),
    );
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if (event.code === "Space" && !typing) spaceRef.current = true;
      if (event.key !== "Escape" || !marqueeRef.current) return;
      const gesture = marqueeRef.current;
      stopMarqueeListeners();
      marqueeRef.current = null;
      setDraft(null);
      if (gesture.moved) applySelection(gesture.snapshot);
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") spaceRef.current = false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      detachMarquee.current?.();
    };
  }, [applySelection]);

  const active = selectedNodes.length === 1 ? selectedNodes[0] : null;
  const patch = patchRows(nodes, edges);
  const pull = pullRows(nodes);
  const fileSlug = slugName(name);
  const titleLine = [title.event, title.location, title.date, title.drawnBy, title.version ? `v${title.version}` : ""]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside className="max-h-40 shrink-0 overflow-y-auto border-b border-line bg-panel md:max-h-none md:w-72 md:border-r md:border-b-0">
        <Picker categories={groups} />
      </aside>
      <div className="relative min-h-0 min-w-0 flex-1">
        <div className="pointer-events-none absolute top-3 right-3 left-3 z-30 flex flex-wrap items-start justify-between gap-2">
          <div className="pointer-events-none flex max-w-xl flex-col gap-2">
            <p className="rounded-full border border-line bg-panel px-4 py-2 text-sm shadow-sm">{hint}</p>
            {titleLine ? <p className="px-4 text-xs text-muted">{titleLine}</p> : null}
            <p className="px-4 text-xs text-muted">Drag empty canvas to select. Shift adds. Ctrl or ⌘ toggles. Space or the middle mouse pans.</p>
          </div>
          <div className="pointer-events-auto flex max-w-full flex-wrap justify-end gap-2">
            <select
              aria-label="Open a drawing"
              className="max-w-40 rounded-full border border-line bg-panel px-3 py-2 text-sm text-ink"
              value={drawingId ?? ""}
              onChange={(event) => {
                const id = Number(event.target.value);
                if (id) onOpen(id);
              }}
            >
              {drawingId == null ? <option value="">Unsaved drawing</option> : null}
              {drawings.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <input
              aria-label="Drawing name"
              className="w-36 rounded-full border border-line bg-panel px-3 py-2 text-sm text-ink outline-none"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <button type="button" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper" onClick={() => void save()}>
              Save
            </button>
            <button type="button" className="rounded-full border border-line bg-panel px-4 py-2 text-sm" onClick={onCreate}>
              New
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-semibold ${sheet === "patch" ? "bg-ink text-paper" : "border border-line bg-panel"}`}
              onClick={() => setSheet((current) => (current === "patch" ? "draw" : "patch"))}
            >
              Patch
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-semibold ${sheet === "pull" ? "bg-ink text-paper" : "border border-line bg-panel"}`}
              onClick={() => setSheet((current) => (current === "pull" ? "draw" : "pull"))}
            >
              Pull list
            </button>
            {selectedNodes.length >= 2 ? (
              <button type="button" className="rounded-full border border-line bg-panel px-4 py-2 text-sm font-semibold" onClick={startGroup}>
                Group
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper"
              onClick={() =>
                removeIds(
                  selectedNodes.map((node) => node.id),
                  selectedEdges.map((edge) => edge.id),
                )
              }
            >
              {removeLabel}
            </button>
          </div>
        </div>
        {pendingGroup ? (
          <form
            onSubmit={commitGroup}
            className="absolute top-28 left-3 z-30 flex flex-wrap items-center gap-2 rounded-full border border-line bg-panel px-3 py-2 shadow-sm"
          >
            <label className="text-sm">
              Group name
              <input
                className="ml-2 rounded-full border border-line bg-paper px-3 py-1 text-ink outline-none"
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                autoFocus
              />
            </label>
            <button type="submit" className="text-sm font-semibold">
              Save group
            </button>
            <button type="button" className="text-sm text-muted" onClick={() => setPendingGroup(null)}>
              Cancel
            </button>
          </form>
        ) : null}
        {systemFor ? (
          <form
            onSubmit={(event) => void commitSystem(event)}
            className="absolute top-28 left-3 z-30 w-80 rounded-2xl border border-line bg-panel p-4 shadow-lg"
          >
            <p className="text-sm font-semibold">Save group as a system</p>
            <p className="mt-1 text-xs text-muted">
              Connections cabled inside the group start unchecked. The system places as one box and counts as one on the pull list.
            </p>
            <label className="mt-3 block text-sm">
              Name
              <input
                className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-ink outline-none"
                value={systemName}
                onChange={(event) => setSystemName(event.target.value)}
              />
            </label>
            <ul className="mt-3 max-h-48 space-y-2 overflow-auto">
              {systemPorts.map((port) => (
                <li key={port.key}>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={port.expose}
                      onChange={(event) =>
                        setSystemPorts((current) =>
                          current.map((item) => (item.key === port.key ? { ...item, expose: event.target.checked } : item)),
                        )
                      }
                    />
                    <span>
                      {port.unitId} {port.label}
                      <span className="block text-xs text-muted">
                        {port.direction} · {port.signal}
                        {port.internal ? " · cabled inside" : ""}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {systemError ? <p className="mt-2 text-sm text-danger">{systemError}</p> : null}
            <div className="mt-3 flex gap-3">
              <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper" disabled={systemBusy}>
                {systemBusy ? "Saving…" : "Save system"}
              </button>
              <button type="button" className="text-sm text-muted" onClick={() => setSystemFor(null)}>
                Cancel
              </button>
            </div>
          </form>
        ) : null}
        {active && sheet === "draw" ? (
          <form
            className="absolute bottom-3 left-3 z-30 w-72 rounded-2xl border border-ink bg-panel p-4 shadow-lg"
            onSubmit={(event) => event.preventDefault()}
          >
            <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">This instance</p>
            <p className="mt-1 text-sm font-semibold">
              {active.data.manufacturer} {active.data.model}
            </p>
            {active.data.kind === "system" ? (
              <p className="text-xs text-muted">System. The pull list counts it as one unit.</p>
            ) : null}
            <label className="mt-3 block text-sm">
              Unit ID
              <input
                className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-ink outline-none"
                value={active.data.unitId}
                onChange={(event) => {
                  const unitId = event.target.value;
                  patchNode(active.id, { unitId });
                  const clash = nodes.some((node) => node.id !== active.id && node.data.unitId === unitId && unitId.trim());
                  if (clash) setHint(`${unitId} is already used on this drawing.`);
                }}
              />
            </label>
            <label className="mt-2 block text-sm">
              IP address
              <input
                className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-ink outline-none"
                value={active.data.ip}
                placeholder="192.168.0.175"
                onChange={(event) => patchNode(active.id, { ip: event.target.value })}
              />
            </label>
            <label className="mt-2 block text-sm">
              Special notes
              <input
                className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-ink outline-none"
                value={active.data.specialNotes}
                onChange={(event) => patchNode(active.id, { specialNotes: event.target.value })}
              />
            </label>
          </form>
        ) : null}
        <div className="absolute inset-0" onPointerDownCapture={onCanvasPointerDown} onClickCapture={onCanvasClickCapture}>
          <ReactFlow
            colorMode="dark"
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            nodeTypes={nodeTypes}
            onInit={(instance) => {
              flowRef.current = instance;
            }}
            onNodesDelete={(deleted) => {
              const ids = new Set(deleted.map((node) => node.id));
              setEdges((current) => current.filter((edge) => !ids.has(edge.source) && !ids.has(edge.target)));
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(event) => {
              event.preventDefault();
              const id = Number(event.dataTransfer.getData("text/gear-id"));
              const item = catalog.equipment.find((row) => row.id === id);
              const flow = flowRef.current;
              if (!item || !flow) return;
              place(item, flow.screenToFlowPosition({ x: event.clientX, y: event.clientY }));
            }}
            onPaneContextMenu={(event) => {
              event.preventDefault();
              const flow = flowRef.current;
              if (!flow) return;
              const point = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
              setMenu({ kind: "pane", x: event.clientX, y: event.clientY, flowX: point.x, flowY: point.y });
            }}
            onNodeContextMenu={(event, node) => {
              event.preventDefault();
              if (event.ctrlKey && !event.metaKey && !isMacPlatform()) return;
              setNodes((current) => {
                const already = current.some((item) => item.id === node.id && item.selected);
                const multi = current.filter((item) => item.selected).length > 1;
                if (already && multi) return current;
                return current.map((item) => ({ ...item, selected: item.id === node.id }));
              });
              setMenu({ kind: "node", x: event.clientX, y: event.clientY, nodeId: node.id });
            }}
            onEdgeContextMenu={(event, edge) => {
              event.preventDefault();
              setEdges((current) => current.map((item) => ({ ...item, selected: item.id === edge.id })));
              setMenu({ kind: "edge", x: event.clientX, y: event.clientY, edgeId: edge.id });
            }}
            onPaneClick={() => setMenu(null)}
            onNodeClick={onNodePointerClick}
            fitView
            minZoom={0.05}
            maxZoom={2}
            deleteKeyCode={["Backspace", "Delete"]}
            selectionKeyCode={null}
            selectionOnDrag={false}
            multiSelectionKeyCode={null}
            panOnDrag={[1]}
            panActivationKeyCode="Space"
            zoomOnScroll
          >
            <Background gap={18} size={1} color="#3a362f" />
            <Controls />
            <MiniMap pannable zoomable />
            <ViewportPortal>
              {showGroups.map((group) => {
                const members = nodes.filter((node) => group.nodeIds.includes(node.id));
                if (members.length === 0) return null;
                const frame = groupFrame(members);
                return (
                  <div
                    key={group.id}
                    className="pointer-events-none rounded-xl border-2 border-dashed border-[#a8a296]"
                    style={{ position: "absolute", left: frame.x, top: frame.y, width: frame.w, height: frame.h }}
                  >
                    <div className="pointer-events-auto absolute -top-3 left-3 flex gap-1">
                      <button
                        type="button"
                        className="rounded-full border border-line bg-panel px-2 py-0.5 text-xs font-semibold"
                        onClick={() => {
                          setShowGroups((current) => current.filter((item) => item.id !== group.id));
                          setHint(`${group.name} ungrouped. The boxes stay.`);
                        }}
                      >
                        {group.name} · ungroup
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-line bg-panel px-2 py-0.5 text-xs font-semibold"
                        onClick={() => openSystem(group)}
                      >
                        Save as system
                      </button>
                    </div>
                  </div>
                );
              })}
              {draft ? (
                <div
                  className="pointer-events-none rounded-sm border border-[#e7e5e4] bg-[#e7e5e4]/15"
                  style={{
                    position: "absolute",
                    zIndex: 1000,
                    left: normalize(draft).x,
                    top: normalize(draft).y,
                    width: normalize(draft).w,
                    height: normalize(draft).h,
                  }}
                />
              ) : null}
            </ViewportPortal>
          </ReactFlow>
        </div>
        {sheet !== "draw" ? (
          <ListSheet
            kind={sheet}
            title={title}
            onTitle={(next) => setTitle(next)}
            rows={sheet === "patch" ? patch : pull}
            filename={sheet === "patch" ? `${fileSlug}-patch.csv` : `${fileSlug}-pull.csv`}
            onClose={() => setSheet("draw")}
          />
        ) : null}
        {menu?.kind === "pane" ? (
          <GearMenu
            menu={menu}
            categories={groups}
            onClose={() => setMenu(null)}
            onPick={(item) => {
              place(item, { x: menu.flowX, y: menu.flowY });
              setMenu(null);
            }}
          />
        ) : null}
        {menu?.kind === "node" ? (
          <FixedMenu x={menu.x} y={menu.y} title={selectedNodes.length > 1 ? `${selectedNodes.length} boxes` : "This box"}>
            {selectedNodes.length > 1 ? (
              <>
                <button type="button" className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-paper" onClick={() => { startGroup(); setMenu(null); }}>
                  Group this selection
                </button>
                <button
                  type="button"
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-paper"
                  onClick={() => removeIds(selectedNodes.map((node) => node.id), [])}
                >
                  Remove this section
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-paper"
                  onClick={() => {
                    setNodes((current) => current.map((item) => ({ ...item, selected: item.id === menu.nodeId })));
                    setSheet("draw");
                    setMenu(null);
                  }}
                >
                  Edit unit ID, IP, notes
                </button>
                <button
                  type="button"
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-paper"
                  onClick={() => removeIds([menu.nodeId], [])}
                >
                  Remove from drawing
                </button>
              </>
            )}
          </FixedMenu>
        ) : null}
        {menu?.kind === "edge" ? (
          <EdgeMenu
            menu={menu}
            edge={edges.find((edge) => edge.id === menu.edgeId) ?? null}
            onChange={(patch) => patchEdge(menu.edgeId, patch)}
            onRemove={() => removeIds([], [menu.edgeId])}
            onClose={() => setMenu(null)}
          />
        ) : null}
        {drawingId != null ? (
          <div className="absolute right-3 bottom-3 z-30">
            {confirmDelete ? (
              <div className="flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-2 text-sm shadow-sm">
                <span>Delete this drawing? It will not come back.</span>
                <button
                  type="button"
                  className="font-semibold text-danger"
                  onClick={() => {
                    const id = drawingId;
                    setConfirmDelete(false);
                    void onDelete(id);
                  }}
                >
                  Delete
                </button>
                <button type="button" className="text-muted" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" className="text-xs text-muted underline underline-offset-4" onClick={() => setConfirmDelete(true)}>
                Delete drawing
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function patchRows(nodes: EquipmentNode[], edges: CableEdge[]): string[][] {
  const header = [
    "Source unit ID",
    "Source model",
    "Signal",
    "From connection",
    "To connection",
    "Destination unit ID",
    "Destination model",
    "Length",
    "Notes",
  ];
  const body = edges.map((edge) => {
    const source = nodes.find((node) => node.id === edge.source);
    const target = nodes.find((node) => node.id === edge.target);
    const from = source?.data.pins.find((pin) => pin.id === edge.sourceHandle);
    const to = target?.data.pins.find((pin) => pin.id === edge.targetHandle);
    return [
      source?.data.unitId ?? "",
      source ? `${source.data.manufacturer} ${source.data.model}` : "",
      from?.signal ?? edge.data?.signal ?? "",
      from?.label ?? "",
      to?.label ?? "",
      target?.data.unitId ?? "",
      target ? `${target.data.manufacturer} ${target.data.model}` : "",
      edge.data?.length ?? "",
      edge.data?.notes ?? "",
    ];
  });
  return [header, ...body];
}

function pullRows(nodes: EquipmentNode[]): string[][] {
  const map = new Map<string, { model: string; ids: string[] }>();
  for (const node of nodes) {
    const key = `${node.data.manufacturer}\0${node.data.model}`;
    const row = map.get(key) ?? { model: node.data.model, ids: [] };
    row.ids.push(node.data.unitId || node.id);
    map.set(key, row);
  }
  const list = [...map.values()].sort((a, b) => b.ids.length - a.ids.length || a.model.localeCompare(b.model));
  return [["Quantity", "Model", "Unit IDs"], ...list.map((row) => [String(row.ids.length), row.model, row.ids.join(", ")])];
}

function ListSheet({
  kind,
  title,
  onTitle,
  rows,
  filename,
  onClose,
}: {
  kind: "patch" | "pull";
  title: DrawingTitle;
  onTitle: (title: DrawingTitle) => void;
  rows: string[][];
  filename: string;
  onClose: () => void;
}) {
  const header = rows[0] ?? [];
  const body = rows.slice(1);
  return (
    <div className="absolute inset-0 z-20 overflow-auto bg-paper/95 p-4 pt-36">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{kind === "patch" ? "Patch" : "Pull list"}</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            {kind === "patch"
              ? "Each cable names the unit ID on both ends. Length is whatever you typed on the cable."
              : "Quantity is how many of that model are on the drawing. A system counts as one, not the boxes inside it."}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper"
            onClick={() => downloadCsv(filename, rows)}
          >
            Download CSV
          </button>
          <button type="button" className="rounded-full border border-line px-4 py-2 text-sm" onClick={onClose}>
            Back to drawing
          </button>
        </div>
      </div>
      <div className="mb-4 grid gap-2 sm:grid-cols-5">
        {(
          [
            ["event", "Event"],
            ["location", "Location"],
            ["date", "Date"],
            ["drawnBy", "Drawn by"],
            ["version", "Version"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="text-xs text-muted">
            {label}
            <input
              className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm text-ink outline-none"
              value={title[key]}
              onChange={(event) => onTitle({ ...title, [key]: event.target.value })}
            />
          </label>
        ))}
      </div>
      {body.length === 0 ? (
        <p className="text-sm text-muted">{kind === "patch" ? "No cables yet." : "Nothing placed yet."}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-panel text-xs tracking-[0.12em] text-muted uppercase">
              <tr>
                {header.map((cell) => (
                  <th key={cell} className="px-3 py-2 font-semibold">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, index) => (
                <tr key={index} className="border-t border-line">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2 align-top">
                      {kind === "pull" && cellIndex === 0 ? `${cell} × ${row[1]}` : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function isMacPlatform() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
}

function pickSelection(mode: MarqueeMode, snapshot: Set<string>, hit: string[]) {
  if (mode === "replace") return new Set(hit);
  const next = new Set(snapshot);
  if (mode === "add") {
    for (const id of hit) next.add(id);
    return next;
  }
  for (const id of hit) {
    if (snapshot.has(id)) next.delete(id);
    else next.add(id);
  }
  return next;
}

function toggled(snapshot: Set<string>, id: string) {
  const next = new Set(snapshot);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function normalize(box: { x1: number; y1: number; x2: number; y2: number }) {
  return {
    x: Math.min(box.x1, box.x2),
    y: Math.min(box.y1, box.y2),
    w: Math.abs(box.x2 - box.x1),
    h: Math.abs(box.y2 - box.y1),
  };
}

function overlaps(node: EquipmentNode, box: { x: number; y: number; w: number; h: number }) {
  const size = nodeBox(node);
  return node.position.x < box.x + box.w && node.position.x + size.width > box.x && node.position.y < box.y + box.h && node.position.y + size.height > box.y;
}

function groupFrame(members: EquipmentNode[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of members) {
    const size = nodeBox(node);
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + size.width);
    maxY = Math.max(maxY, node.position.y + size.height);
  }
  return { x: minX - 20, y: minY - 28, w: maxX - minX + 40, h: maxY - minY + 48 };
}

function menuPoint(x: number, y: number, width = 280, height = 280) {
  if (typeof window === "undefined") return { left: x, top: y };
  return {
    left: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
    top: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
  };
}

function FixedMenu({ x, y, title, children }: { x: number; y: number; title: string; children: ReactNode }) {
  const point = menuPoint(x, y, 240, 160);
  return (
    <div
      className="fixed z-40 w-60 rounded-xl border border-line bg-panel p-2 shadow-lg"
      style={point}
      onContextMenu={(event) => event.preventDefault()}
    >
      <p className="px-2 py-1 text-xs font-semibold tracking-[0.14em] text-muted uppercase">{title}</p>
      {children}
    </div>
  );
}

function EdgeMenu({
  menu,
  edge,
  onChange,
  onRemove,
  onClose,
}: {
  menu: { x: number; y: number };
  edge: CableEdge | null;
  onChange: (patch: Partial<CableData>) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const point = menuPoint(menu.x, menu.y, 260, 240);
  if (!edge) return null;
  return (
    <div
      className="fixed z-40 w-64 rounded-xl border border-line bg-panel p-3 shadow-lg"
      style={point}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">This cable</p>
        <button type="button" className="text-xs text-muted" onClick={onClose}>
          Close
        </button>
      </div>
      <label className="mt-2 block text-sm">
        Length
        <input
          className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-ink outline-none"
          value={edge.data?.length ?? ""}
          placeholder="25 ft"
          onChange={(event) => onChange({ length: event.target.value })}
        />
      </label>
      <label className="mt-2 block text-sm">
        Notes
        <input
          className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-ink outline-none"
          value={edge.data?.notes ?? ""}
          onChange={(event) => onChange({ notes: event.target.value })}
        />
      </label>
      <button type="button" className="mt-3 text-sm text-danger" onClick={onRemove}>
        Remove cable
      </button>
    </div>
  );
}

function Picker({ categories }: { categories: [string, EquipmentRow[]][] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  return (
    <div className="p-4">
      <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">Gear</p>
      <p className="mt-2 text-sm text-muted">Drag a model onto the drawing, or right-click the canvas.</p>
      {categories.length === 0 ? (
        <p className="mt-4 text-sm">No models in the library yet.</p>
      ) : (
        categories.map(([typeName, items]) => {
          const expanded = open[typeName] ?? false;
          return (
            <section key={typeName} className="mt-3">
              <button
                type="button"
                className="flex w-full items-center justify-between py-1 text-left text-sm font-semibold"
                onClick={() => setOpen((current) => ({ ...current, [typeName]: !expanded }))}
              >
                {typeName}
                <span className="text-xs text-muted">{expanded ? "Collapse" : items.length}</span>
              </button>
              {expanded ? (
                <ul className="mt-1 space-y-2">
                  {items.map((item) => (
                    <li key={item.id}>
                      <div
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/gear-id", String(item.id));
                          event.dataTransfer.effectAllowed = "copy";
                        }}
                        className="cursor-grab rounded-xl border border-line bg-paper px-3 py-3 active:cursor-grabbing"
                      >
                        <span className="block text-sm font-semibold">{item.model}</span>
                        <span className="block text-xs text-muted">{item.manufacturer}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          );
        })
      )}
    </div>
  );
}

function GearMenu({
  menu,
  categories,
  onPick,
  onClose,
}: {
  menu: { x: number; y: number; flowX: number; flowY: number };
  categories: [string, EquipmentRow[]][];
  onPick: (item: EquipmentRow) => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState<string | null>(categories[0]?.[0] ?? null);
  const point = menuPoint(menu.x, menu.y, 280, 320);
  return (
    <div
      className="fixed z-40 max-h-80 w-64 overflow-y-auto rounded-xl border border-line bg-panel p-2 shadow-lg"
      style={point}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="flex items-center justify-between px-2 py-1">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Add gear</p>
        <button type="button" className="text-xs text-muted" onClick={onClose}>
          Close
        </button>
      </div>
      {categories.map(([typeName, items]) => (
        <div key={typeName}>
          <button
            type="button"
            className="flex w-full items-center justify-between px-2 py-2 text-left text-sm font-semibold"
            onClick={() => setOpen((current) => (current === typeName ? null : typeName))}
          >
            {typeName}
            <span className="text-xs text-muted">{open === typeName ? "Collapse" : items.length}</span>
          </button>
          {open === typeName
            ? items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-paper"
                  onClick={() => onPick(item)}
                >
                  {item.manufacturer} {item.model}
                </button>
              ))
            : null}
        </div>
      ))}
    </div>
  );
}
