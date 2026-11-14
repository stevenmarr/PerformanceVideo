import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { instanceDockSide } from "./instance-dock.ts";

describe("instance dock", () => {
  it("sits under the canvas on a phone and beside it on a laptop", () => {
    assert.equal(instanceDockSide(390), "bottom");
    assert.equal(instanceDockSide(1023), "bottom");
    assert.equal(instanceDockSide(1024), "side");
    assert.equal(instanceDockSide(1440), "side");
  });
});
