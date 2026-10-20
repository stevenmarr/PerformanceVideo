import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CORPORATE_GEAR } from "./corporate-nodes.ts";
import { buildJpm } from "./seed-jpm.ts";

describe("JPM drawing", () => {
  it("builds from the library pin names without reusing a connection", () => {
    const gear = CORPORATE_GEAR.map((sample, index) => ({
      id: index + 1,
      maker: sample.maker,
      model: sample.model,
      pins: sample.pins.map(([label, direction, signal], pinIndex) => ({
        id: `pin-${pinIndex + 1}`,
        label,
        direction,
        signal,
      })),
    }));
    const file = buildJpm(gear);
    assert.equal(file.title.event, "JPM");
    assert.ok(file.nodes.length >= 50);
    assert.ok(file.edges.length >= 60);
    const used = new Set<string>();
    for (const edge of file.edges) {
      for (const end of [`${edge.source}:${edge.sourceHandle}`, `${edge.target}:${edge.targetHandle}`]) {
        assert.equal(used.has(end), false, end);
        used.add(end);
      }
    }
  });
});
