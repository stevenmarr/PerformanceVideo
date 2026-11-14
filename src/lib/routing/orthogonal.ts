/** 90-degree routes that stay off other nodes and off each other. */

export type RouteBox = { id: string; x: number; y: number; w: number; h: number };
export type RouteEnd = {
  edgeId: string;
  sourceId: string;
  targetId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};
export type RoutePoint = { x: number; y: number };

const LANE = 16;
const MARGIN = 18;

function corridorKey(end: RouteEnd): string {
  const mid = Math.round((end.x1 + end.x2) / (2 * LANE));
  return `${mid}:${Math.round(end.y1 / LANE)}:${Math.round(end.y2 / LANE)}`;
}

function crosses(a: RoutePoint, b: RoutePoint, box: RouteBox): boolean {
  if (a.x === b.x) {
    const top = Math.min(a.y, b.y);
    const bottom = Math.max(a.y, b.y);
    return a.x > box.x && a.x < box.x + box.w && bottom > box.y && top < box.y + box.h;
  }
  if (a.y === b.y) {
    const left = Math.min(a.x, b.x);
    const right = Math.max(a.x, b.x);
    return a.y > box.y && a.y < box.y + box.h && right > box.x && left < box.x + box.w;
  }
  return false;
}

function simplify(points: RoutePoint[]): RoutePoint[] {
  const out: RoutePoint[] = [];
  for (const point of points) {
    const prev = out[out.length - 1];
    if (!prev || prev.x !== point.x || prev.y !== point.y) out.push({ x: point.x, y: point.y });
  }
  return out;
}

export function isOrthogonal(points: RoutePoint[]): boolean {
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const point = points[index];
    if (!prev || !point) return false;
    if (prev.x !== point.x && prev.y !== point.y) return false;
  }
  return points.length >= 2;
}

export function routeEdges(boxes: RouteBox[], ends: RouteEnd[]): Map<string, RoutePoint[]> {
  const lanes = new Map<string, number>();
  const grouped = new Map<string, RouteEnd[]>();
  for (const end of ends) {
    const key = corridorKey(end);
    const list = grouped.get(key) ?? [];
    list.push(end);
    grouped.set(key, list);
  }
  for (const list of grouped.values()) {
    [...list]
      .sort((a, b) => a.edgeId.localeCompare(b.edgeId))
      .forEach((end, index) => lanes.set(end.edgeId, index));
  }

  const preferred: { end: RouteEnd; bendX: number }[] = [];
  for (const end of ends) {
    const lane = lanes.get(end.edgeId) ?? 0;
    let bendX = Math.round((end.x1 + end.x2) / 2) + lane * LANE;
    for (const box of boxes) {
      if (box.id === end.sourceId || box.id === end.targetId) continue;
      const path = [
        { x: end.x1, y: end.y1 },
        { x: bendX, y: end.y1 },
        { x: bendX, y: end.y2 },
        { x: end.x2, y: end.y2 },
      ];
      const blocked = path.some((point, index) => index > 0 && crosses(path[index - 1] as RoutePoint, point, box));
      if (blocked) bendX = Math.max(bendX, Math.round(box.x + box.w + MARGIN));
    }
    preferred.push({ end, bendX });
  }

  const piled = new Map<number, { end: RouteEnd; bendX: number }[]>();
  for (const item of preferred) {
    const key = Math.round(item.bendX / LANE);
    const list = piled.get(key) ?? [];
    list.push(item);
    piled.set(key, list);
  }
  const routes = new Map<string, RoutePoint[]>();
  for (const list of piled.values()) {
    list.sort((a, b) => a.end.edgeId.localeCompare(b.end.edgeId));
    list.forEach((item, index) => {
      const bendX = item.bendX + index * LANE;
      routes.set(
        item.end.edgeId,
        simplify([
          { x: item.end.x1, y: item.end.y1 },
          { x: bendX, y: item.end.y1 },
          { x: bendX, y: item.end.y2 },
          { x: item.end.x2, y: item.end.y2 },
        ]),
      );
    });
  }
  return routes;
}
