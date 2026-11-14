import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
import { createContext, useContext } from "react";
import type { RoutePoint } from "@/lib/routing/orthogonal";

export const RouteContext = createContext<Map<string, RoutePoint[]>>(new Map());

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
