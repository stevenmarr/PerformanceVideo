import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  connectionsFromCsv,
  connectionsToCsv,
  parsePatchDocument,
  patchDocument,
  signalsCompatible,
  validatePatch,
  type PatchConnection,
  type PatchPort,
} from "./document.ts";

const ports: PatchPort[] = [
  { deviceId: "CAM-1", portId: "sdi-out-1", signal: "sdi-3g", direction: "output" },
  { deviceId: "SW-1", portId: "sdi-in-1", signal: "sdi-12g", direction: "input", required: true },
  { deviceId: "SW-1", portId: "hdmi-in-1", signal: "hdmi", direction: "input", required: true },
  { deviceId: "MON-1", portId: "hdmi-in", signal: "hdmi", direction: "input" },
];

function cable(patch: Partial<PatchConnection> & Pick<PatchConnection, "id" | "sourceDevice" | "sourcePort" | "destinationDevice" | "destinationPort">): PatchConnection {
  return {
    signalType: "",
    signalFormat: "",
    cableType: "",
    cableLength: "",
    cableLabel: "",
    notes: "",
    ...patch,
  };
}

describe("patch documents", () => {
  it("flags a faster SDI into a slower input, a double patch, and a required open port", () => {
    assert.equal(signalsCompatible("sdi-3g", "sdi-12g"), "warning");
    assert.equal(signalsCompatible("sdi-12g", "sdi-3g"), "error");
    assert.equal(signalsCompatible("hdmi", "sdi-12g"), "error");
    const issues = validatePatch(
      [
        cable({ id: "a", sourceDevice: "CAM-1", sourcePort: "sdi-out-1", destinationDevice: "SW-1", destinationPort: "sdi-in-1", signalType: "sdi-3g" }),
        cable({ id: "b", sourceDevice: "CAM-1", sourcePort: "sdi-out-1", destinationDevice: "SW-1", destinationPort: "sdi-in-1", signalType: "sdi-3g" }),
      ],
      ports,
    );
    assert.ok(issues.some((issue) => issue.code === "double-patched"));
    assert.ok(issues.some((issue) => issue.code === "unconnected-required" && issue.message.includes("hdmi-in-1")));
    assert.ok(issues.some((issue) => issue.code === "incompatible" && issue.level === "warning"));
  });

  it("round-trips JSON and CSV", () => {
    const connections = [
      cable({
        id: "c1",
        sourceDevice: "CAM-1",
        sourcePort: "sdi-out-1",
        destinationDevice: "SW-1",
        destinationPort: "sdi-in-1",
        signalType: "sdi-3g",
        signalFormat: "1080p59.94",
        cableType: "1694A",
        cableLength: "25'",
        cableLabel: "CAM-A",
        notes: "stage left",
      }),
    ];
    const parsed = parsePatchDocument(patchDocument("JPM", connections));
    assert.equal(parsed.error, null);
    assert.equal(parsed.document?.connections[0]?.cableLabel, "CAM-A");
    const csv = connectionsToCsv(connections);
    const back = connectionsFromCsv(csv);
    assert.equal(back.error, null);
    assert.equal(back.connections[0]?.signalFormat, "1080p59.94");
    assert.equal(back.connections[0]?.notes, "stage left");
  });
});
