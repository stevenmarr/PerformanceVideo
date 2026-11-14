import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { groupNetwork, parseIpv4, validateNetwork, type NetDevice } from "./address.ts";

const devices: NetDevice[] = [
  {
    id: "a",
    label: "Switch",
    interfaces: [
      { name: "mgmt", mode: "static", address: "10.0.10.1", cidr: 24, gateway: "10.0.10.254", vlan: 10, mac: "aa:bb:cc:dd:ee:01", hostname: "sw" },
    ],
  },
  {
    id: "b",
    label: "Camera",
    interfaces: [
      { name: "eth", mode: "static", address: "10.0.10.1", cidr: 24, gateway: "10.0.20.1", vlan: 20, mac: "aa:bb:cc:dd:ee:01", hostname: "sw" },
    ],
  },
  {
    id: "c",
    label: "Panel",
    interfaces: [
      { name: "eth", mode: "static", address: "10.0.10.0", cidr: 24, gateway: "", vlan: 10, mac: "not-a-mac", hostname: "panel" },
    ],
  },
];

describe("network table", () => {
  it("parses IPv4 and reports duplicates, gateway, subnet, vlan, and hostname problems", () => {
    assert.equal(parseIpv4("10.0.10.1"), 0x0a000a01);
    assert.equal(parseIpv4("10.0.10.256"), null);
    const issues = validateNetwork(devices);
    assert.ok(issues.some((issue) => issue.code === "duplicate-ip"));
    assert.ok(issues.some((issue) => issue.code === "gateway-outside"));
    assert.ok(issues.some((issue) => issue.code === "outside-subnet"));
    assert.ok(issues.some((issue) => issue.code === "duplicate-mac"));
    assert.ok(issues.some((issue) => issue.code === "duplicate-hostname"));
    assert.ok(issues.some((issue) => issue.code === "vlan-mismatch"));
    const groups = groupNetwork(devices);
    assert.ok(groups.some((group) => group.subnet === "10.0.10.0/24"));
  });
});
