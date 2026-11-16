import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CANVAS_GRID,
  defaultPlacePosition,
  offsetFrom,
  resolvePlacePosition,
} from "./placement.ts";

const box = { width: 256, height: 120 };

describe("offsetFrom", () => {
  it("offsets a duplicate by two grid cells down and right", () => {
    assert.deepEqual(offsetFrom({ x: 100, y: 80 }, box, "duplicate"), {
      x: 100 + CANVAS_GRID * 2,
      y: 80 + CANVAS_GRID * 2,
    });
  });

  it("places the next box to the right of the last one without overlapping", () => {
    const next = offsetFrom({ x: 100, y: 80 }, box, "place");
    assert.deepEqual(next, { x: 100 + 256 + CANVAS_GRID * 2, y: 80 });
    assert.ok(next.x >= 100 + box.width);
  });
});

describe("resolvePlacePosition", () => {
  it("uses the click point for the first pick from a new right-click menu", () => {
    const point = resolvePlacePosition({
      explicit: { x: 400, y: 200 },
      count: 3,
      origin: "menu-1",
    });
    assert.deepEqual(point, { x: 400, y: 200 });
  });

  it("continues from the last box for later picks in the same menu", () => {
    const last = { x: 400, y: 200, width: 256, height: 120, origin: "menu-1" };
    const point = resolvePlacePosition({
      explicit: { x: 400, y: 200 },
      last,
      count: 4,
      origin: "menu-1",
    });
    assert.deepEqual(point, offsetFrom(last, box, "place"));
  });

  it("starts a new cluster when a later right-click uses a new origin", () => {
    const last = { x: 400, y: 200, width: 256, height: 120, origin: "menu-1" };
    const point = resolvePlacePosition({
      explicit: { x: 20, y: 900 },
      last,
      count: 4,
      origin: "menu-2",
    });
    assert.deepEqual(point, { x: 20, y: 900 });
  });

  it("uses the last box for palette or gear-bar adds that have no click point", () => {
    const last = { x: 400, y: 200, width: 256, height: 120, origin: "menu-1" };
    const point = resolvePlacePosition({ last, count: 4 });
    assert.deepEqual(point, offsetFrom(last, box, "place"));
  });

  it("falls back to the original left-to-right row when nothing has been placed", () => {
    assert.deepEqual(resolvePlacePosition({ count: 2 }), defaultPlacePosition(2));
  });

  it("honors an explicit drop even if something was already placed", () => {
    const last = { x: 400, y: 200, width: 256, height: 120, origin: "menu-1" };
    const point = resolvePlacePosition({ explicit: { x: 10, y: 12 }, last, count: 4 });
    assert.deepEqual(point, { x: 10, y: 12 });
  });
});
