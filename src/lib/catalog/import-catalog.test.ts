import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import { catalogRows, pinsFromPorts, portsForDevice } from "../../../scripts/catalog-import.mjs";

describe("device catalog import", () => {
  it("validates the shipped catalog and keeps unknown port counts unknown", async () => {
    const schema = JSON.parse(await readFile(new URL("../../../data/catalog/schema.json", import.meta.url), "utf8"));
    const catalog = JSON.parse(await readFile(new URL("../../../data/catalog/devices.json", import.meta.url), "utf8"));
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const validate = ajv.compile(schema);
    const ok = validate(catalog);
    assert.equal(ok, true, ajv.errorsText(validate.errors, { separator: "\n" }).slice(0, 500));
    assert.equal(catalog.devices.length, 723);
    const { rows, errors } = catalogRows(catalog);
    assert.equal(errors.length, 0);
    assert.equal(rows.length, 723);
    const unverified = rows.filter((row) => row.portDataConfidence === "none");
    assert.ok(unverified.length >= 480);
    for (const row of unverified) {
      const ports = JSON.parse(row.portsJson);
      assert.equal(ports.length, 1);
      assert.equal(ports[0].count, null);
      assert.equal(ports[0].unverified, true);
      assert.equal(pinsFromPorts(ports).length, 1);
    }
    const kumo = rows.find((row) => row.id === "aja.kumo-1616");
    assert.ok(kumo);
    const kumoPorts = JSON.parse(kumo.portsJson) as { id: string; count: number | null }[];
    assert.equal(kumoPorts.find((port) => port.id === "sdi-out")?.count, 16);
    assert.equal(pinsFromPorts(kumoPorts).filter((pin) => pin.id.startsWith("sdi-out")).length, 16);
  });

  it("does not invent a count when a confirmed group left count null", () => {
    const shaped = portsForDevice({
      id: "example.box",
      manufacturer: "Example",
      model: "Box",
      port_data_confidence: "high",
      ports: [{ id: "sdi-in", name: "SDI In", direction: "in", signal_type: "sdi-12g", connector: "bnc", count: null }],
    });
    assert.equal(shaped.ports[0].count, null);
    assert.equal(shaped.unverified, true);
    assert.equal(pinsFromPorts(shaped.ports).length, 1);
  });
});
