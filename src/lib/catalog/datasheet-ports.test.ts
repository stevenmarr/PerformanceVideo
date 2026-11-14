import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import { applyDatasheetPorts, catalogRows } from "../../../scripts/catalog-import.mjs";
import { datasheetPortOverlay } from "../../../scripts/datasheet-ports.mjs";

type Port = { id: string; count: number | null; direction?: string; signal_type?: string };
type Device = {
  id: string;
  manufacturer_id: string;
  port_data_confidence: string;
  ports: Port[];
  sources?: { url?: string }[];
};

const ALLOWED = new Set(["barco", "brompton", "roe", "panasonic", "sony", "grassvalley"]);

describe("datasheet port overlay", () => {
  it("cites a source for every count and leaves the rest of the catalog untouched", async () => {
    const catalog = JSON.parse(await readFile(new URL("../../../data/catalog/devices.json", import.meta.url), "utf8")) as {
      devices: Device[];
    };
    const byId = new Map(catalog.devices.map((device) => [device.id, device]));
    for (const patch of datasheetPortOverlay as { id: string; sources: { url: string }[]; ports: Port[] }[]) {
      const device = byId.get(patch.id);
      assert.ok(device, patch.id);
      assert.equal(ALLOWED.has(device.manufacturer_id), true, patch.id);
      assert.ok(patch.sources.every((source) => typeof source.url === "string" && source.url.startsWith("http")));
      for (const port of patch.ports) {
        assert.equal(Number.isInteger(port.count) && (port.count ?? 0) >= 1, true, `${patch.id} ${port.id}`);
      }
    }
    const patched = applyDatasheetPorts(catalog.devices, datasheetPortOverlay) as Device[];
    function must(id: string): Device {
      const device = patched.find((item) => item.id === id);
      assert.ok(device, id);
      return device;
    }
    function count(device: Device, id: string): number | null {
      const found = device.ports.find((port) => port.id === id);
      assert.ok(found, id);
      return found.count;
    }
    const e2 = must("barco.event-master-e2");
    assert.equal(e2.port_data_confidence, "high");
    assert.equal(count(e2, "hdmi-in"), 12);
    assert.equal(count(e2, "sdi-in"), 16);
    const jr = must("barco.event-master-s3-4k-jr");
    assert.equal(jr.ports.some((port) => port.id === "sdi-out"), false);
    const sx40 = must("brompton.tessera-sx40");
    assert.equal(count(sx40, "hdmi-in"), 1);
    assert.equal(count(sx40, "eth-10g"), 4);
    const ue150 = must("panasonic.aw-ue150");
    assert.equal(count(ue150, "sdi-12g"), 1);
    const am7 = must("sony.brc-am7");
    assert.equal(am7.ports.filter((port) => (port.signal_type ?? "").startsWith("sdi")).length, 2);
    const ldx = must("grassvalley.ldx-150");
    assert.equal(count(ldx, "bnc-a-e"), 5);
    assert.equal(ldx.ports.find((port) => port.id === "bnc-a-e")?.direction, "bidirectional");
    const untouched = must("barco.event-master-ex");
    assert.equal(untouched.port_data_confidence, "none");
    assert.deepEqual(untouched.ports, []);
    const schema = JSON.parse(await readFile(new URL("../../../data/catalog/schema.json", import.meta.url), "utf8"));
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const validate = ajv.compile(schema);
    const ok = validate({
      ...catalog,
      devices: patched.filter((device) =>
        (datasheetPortOverlay as { id: string }[]).some((patch) => patch.id === device.id),
      ),
    });
    assert.equal(ok, true, ajv.errorsText(validate.errors, { separator: "\n" }).slice(0, 800));
    const rows = catalogRows({ devices: patched }) as { rows: { id: string; portsUnverified: boolean; portsJson: string }[] };
    const e2row = rows.rows.find((row) => row.id === "barco.event-master-e2");
    assert.ok(e2row);
    assert.equal(e2row.portsUnverified, false);
    assert.equal(JSON.parse(e2row.portsJson).find((port: Port) => port.id === "dp-in").count, 12);
  });
});
