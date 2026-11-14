import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizePorts } from "./ports.ts";

describe("device ports", () => {
  it("flags an empty unverified device with a placeholder port", () => {
    const result = normalizePorts("", true);
    assert.equal(result.error, null);
    assert.equal(result.ports[0]?.unverified, true);
    assert.equal(result.ports[0]?.count, null);
  });

  it("rejects an invented count", () => {
    const result = normalizePorts(JSON.stringify([{ name: "SDI", direction: "in", count: 0 }]), false);
    assert.match(result.error ?? "", /positive integer/);
  });
});
