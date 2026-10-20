import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyPatchCsv, reassignCable, type PatchBox, type PatchCable } from "./patch-edit.ts";

const boxes: PatchBox[] = [
  {
    id: "a",
    unitId: "RS6-0",
    pins: [
      { id: "o1", label: "Out 1", direction: "output", signal: "HDMI" },
      { id: "o2", label: "Out 2", direction: "output", signal: "12G-SDI" },
    ],
  },
  {
    id: "b",
    unitId: "LED-AC",
    pins: [{ id: "i1", label: "HDMI In 1", direction: "input", signal: "HDMI" }],
  },
  {
    id: "c",
    unitId: "MON",
    pins: [{ id: "i2", label: "SDI In", direction: "input", signal: "12G-SDI" }],
  },
];

const cables: PatchCable[] = [
  { id: "e1", source: "a", target: "b", sourceHandle: "o1", targetHandle: "i1", length: "Patch", notes: "" },
];

describe("patch edits", () => {
  it("moves a cable onto another output", () => {
    const result = reassignCable(boxes, cables, "e1", "to", "SDI In");
    assert.equal(result.error, "That input is not on this box.");
    const moved = reassignCable(boxes, cables, "e1", "from", "Out 2");
    assert.equal(moved.error, "12G-SDI cannot connect to HDMI.");
    const dest = reassignCable(boxes, cables, "e1", "destUnit", "c");
    assert.equal(dest.error, "That input is not on this box.");
  });

  it("applies a csv back onto the same cables", () => {
    const csv = [
      "Cable ID,Source unit ID,From connection,To connection,Destination unit ID,Length,Notes",
      "e1,RS6-0,Out 2,SDI In,MON,25 ft,record",
    ].join("\n");
    const result = applyPatchCsv(boxes, cables, csv);
    assert.deepEqual(result.errors, []);
    assert.equal(result.applied, 1);
    assert.equal(result.cables[0].sourceHandle, "o2");
    assert.equal(result.cables[0].target, "c");
    assert.equal(result.cables[0].length, "25 ft");
    assert.equal(result.cables[0].notes, "record");
  });
});
