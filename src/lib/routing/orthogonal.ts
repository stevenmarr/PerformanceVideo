/** 90-degree routes from one jack to another. They leave the pin sideways and stay off other nodes. */

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
const STUB = 18;

export function segmentHitsBox(a: RoutePoint, b: RoutePoint, box: RouteBox): boolean {
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

function rangesOverlap(a1: number, a2: number, b1: number, b2: number): boolean {
  return Math.max(Math.min(a1, a2), Math.min(b1, b2)) < Math.min(Math.max(a1, a2), Math.max(b1, b2));
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

type Plan = {
  end: RouteEnd;
  sourceLane: number;
  targetLane: number;
  leaveX: number;
  approachX: number;
  bendX: number;
  outY: number;
  inY: number;
};

function laneOf(ends: RouteEnd[], side: "source" | "target"): Map<string, number> {
  const grouped = new Map<string, RouteEnd[]>();
  for (const end of ends) {
    const key = side === "source"
      ? `${end.sourceId}:${Math.round(end.x1)}:${Math.round(end.y1)}`
      : `${end.targetId}:${Math.round(end.x2)}:${Math.round(end.y2)}`;
    const list = grouped.get(key) ?? [];
    list.push(end);
    grouped.set(key, list);
  }
  const lanes = new Map<string, number>();
  for (const list of grouped.values()) {
    list.sort((a, b) => a.edgeId.localeCompare(b.edgeId));
    list.forEach((end, index) => lanes.set(end.edgeId, index));
  }
  return lanes;
}

function rawPoints(plan: Plan): RoutePoint[] {
  const { end } = plan;
  return [
    { x: end.x1, y: end.y1 },
    { x: plan.leaveX, y: end.y1 },
    { x: plan.leaveX, y: plan.outY },
    { x: plan.bendX, y: plan.outY },
    { x: plan.bendX, y: plan.inY },
    { x: plan.approachX, y: plan.inY },
    { x: plan.approachX, y: end.y2 },
    { x: end.x2, y: end.y2 },
  ];
}

function drawnPoints(plan: Plan): RoutePoint[] {
  return simplify(rawPoints(plan));
}

function nudge(plan: Plan, box: RouteBox, horizontal: boolean): void {
  const lane = plan.sourceLane * LANE;
  if (horizontal) {
    const below = Math.round(box.y + box.h + MARGIN) + lane;
    plan.outY = Math.max(plan.outY, below);
    plan.inY = Math.max(plan.inY, below);
    return;
  }
  const right = Math.round(box.x + box.w + MARGIN) + lane;
  if (plan.bendX < right) plan.bendX = right;
  if (plan.leaveX > plan.end.x1 && plan.leaveX < right && plan.leaveX > box.x) plan.leaveX = right;
  if (plan.approachX < plan.end.x2 && plan.approachX > box.x && plan.approachX < box.x + box.w) {
    plan.approachX = Math.round(box.x - MARGIN) - lane;
  }
}

function untangle(plan: Plan): void {
  const { end } = plan;
  if (end.x2 <= end.x1) return;
  if (plan.leaveX > plan.approachX) {
    plan.leaveX = end.x1;
    plan.approachX = end.x2;
  }
  plan.bendX = Math.min(Math.max(plan.bendX, plan.leaveX), plan.approachX);
}

function dodge(plan: Plan, boxes: RouteBox[]): void {
  for (let pass = 0; pass < 12; pass += 1) {
    const points = rawPoints(plan);
    let moved = false;
    const live: RoutePoint[] = [];
    for (const point of points) {
      const prev = live[live.length - 1];
      if (prev && prev.x === point.x && prev.y === point.y) continue;
      live.push(point);
    }
    for (let index = 1; index < live.length; index += 1) {
      const prev = live[index - 1];
      const point = live[index];
      if (!prev || !point) continue;
      for (const box of boxes) {
        if (!segmentHitsBox(prev, point, box)) continue;
        nudge(plan, box, prev.y === point.y);
        moved = true;
        break;
      }
      if (moved) break;
    }
    if (!moved) break;
  }
  untangle(plan);
}

function separate(plans: Plan[], boxes: RouteBox[]): void {
  for (let pass = 0; pass < 4; pass += 1) {
    const verticals = new Map<number, { edgeId: string; y1: number; y2: number }[]>();
    const horizontals = new Map<number, { edgeId: string; x1: number; x2: number }[]>();
    let moved = false;
    for (const plan of plans) {
      const points = drawnPoints(plan);
      for (let index = 1; index < points.length; index += 1) {
        const prev = points[index - 1];
        const point = points[index];
        if (!prev || !point) continue;
        if (prev.x === point.x) {
          const key = Math.round(prev.x / LANE);
          const list = verticals.get(key) ?? [];
          const onTrunk = Math.abs(prev.x - plan.bendX) < 1;
          const onApproach = Math.abs(prev.x - plan.approachX) < 1;
          for (const other of list) {
            if (other.edgeId !== plan.end.edgeId && rangesOverlap(prev.y, point.y, other.y1, other.y2)) {
              if (onTrunk) plan.bendX += LANE;
              else if (onApproach) plan.approachX -= LANE;
              else plan.leaveX += LANE;
              moved = true;
            }
          }
          list.push({ edgeId: plan.end.edgeId, y1: prev.y, y2: point.y });
          verticals.set(key, list);
        } else if (prev.y === point.y) {
          const key = Math.round(prev.y / LANE);
          const list = horizontals.get(key) ?? [];
          const span = Math.abs(point.x - prev.x);
          for (const other of list) {
            if (other.edgeId !== plan.end.edgeId && span > STUB && Math.abs(other.x2 - other.x1) > STUB && rangesOverlap(prev.x, point.x, other.x1, other.x2)) {
              plan.outY += LANE;
              plan.inY += LANE;
              moved = true;
            }
          }
          list.push({ edgeId: plan.end.edgeId, x1: prev.x, x2: point.x });
          horizontals.set(key, list);
        }
      }
    }
    if (!moved) return;
    for (const plan of plans) dodge(plan, boxes);
  }
}

export function routeEdges(boxes: RouteBox[], ends: RouteEnd[]): Map<string, RoutePoint[]> {
  const sourceLanes = laneOf(ends, "source");
  const targetLanes = laneOf(ends, "target");
  const plans = ends.map((end) => {
    const sourceLane = sourceLanes.get(end.edgeId) ?? 0;
    const targetLane = targetLanes.get(end.edgeId) ?? 0;
    const gap = end.x2 - end.x1;
    const roomy = gap > STUB * 3;
    const leaveX = roomy ? end.x1 + STUB + sourceLane * LANE : end.x1;
    const approachX = roomy ? end.x2 - STUB - targetLane * LANE : end.x2;
    const plan: Plan = {
      end,
      sourceLane,
      targetLane,
      leaveX,
      approachX,
      bendX: Math.round((leaveX + approachX) / 2) + sourceLane * LANE,
      outY: end.y1 + sourceLane * LANE,
      inY: end.y2 + targetLane * LANE,
    };
    dodge(plan, boxes);
    return plan;
  });
  separate(plans, boxes);
  const routes = new Map<string, RoutePoint[]>();
  for (const plan of plans) routes.set(plan.end.edgeId, drawnPoints(plan));
  return routes;
}
