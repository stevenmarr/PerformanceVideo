import { BaseEdge, EdgeLabelRenderer, Position, type ConnectionLineComponentProps, type EdgeProps } from "@xyflow/react";
import { createContext, useContext } from "react";
import { previewRoute, type RouteBox, type RoutePoint } from "@/lib/routing/orthogonal";

export const RouteContext = createContext<Map<string, RoutePoint[]>>(new Map());
export const RouteBoxContext = createContext<RouteBox[]>([]);

const GRID = 8;

function outerPoint(centerX: number, centerY: number, width: number, height: number, position: string): { x: number; y: number } {
  if (position === Position.Right || position === "right") return { x: centerX + width / 2, y: centerY };
  if (position === Position.Left || position === "left") return { x: centerX - width / 2, y: centerY };
  if (position === Position.Top || position === "top") return { x: centerX, y: centerY - height / 2 };
  return { x: centerX, y: centerY + height / 2 };
}

function pathOf(points: RoutePoint[], sourceX: number, sourceY: number, targetX: number, targetY: number): string {
  const route = points.length > 1 ? points : [
    { x: sourceX, y: sourceY },
    { x: (sourceX + targetX) / 2, y: sourceY },
    { x: (sourceX + targetX) / 2, y: targetY },
    { x: targetX, y: targetY },
  ];
  return route.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

export function OrthogonalCable({ id, sourceX, sourceY, targetX, targetY, style, label }: EdgeProps) {
  const points = useContext(RouteContext).get(id) ?? [];
  const mid = points[Math.floor(points.length / 2)] ?? { x: (sourceX + targetX) / 2, y: (sourceY + targetY) / 2 };
  return (
    <>
      <BaseEdge id={id} path={pathOf(points, sourceX, sourceY, targetX, targetY)} style={style} />
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan rounded bg-[#1c1a17] px-1 text-[11px] text-[#f3efe6]"
            style={{ position: "absolute", transform: `translate(-50%, -50%) translate(${mid.x}px, ${mid.y}px)` }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export function JackConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  fromHandle,
  toHandle,
  fromPosition,
  connectionStatus,
}: ConnectionLineComponentProps) {
  const boxes = useContext(RouteBoxContext);
  const routes = useContext(RouteContext);
  const from = outerPoint(fromX, fromY, fromHandle.width, fromHandle.height, fromPosition);
  const snapped = toHandle?.type === "target";
  const to = snapped
    ? outerPoint(toHandle.x, toHandle.y, toHandle.width, toHandle.height, toHandle.position)
    : { x: Math.round(toX / GRID) * GRID, y: Math.round(toY / GRID) * GRID };
  const points = previewRoute(boxes, [...routes.values()], {
    edgeId: "preview",
    sourceId: fromHandle.nodeId,
    targetId: snapped ? toHandle.nodeId : "pointer",
    x1: from.x,
    y1: from.y,
    x2: to.x,
    y2: to.y,
  });
  return (
    <path
      d={pathOf(points, from.x, from.y, to.x, to.y)}
      fill="none"
      stroke="#f3efe6"
      strokeWidth={2}
      style={{ opacity: connectionStatus === "invalid" ? 0.4 : 1 }}
      className="react-flow__connection-path"
    />
  );
}
