import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CORPORATE_GEAR } from "../corporate-nodes.ts";
import { asDrawingFile } from "../drawing.ts";
import { validateNetwork } from "./address.ts";
import { validateLinks } from "./links.ts";
import { auditModules, freshInterfaces, networkTemplates } from "./modules.ts";
import { assignAddressPlan } from "./plan.ts";
import { cidrToMask, maskToCidr, migratePort, migratePorts } from "./schema.ts";

describe("network schema migration", () => {
  it("keeps a 1.0.0 address and fills the new NIC fields", () => {
    const port = migratePort({
      name: "eth0",
      mode: "static",
      address: "10.0.10.21",
      cidr: 24,
      gateway: "10.0.10.1",
      vlan: 10,
      mac: "aa:bb:cc:dd:ee:21",
      hostname: "cam-1",
    });
    assert.equal(port.address, "10.0.10.21");
    assert.equal(port.vlan, 10);
    assert.equal(port.mac, "aa:bb:cc:dd:ee:21");
    assert.equal(port.role, "management");
    assert.equal(port.mask, "255.255.255.0");
    assert.equal(port.mediaTransport, "");
    assert.deepEqual(port.multicast, []);
    assert.equal(port.ptpDomain, null);
  });

  it("migrates a saved drawing without dropping nodes", () => {
    const file = asDrawingFile({
      nodes: [
        {
          id: "box-1",
          equipmentId: 4,
          unitId: "CAM-1",
          ip: "10.1.1.8",
          specialNotes: "",
          x: 0,
          y: 0,
          interfaces: [{ name: "LAN", mode: "dhcp", address: "", cidr: null, gateway: "", vlan: null, mac: "", hostname: "" }],
        },
      ],
      edges: [],
    });
    assert.equal(file.nodes[0]?.interfaces?.[0]?.mode, "dhcp");
    assert.equal(file.nodes[0]?.interfaces?.[0]?.role, "management");
    assert.equal(file.nodes[0]?.ip, "10.1.1.8");
  });

  it("round-trips a dotted mask and a prefix", () => {
    assert.equal(cidrToMask(24), "255.255.255.0");
    assert.equal(maskToCidr("255.255.255.0"), 24);
    assert.equal(maskToCidr("255.0.255.0"), null);
  });
});

describe("network validation", () => {
  it("flags a duplicate address, a VLAN mismatch on a link, and a subnet mismatch", () => {
    const devices = [
      {
        id: "a",
        label: "Camera",
        interfaces: migratePorts([{ name: "LAN", mode: "static", address: "10.10.10.21", cidr: 24, gateway: "10.10.10.1", vlan: 10, mac: "", hostname: "cam" }]),
      },
      {
        id: "b",
        label: "Switcher",
        interfaces: migratePorts([{ name: "LAN", mode: "static", address: "10.10.10.21", cidr: 24, gateway: "10.10.20.1", vlan: 20, mac: "", hostname: "sw" }]),
      },
    ];
    const issues = validateNetwork(devices);
    assert.ok(issues.some((issue) => issue.code === "duplicate-ip"));
    const links = validateLinks(devices, [{ id: "e1", sourceId: "a", sourcePort: "LAN", targetId: "b", targetPort: "LAN" }]);
    assert.ok(links.some((issue) => issue.code === "link-vlan-mismatch"));
    const other = [
      devices[0],
      {
        id: "c",
        label: "Record",
        interfaces: migratePorts([{ name: "LAN", mode: "static", address: "10.10.20.30", cidr: 24, gateway: "", vlan: 10, mac: "", hostname: "rec" }]),
      },
    ];
    const subnets = validateLinks(other, [{ id: "e2", sourceId: "a", sourcePort: "LAN", targetId: "c", targetPort: "LAN" }]);
    assert.ok(subnets.some((issue) => issue.code === "link-subnet-mismatch"));
  });

  it("rejects a bad multicast group and a PTP domain", () => {
    const issues = validateNetwork([
      {
        id: "a",
        label: "IP card",
        interfaces: [
          {
            name: "media",
            mode: "static",
            address: "10.10.20.10",
            cidr: 24,
            gateway: "",
            vlan: 20,
            mac: "",
            hostname: "ip",
            multicast: ["10.1.1.1"],
            ptpDomain: 200,
          },
        ],
      },
    ]);
    assert.ok(issues.some((issue) => issue.code === "bad-multicast"));
    assert.ok(issues.some((issue) => issue.code === "bad-ptp"));
  });
});

describe("address plan", () => {
  it("fills empty static NICs and leaves an address that was already typed", () => {
    const result = assignAddressPlan([
      {
        id: "a",
        label: "CAM-1",
        interfaces: migratePorts([
          { name: "LAN", role: "control", mode: "static", address: "10.0.0.5", cidr: 24, gateway: "", vlan: 30, mac: "", hostname: "" },
        ]),
      },
      {
        id: "b",
        label: "CAM-2",
        interfaces: migratePorts([{ name: "LAN", role: "control", mode: "static", address: "", cidr: null, gateway: "", vlan: null, mac: "", hostname: "" }]),
      },
    ]);
    assert.equal(result.devices[0]?.interfaces[0]?.address, "10.0.0.5");
    assert.equal(result.devices[1]?.interfaces[0]?.address, "10.10.30.10");
    assert.equal(result.devices[1]?.interfaces[0]?.vlan, 30);
    assert.equal(result.assigned, 1);
    assert.equal(result.kept, 1);
  });
});

describe("built-in modules", () => {
  it("gives every network jack a NIC template and adds the missing control LANs", () => {
    const problems = auditModules(CORPORATE_GEAR);
    assert.deepEqual(problems, []);
    const atem = networkTemplates("ATEM Mini Pro", [{ label: "LAN", signal: "Ethernet" }]);
    assert.equal(atem[0]?.controlProtocol, "ATEM");
    assert.equal(atem[0]?.controlPort, 9910);
    assert.equal(atem[0]?.role, "control");
    const placed = freshInterfaces("AW-UE160", [{ label: "LAN", signal: "Ethernet" }], "CAM-1");
    assert.equal(placed[0]?.address, "");
    assert.equal(placed[0]?.controlProtocol, "Panasonic AW");
    assert.match(placed[0]?.hostname ?? "", /cam-1/i);
  });
});
