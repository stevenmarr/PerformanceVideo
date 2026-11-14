import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { placeClearOf } from "./place-clear.ts";

describe("floating menu placement", () => {
  it("keeps a menu on screen and off the selected node", () => {
    const open = placeClearOf(40, 40, 200, 120, 800, 600, null);
    assert.deepEqual(open, { left: 40, top: 40 });
    const shifted = placeClearOf(100, 80, 200, 120, 800, 600, { x: 90, y: 70, w: 220, h: 160 });
    const box = { x: shifted.left, y: shifted.top, w: 200, h: 120 };
    const node = { x: 90, y: 70, w: 220, h: 160 };
    const hits =
      box.x < node.x + node.w && box.x + box.w > node.x && box.y < node.y + node.h && box.y + box.h > node.y;
    assert.equal(hits, false);
    const edge = placeClearOf(900, 700, 200, 120, 800, 600, null);
    assert.ok(edge.left + 200 <= 792);
    assert.ok(edge.top + 120 <= 592);
  });
});
