import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { incrementTrailingNumber, nextConnection } from "./next-connection.ts";

describe("incrementTrailingNumber", () => {
  it("increments a trailing number and keeps the prefix", () => {
    assert.equal(incrementTrailingNumber("Input 1"), "Input 2");
    assert.equal(incrementTrailingNumber("SDI In 3"), "SDI In 4");
    assert.equal(incrementTrailingNumber("Out 9"), "Out 10");
    assert.equal(incrementTrailingNumber("Input 01"), "Input 02");
  });

  it("appends 2 when the label has no trailing number, and leaves a blank label blank", () => {
    assert.equal(incrementTrailingNumber("Program"), "Program 2");
    assert.equal(incrementTrailingNumber(""), "");
    assert.equal(incrementTrailingNumber("   "), "");
  });
});

describe("nextConnection", () => {
  it("copies direction and signal and increments the name", () => {
    const next = nextConnection({ label: "Input 1", direction: "input", signal: "12G-SDI" });
    assert.deepEqual(next, { label: "Input 2", direction: "input", signal: "12G-SDI" });
    const again = nextConnection(next);
    assert.deepEqual(again, { label: "Input 3", direction: "input", signal: "12G-SDI" });
  });

  it("keeps following the last row and never rolls over", () => {
    const last = nextConnection({ label: "Input 40", direction: "input", signal: "12G-SDI" });
    assert.deepEqual(last, { label: "Input 41", direction: "input", signal: "12G-SDI" });
    const output = nextConnection({ label: "Out 1", direction: "output", signal: "HDMI" });
    assert.deepEqual(output, { label: "Out 2", direction: "output", signal: "HDMI" });
  });

  it("starts a first row as an empty input when there is no last connection", () => {
    assert.deepEqual(nextConnection(undefined, "12G-SDI"), {
      label: "",
      direction: "input",
      signal: "12G-SDI",
    });
  });
});
