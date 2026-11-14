import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import { companionIdentityCatalog } from "../../../scripts/companion-identity-source.mjs";
import { catalogRows, pinsFromPorts } from "../../../scripts/catalog-import.mjs";
import { searchDevices } from "./search.ts";

describe("companion identity nodes", () => {
  it("validates as catalog devices and never records a port count", async () => {
    const schema = JSON.parse(await readFile(new URL("../../../data/catalog/schema.json", import.meta.url), "utf8"));
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const validate = ajv.compile(schema);
    const ok = validate(companionIdentityCatalog);
    assert.equal(ok, true, ajv.errorsText(validate.errors, { separator: "\n" }).slice(0, 800));
    assert.ok(companionIdentityCatalog.devices.length >= 80);
    const ids = new Set();
    for (const device of companionIdentityCatalog.devices) {
      assert.equal(ids.has(device.id), false, device.id);
      ids.add(device.id);
      assert.equal(device.port_data_confidence, "none");
      assert.deepEqual(device.ports, []);
    }
    const { rows, errors } = catalogRows(companionIdentityCatalog);
    assert.equal(errors.length, 0);
    for (const row of rows) {
      const ports = JSON.parse(row.portsJson);
      assert.equal(ports.length, 1);
      assert.equal(ports[0].count, null);
      assert.equal(ports[0].unverified, true);
      assert.equal(pinsFromPorts(ports).some((pin) => typeof pin.label === "string" && /\d{2,}/.test(pin.label)), false);
    }
    const found = searchDevices(
      rows.map((row) => ({
        id: row.id,
        manufacturer: row.manufacturer,
        model: row.model,
        family: row.family,
        category: row.category,
        confidence: row.portDataConfidence,
        unverified: row.portsUnverified,
        aliases: [],
        signals: ["unknown"],
        connectors: ["unknown"],
      })),
      "pixera",
    );
    assert.equal(found[0]?.id, "avstumpfl.pixera");
    const nova = searchDevices(
      rows.map((row) => ({
        id: row.id,
        manufacturer: row.manufacturer,
        model: row.model,
        family: row.family,
        category: row.category,
        confidence: "none",
        unverified: true,
        aliases: [],
        signals: [],
        connectors: [],
      })),
      "mctrl4k",
    );
    assert.equal(nova[0]?.manufacturer, "NovaStar");
  });
});
