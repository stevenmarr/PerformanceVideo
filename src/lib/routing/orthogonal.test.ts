import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isOrthogonal, routeEdges, type RouteBox, type RouteEnd } from "./orthogonal.ts";

describe("orthogonal routing", () => {
  it("keeps bends at 90 degrees, separates lanes, and misses a box in the middle", () => {
    const boxes: RouteBox[] = [
      { id: "a", x: 0, y: 0, w: 80, h: 40 },
      { id: "b", x: 400, y: 0, w: 80, h: 40 },
      { id: "block", x: 180, y: 0, w: 80, h: 80 },
    ];
    const ends: RouteEnd[] = [
      { edgeId: "e1", sourceId: "a", targetId: "b", x1: 80, y1: 20, x2: 400, y2: 20 },
      { edgeId: "e2", sourceId: "a", targetId: "b", x1: 80, y1: 20, x2: 400, y2: 48 },
    ];
    const routes = routeEdges(boxes, ends);
    const first = routes.get("e1") ?? [];
    const second = routes.get("e2") ?? [];
    assert.equal(isOrthogonal(first), true);
    assert.equal(isOrthogonal(second), true);
    const bend = (points: { x: number }[]) => points[1]?.x;
    assert.notEqual(bend(first), bend(second));
    for (const points of [first, second]) {
      for (let index = 1; index < points.length; index += 1) {
        const prev = points[index - 1];
        const point = points[index];
        if (!prev || !point || prev.x !== point.x) continue;
        assert.ok(point.x <= 180 || point.x >= 260);
      }
    }
  });

  it("routes a few hundred edges quickly and keeps the same bends when an unrelated box moves", () => {
    const boxes: RouteBox[] = [];
    const ends: RouteEnd[] = [];
    for (let index = 0; index < 80; index += 1) {
      boxes.push({ id: `s${index}`, x: 0, y: index * 50, w: 100, h: 36 });
      boxes.push({ id: `t${index}`, x: 700, y: index * 50, w: 100, h: 36 });
      for (let lane = 0; lane < 4; lane += 1) {
        ends.push({
          edgeId: `e${index}-${lane}`,
          sourceId: `s${index}`,
          targetId: `t${index}`,
          x1: 100,
          y1: index * 50 + 8 + lane * 6,
          x2: 700,
          y2: index * 50 + 8 + lane * 6,
        });
      }
    }
    const started = performance.now();
    const routes = routeEdges(boxes, ends);
    const elapsed = performance.now() - started;
    assert.equal(routes.size, 320);
    assert.ok(elapsed < 100, `routing took ${elapsed.toFixed(1)}ms`);
    boxes.push({ id: "extra", x: 20, y: 5000, w: 40, h: 40 });
    const again = routeEdges(boxes, ends);
    assert.equal(again.get("e0-0")?.[1]?.x, routes.get("e0-0")?.[1]?.x);
  });
});
