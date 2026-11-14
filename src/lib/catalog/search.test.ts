import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scoreDevice, searchDevices, type CatalogSearchRecord } from "./search.ts";

const records: CatalogSearchRecord[] = [
  {
    id: "aja.kumo-1616",
    manufacturer: "AJA",
    model: "KUMO 1616",
    family: "KUMO",
    category: "router",
    confidence: "high",
    unverified: false,
    aliases: [],
    signals: ["sdi-3g"],
    connectors: ["bnc"],
  },
  {
    id: "blackmagic.atem-mini",
    manufacturer: "Blackmagic Design",
    model: "ATEM Mini",
    family: "ATEM",
    category: "switcher",
    confidence: "high",
    unverified: false,
    aliases: ["atem mini pro"],
    signals: ["hdmi"],
    connectors: ["hdmi-a"],
  },
  {
    id: "barco.e2",
    manufacturer: "Barco",
    model: "E2",
    family: "Event Master",
    category: "image-processor",
    confidence: "none",
    unverified: true,
    aliases: [],
    signals: ["unknown"],
    connectors: ["unknown"],
  },
];

describe("device search", () => {
  it("ranks model and manufacturer matches and honors filters", () => {
    const found = searchDevices(records, "kumo 1616");
    assert.equal(found[0]?.id, "aja.kumo-1616");
    assert.ok(scoreDevice(records[1], "atem mini pro") > 0);
    const routers = searchDevices(records, "", { category: "router" });
    assert.deepEqual(routers.map((row) => row.id), ["aja.kumo-1616"]);
    const flagged = searchDevices(records, "e2", { unverified: "unverified" });
    assert.equal(flagged[0]?.id, "barco.e2");
    const sdi = searchDevices(records, "", { signal: "sdi" });
    assert.equal(sdi[0]?.id, "aja.kumo-1616");
  });
});
