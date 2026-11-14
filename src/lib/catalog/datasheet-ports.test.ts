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
        if (port.count == null) continue;
        assert.equal(Number.isInteger(port.count) && port.count >= 1, true, `${patch.id} ${port.id}`);
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
    const ex = must("barco.event-master-ex");
    assert.equal(ex.port_data_confidence, "medium");
    assert.equal(count(ex, "ref-in"), 1);
    assert.equal(count(ex, "video-in"), null);
    const e2jr = must("barco.event-master-e2-jr");
    assert.equal(count(e2jr, "hdmi-in"), 6);
    assert.equal(count(e2jr, "sdi-out"), 4);
    const imagepro = must("barco.imagepro-4k");
    assert.equal(count(imagepro, "sdi-in"), 4);
    assert.equal(count(imagepro, "sdi-out"), 4);
    const s4 = must("brompton.tessera-s4");
    assert.equal(s4.ports.some((port) => port.signal_type === "hdmi"), false);
    assert.equal(count(s4, "eth-1g"), 4);
    assert.equal(count(must("panasonic.av-uhs500"), "sdi-in"), 8);
    assert.equal(count(must("sony.xvs-g1"), "sdi-out"), 12);
    assert.equal(count(must("panasonic.kairos"), "sdi"), null);
    const xvs9000 = must("sony.xvs-9000");
    assert.equal(count(xvs9000, "video-in"), null);
    assert.equal(count(xvs9000, "ac"), 6);
    assert.equal(count(must("sony.xvs-8000"), "ac"), 4);
    assert.equal(count(must("sony.xvs-6000"), "ac"), 2);
    assert.equal(count(must("panasonic.av-hs6000"), "sdi-in"), 32);
    assert.equal(count(must("panasonic.av-hs6000"), "sdi-out"), 32);
    assert.equal(count(must("panasonic.av-hs410"), "sdi-in"), 8);
    assert.equal(count(must("panasonic.av-hs410"), "sdi-out"), 6);
    assert.equal(count(must("panasonic.av-hs50"), "sdi-out"), 3);
    assert.equal(count(must("panasonic.av-hsw10"), "hdmi-in"), 2);
    assert.equal(count(must("panasonic.av-hsw10"), "sdi-in"), 4);
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

  it("adds the original E2 and keeps card-dependent counts empty", async () => {
    const { datasheetExtraDevices } = await import("../../../scripts/datasheet-ports.mjs");
    const catalog = JSON.parse(await readFile(new URL("../../../data/catalog/devices.json", import.meta.url), "utf8")) as {
      devices: Device[];
    };
    const patched = applyDatasheetPorts(catalog.devices, datasheetPortOverlay, datasheetExtraDevices) as Device[];
    const original = patched.find((device) => device.id === "barco.event-master-e2-original");
    const gen2 = patched.find((device) => device.id === "barco.event-master-e2");
    assert.ok(original);
    assert.ok(gen2);
    assert.equal(original.ports.find((port) => port.id === "hdmi-in")?.count, 10);
    assert.equal(gen2.ports.find((port) => port.id === "hdmi-in")?.count, 12);
    const ex = patched.find((device) => device.id === "barco.event-master-ex");
    assert.equal(ex?.ports.find((port) => port.id === "video-in")?.count, null);
    assert.equal(patched.find((device) => device.id === "brompton.tessera-xd")?.ports.find((port) => port.id === "eth-1g")?.count, 10);
    assert.equal(patched.find((device) => device.id === "panasonic.av-uhs500")?.ports.find((port) => port.id === "sdi-in")?.count, 8);
    assert.equal(patched.find((device) => device.id === "panasonic.kairos")?.ports.find((port) => port.id === "sdi")?.count, null);
    assert.equal(patched.find((device) => device.id === "sony.xvs-g1")?.ports.find((port) => port.id === "sdi-in")?.count, 24);
    const panel = patched.find((device) => device.id === "roe.black-pearl");
    assert.equal(panel?.port_data_confidence, "none");
    assert.deepEqual(panel?.ports, []);
    const schema = JSON.parse(await readFile(new URL("../../../data/catalog/schema.json", import.meta.url), "utf8"));
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const validate = ajv.compile(schema);
    assert.equal(validate({ ...catalog, devices: [original] }), true, ajv.errorsText(validate.errors, { separator: "\n" }).slice(0, 500));
  });
});
