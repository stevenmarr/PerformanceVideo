import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SYSTEMS_CUSTOM,
  type SystemPin,
  equipmentOfType,
  equipmentTypeNames,
  exposedPinsFromPorts,
  libraryGroupName,
  syncSystemInstances,
  systemUpdateHint,
} from "./system-sync.ts";

const cam: SystemPin[] = [
  { id: "sdi-out", label: "SDI Out", direction: "output", signal: "12G-SDI" },
];
const mon: SystemPin[] = [
  { id: "sdi-in", label: "SDI In", direction: "input", signal: "12G-SDI" },
  { id: "hdmi-in", label: "HDMI In", direction: "input", signal: "HDMI" },
];

const library = [
  { kind: "device", deviceType: "Camera", model: "FX6" },
  { kind: "system", deviceType: "System", model: "Stage rack" },
  { kind: "device", deviceType: "System", model: "Should not be a custom system" },
  { kind: "system", deviceType: "System", model: "IO tray" },
];

describe("library grouping for custom systems", () => {
  it("files kind=system under Systems (custom) and leaves other gear in its device type", () => {
    assert.equal(libraryGroupName(library[1]!), SYSTEMS_CUSTOM);
    assert.equal(libraryGroupName(library[0]!), "Camera");
    assert.equal(libraryGroupName(library[2]!), "System");
    assert.deepEqual(equipmentTypeNames(library), [SYSTEMS_CUSTOM, "Camera", "System"]);
    assert.deepEqual(
      equipmentOfType(library, SYSTEMS_CUSTOM).map((item) => item.model),
      ["Stage rack", "IO tray"],
    );
    assert.deepEqual(
      equipmentOfType(library, "System").map((item) => item.model),
      ["Should not be a custom system"],
    );
  });
});

describe("exposedPinsFromPorts", () => {
  it("rebuilds outward jacks from the inner graph and drops ports whose box or pin is gone", () => {
    const pins = exposedPinsFromPorts(
      [
        { id: "port-1", nodeId: "cam", pinId: "sdi-out" },
        { id: "port-2", nodeId: "mon", pinId: "hdmi-in" },
        { id: "port-3", nodeId: "gone", pinId: "sdi-in" },
        { id: "port-4", nodeId: "mon", pinId: "missing" },
      ],
      [
        { id: "cam", equipmentId: 1 },
        { id: "mon", equipmentId: 2 },
      ],
      new Map([
        [1, cam],
        [2, mon],
      ]),
    );
    assert.deepEqual(pins, [
      { id: "port-1", label: "SDI Out", direction: "output", signal: "12G-SDI" },
      { id: "port-2", label: "HDMI In", direction: "input", signal: "HDMI" },
    ]);
  });
});

describe("syncSystemInstances", () => {
  const baseSystem = {
    id: 9,
    model: "Stage rack",
    manufacturer: "Unbranded",
    deviceType: "System",
    kind: "system",
    color: "#3f3a34",
    pins: [
      { id: "port-1", label: "SDI Out", direction: "output" as const, signal: "12G-SDI" },
      { id: "port-2", label: "HDMI In", direction: "input" as const, signal: "HDMI" },
    ],
  };

  function node(id: string, equipmentId: number, pins: SystemPin[], model = "Stage rack") {
    return {
      id,
      data: {
        equipmentId,
        pins,
        model,
        manufacturer: "Unbranded",
        deviceType: "System",
        kind: "system",
        color: "#111",
        unitId: id.toUpperCase(),
      },
    };
  }

  it("updates every instance's ports, model, and color, keeps cables on remaining jacks, and drops the rest", () => {
    const nodes = [
      node("sys-a", 9, [
        { id: "port-1", label: "SDI Out", direction: "output", signal: "12G-SDI" },
        { id: "port-2", label: "HDMI In", direction: "input", signal: "HDMI" },
        { id: "port-3", label: "Old aux", direction: "output", signal: "3G-SDI" },
      ]),
      node("sys-b", 9, [
        { id: "port-1", label: "SDI Out", direction: "output", signal: "12G-SDI" },
        { id: "port-3", label: "Old aux", direction: "output", signal: "3G-SDI" },
      ]),
      node("cam-1", 1, cam, "FX6"),
    ];
    const edges = [
      { id: "keep-out", source: "sys-a", target: "cam-1", sourceHandle: "port-1", targetHandle: "sdi-out" },
      { id: "drop-aux", source: "sys-a", target: "cam-1", sourceHandle: "port-3", targetHandle: "sdi-out" },
      { id: "drop-b", source: "sys-b", target: "cam-1", sourceHandle: "port-3", targetHandle: "sdi-out" },
      { id: "unrelated", source: "cam-1", target: "cam-1", sourceHandle: "sdi-out", targetHandle: "sdi-out" },
    ];
    const next = {
      ...baseSystem,
      model: "Stage rack v2",
      color: "#abcdef",
      pins: [
        { id: "port-1", label: "Program SDI", direction: "output" as const, signal: "12G-SDI" },
        { id: "port-2", label: "HDMI In", direction: "input" as const, signal: "HDMI" },
      ],
    };
    const result = syncSystemInstances(nodes, edges, next);
    assert.equal(result.updatedInstances, 2);
    assert.equal(result.removedCables, 2);
    assert.equal(result.nodes[0]?.data.model, "Stage rack v2");
    assert.equal(result.nodes[0]?.data.color, "#abcdef");
    assert.deepEqual(
      result.nodes[0]?.data.pins.map((pin) => pin.id),
      ["port-1", "port-2"],
    );
    assert.equal(result.nodes[0]?.data.unitId, "SYS-A");
    assert.equal(result.nodes[2]?.data.model, "FX6");
    assert.deepEqual(
      result.edges.map((edge) => edge.id),
      ["keep-out", "unrelated"],
    );
    assert.equal(
      systemUpdateHint("Stage rack v2", 2, 2),
      "2 Stage rack v2 boxes updated on the show. 2 cables were dropped because those jacks are gone.",
    );
    assert.equal(systemUpdateHint("Stage rack v2", 1, 0), "Stage rack v2 updated on the show.");
    assert.equal(systemUpdateHint("Stage rack v2", 0, 0), "Back on the show.");
  });
});
