import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isOrthogonal, previewRoute, routeEdges, segmentHitsBox, type RouteBox, type RouteEnd, type RoutePoint } from "./orthogonal.ts";

function misses(points: RoutePoint[], box: RouteBox): boolean {
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const point = points[index];
    if (prev && point && segmentHitsBox(prev, point, box)) return false;
  }
  return true;
}

function sharesARun(first: RoutePoint[], second: RoutePoint[]): boolean {
  for (let i = 1; i < first.length; i += 1) {
    const a = first[i - 1];
    const b = first[i];
    if (!a || !b) continue;
    for (let j = 1; j < second.length; j += 1) {
      const c = second[j - 1];
      const d = second[j];
      if (!c || !d) continue;
      if (a.x === b.x && c.x === d.x && a.x === c.x) {
        const overlap = Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) - Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y));
        if (overlap > 18) return true;
      }
      if (a.y === b.y && c.y === d.y && a.y === c.y) {
        const overlap = Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) - Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x));
        if (overlap > 18) return true;
      }
    }
  }
  return false;
}

describe("orthogonal routing", () => {
  it("lands on each jack, turns at 90 degrees, and misses a box in the middle", () => {
    const boxes: RouteBox[] = [
      { id: "a", x: 0, y: 0, w: 80, h: 120 },
      { id: "b", x: 400, y: 0, w: 80, h: 120 },
      { id: "block", x: 180, y: 0, w: 80, h: 80 },
    ];
    const ends: RouteEnd[] = [
      { edgeId: "e1", sourceId: "a", targetId: "b", x1: 80, y1: 40, x2: 400, y2: 40 },
      { edgeId: "e2", sourceId: "a", targetId: "b", x1: 80, y1: 72, x2: 400, y2: 104 },
    ];
    const routes = routeEdges(boxes, ends);
    const first = routes.get("e1") ?? [];
    const second = routes.get("e2") ?? [];
    assert.deepEqual(first[0], { x: 80, y: 40 });
    assert.deepEqual(first[first.length - 1], { x: 400, y: 40 });
    assert.deepEqual(second[0], { x: 80, y: 72 });
    assert.deepEqual(second[second.length - 1], { x: 400, y: 104 });
    assert.equal(isOrthogonal(first), true);
    assert.equal(isOrthogonal(second), true);
    assert.equal(misses(first, boxes[2] as RouteBox), true);
    assert.equal(misses(second, boxes[2] as RouteBox), true);
    assert.equal(sharesARun(first, second), false);
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

  it("fans two cables that leave the same jack and does not cut back through a node", () => {
    const boxes: RouteBox[] = [
      { id: "s", x: 400, y: 0, w: 120, h: 160 },
      { id: "t", x: 0, y: 200, w: 120, h: 160 },
    ];
    const ends: RouteEnd[] = [
      { edgeId: "a", sourceId: "s", targetId: "t", x1: 520, y1: 40, x2: 0, y2: 240 },
      { edgeId: "b", sourceId: "s", targetId: "t", x1: 520, y1: 40, x2: 0, y2: 280 },
    ];
    const routes = routeEdges(boxes, ends);
    const first = routes.get("a") ?? [];
    const second = routes.get("b") ?? [];
    assert.deepEqual(first[0], { x: 520, y: 40 });
    assert.deepEqual(second[0], { x: 520, y: 40 });
    assert.deepEqual(first[first.length - 1], { x: 0, y: 240 });
    assert.deepEqual(second[second.length - 1], { x: 0, y: 280 });
    assert.equal(isOrthogonal(first), true);
    assert.equal(sharesARun(first, second), false);
    assert.equal(misses(first, boxes[0] as RouteBox), true);
    assert.equal(misses(first, boxes[1] as RouteBox), true);
  });

  it("previews the same route as a dropped cable and stays quick on a large drawing", () => {
    const end: RouteEnd = { edgeId: "preview", sourceId: "a", targetId: "b", x1: 80, y1: 40, x2: 400, y2: 72 };
    const boxes: RouteBox[] = [
      { id: "a", x: 0, y: 0, w: 80, h: 120 },
      { id: "b", x: 400, y: 0, w: 80, h: 120 },
      { id: "block", x: 180, y: 0, w: 80, h: 80 },
    ];
    const preview = previewRoute(boxes, [], end);
    assert.deepEqual(preview, routeEdges(boxes, [end]).get("preview"));
    assert.deepEqual(preview[0], { x: 80, y: 40 });
    assert.deepEqual(preview[preview.length - 1], { x: 400, y: 72 });
    assert.equal(misses(preview, boxes[2] as RouteBox), true);
    const taken = previewRoute(boxes, [preview], { ...end, edgeId: "next", y1: 40, y2: 72 });
    assert.notDeepEqual(taken, preview);
    assert.deepEqual(taken[0], { x: 80, y: 40 });
    assert.deepEqual(taken[taken.length - 1], { x: 400, y: 72 });

    const many: RouteBox[] = [];
    const existing: RoutePoint[][] = [];
    for (let index = 0; index < 400; index += 1) {
      many.push({ id: `n${index}`, x: (index % 20) * 320, y: Math.floor(index / 20) * 200, w: 256, h: 140 });
      existing.push([
        { x: (index % 20) * 320 + 256, y: Math.floor(index / 20) * 200 + 40 },
        { x: (index % 20) * 320 + 400, y: Math.floor(index / 20) * 200 + 40 },
      ]);
    }
    const started = performance.now();
    for (let step = 0; step < 40; step += 1) {
      previewRoute(many, existing, {
        edgeId: "preview",
        sourceId: "n0",
        targetId: "pointer",
        x1: 256,
        y1: 40,
        x2: 500 + step * 16,
        y2: 80,
      });
    }
    const elapsed = performance.now() - started;
    assert.ok(elapsed < 80, `preview took ${elapsed.toFixed(1)}ms`);
  });
});
