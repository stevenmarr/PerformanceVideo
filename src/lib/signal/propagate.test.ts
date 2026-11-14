import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deviceTiming, propagate } from "./propagate.ts";

describe("signal propagation", () => {
  it("adds latency along the path, flags estimates, format changes, and a broken cable", () => {
    const devices = [
      deviceTiming({ id: "cam", label: "CAM-1", latencyMs: 10, latencyFrames: 1, estimate: false, format: "1080p59.94" }),
      deviceTiming({ id: "sw", label: "SW-1", latencyMs: 20, latencyFrames: 2, estimate: true, format: "1080p59.94" }),
      deviceTiming({ id: "mon", label: "MON-1", latencyMs: 5, latencyFrames: 1, estimate: false, format: "1080p59.94" }),
    ];
    const result = propagate("cam", devices, [
      { id: "c1", source: "cam", target: "sw", format: "1080p59.94" },
      { id: "c2", source: "sw", target: "mon", format: "2160p59.94" },
      { id: "c3", source: "sw", target: "missing", format: "1080p59.94" },
    ]);
    const monitor = result.paths.find((path) => path.deviceId === "mon");
    assert.equal(monitor?.latencyMs, 35);
    assert.equal(monitor?.latencyFrames, 4);
    assert.equal(monitor?.estimate, true);
    assert.deepEqual(monitor?.edgeIds, ["c1", "c2"]);
    assert.ok(result.warnings.some((warning) => warning.code === "format-mismatch"));
    assert.ok(result.warnings.some((warning) => warning.code === "broken-path"));
    assert.ok(result.warnings.some((warning) => warning.code === "estimate" && warning.deviceId === "sw"));
  });
});
