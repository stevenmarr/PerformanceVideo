import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { groupFrameBox, groupLabelClearsNodes } from "./group-label.ts";

describe("group frame label", () => {
  it("keeps the name above the boxes", () => {
    const frame = groupFrameBox(100, 200, 400, 500);
    assert.equal(frame.y, 168);
    assert.equal(groupLabelClearsNodes(frame.y, 200), true);
    assert.equal(groupLabelClearsNodes(200, 200), false);
  });
});
