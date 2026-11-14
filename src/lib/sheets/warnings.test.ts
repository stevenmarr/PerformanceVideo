import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collapseWarnings, rowsWithNote, warningLine } from "./warnings.ts";

describe("patch warnings", () => {
  it("collapses the same warning into one line with a count", () => {
    const collapsed = collapseWarnings([
      "3G-SDI into 12G-SDI is allowed, with a format note.",
      "3G-SDI into 12G-SDI is allowed, with a format note.",
      "3G-SDI into 12G-SDI is allowed, with a format note.",
      "CAM-A uses SW-1 Unverified port (unverified), which is unverified.",
    ]);
    assert.equal(collapsed.length, 2);
    assert.equal(collapsed[0]?.count, 3);
    assert.equal(warningLine(collapsed[0]!), "3G-SDI into 12G-SDI is allowed, with a format note. × 3");
    assert.equal(warningLine(collapsed[1]!), "CAM-A uses SW-1 Unverified port (unverified), which is unverified.");
  });

  it("keeps only cables whose note marks an unverified or unknown-count jack", () => {
    const rows = rowsWithNote([
      ["From", "Output jack", "To", "Input jack", "Cable", "Note"],
      ["CAM-1", "SDI Out 1", "SW-1", "SDI In 1", "", ""],
      ["CAM-2", "Unverified port (unverified)", "SW-1", "SDI In 2", "", "Unverified output: Unverified port (unverified)"],
      ["CAM-3", "HDMI Out (count unknown)", "MON", "HDMI In", "", "Unknown count on output: HDMI Out (count unknown)"],
    ]);
    assert.equal(rows.length, 3);
    assert.equal(rows[1]?.[0], "CAM-2");
    assert.equal(rows[2]?.[0], "CAM-3");
  });
});
