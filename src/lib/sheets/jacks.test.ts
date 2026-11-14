import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cableCaution, jackCaution, jackName } from "./jacks.ts";

describe("jack names", () => {
  it("prints the label on the connector and falls back to the id", () => {
    assert.equal(jackName({ id: "sdi-out-1", label: "SDI Out 1" }), "SDI Out 1");
    assert.equal(jackName({ id: "sdi-out-1", label: "  " }), "sdi-out-1");
    assert.equal(jackName(null), "");
  });

  it("flags an unverified jack and a jack whose count was never stated", () => {
    assert.equal(jackCaution({ label: "Unverified port (unverified)" }), "unverified");
    assert.equal(jackCaution({ label: "HDMI In (count unknown)" }), "unknown-count");
    assert.equal(jackCaution({ label: "SDI Out 1" }), null);
  });

  it("names both ends when a cable lands on a flagged jack", () => {
    const note = cableCaution(
      { label: "SDI Out 1" },
      { label: "Unverified port (unverified)" },
    );
    assert.match(note, /Unverified input: Unverified port \(unverified\)/);
    assert.equal(cableCaution({ label: "SDI Out 1" }, { label: "SDI In 1" }), "");
    const both = cableCaution(
      { label: "HDMI Out (count unknown)" },
      { label: "Unverified port (unverified)" },
    );
    assert.match(both, /Unknown count on output: HDMI Out \(count unknown\)/);
    assert.match(both, /Unverified input/);
  });
});
