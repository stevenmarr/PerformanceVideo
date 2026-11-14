import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { groupNetwork, networkDocument, networkToCsv, parseIpv4, parseIpv6, validateNetwork, type NetDevice } from "./address.ts";

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

  it("accepts IPv6 prefixes, groups them, and keeps the export", () => {
    assert.equal(parseIpv6("2001:0db8:0000:0000:0000:0000:0000:0001"), parseIpv6("2001:db8::1"));
    assert.equal(parseIpv6("::1"), 1n);
    assert.equal(parseIpv6("1::2::3"), null);
    assert.equal(parseIpv6("fe80::1%eth0"), null);
    const v6: NetDevice[] = [
      {
        id: "a",
        label: "Core",
        interfaces: [
          { name: "mgmt", mode: "static", address: "2001:db8:1::1", cidr: 64, gateway: "2001:db8:1::ffff", vlan: 10, mac: "", hostname: "core" },
        ],
      },
      {
        id: "b",
        label: "Camera",
        interfaces: [
          { name: "eth", mode: "static", address: "2001:0db8:0001::1", cidr: 64, gateway: "2001:db8:2::1", vlan: 20, mac: "", hostname: "cam" },
        ],
      },
      {
        id: "c",
        label: "Wide",
        interfaces: [
          { name: "eth", mode: "static", address: "2001:db8::", cidr: 32, gateway: "", vlan: 10, mac: "", hostname: "wide" },
        ],
      },
      {
        id: "d",
        label: "Four",
        interfaces: [
          { name: "eth", mode: "static", address: "10.1.1.1", cidr: 64, gateway: "", vlan: null, mac: "", hostname: "four" },
        ],
      },
    ];
    const issues = validateNetwork(v6);
    assert.ok(issues.some((issue) => issue.code === "duplicate-ip"));
    assert.ok(issues.some((issue) => issue.code === "gateway-outside"));
    assert.ok(issues.some((issue) => issue.code === "outside-subnet" && issue.deviceId === "c"));
    assert.ok(issues.some((issue) => issue.code === "overlapping-subnets"));
    assert.ok(issues.some((issue) => issue.code === "vlan-mismatch"));
    assert.ok(issues.some((issue) => issue.code === "invalid-address" && issue.deviceId === "d"));
    const groups = groupNetwork(v6);
    assert.ok(groups.some((group) => group.subnet === "2001:db8:1::/64"));
    assert.ok(groups.some((group) => group.subnet === "2001:db8::/32"));
    const csv = networkToCsv(v6);
    assert.match(csv, /2001:db8:1::1/);
    assert.equal(networkDocument("Show", v6).schema, "pvllc.network/1.0.0");
    assert.equal(networkDocument("Show", v6).devices[1]?.interfaces[0]?.address, "2001:0db8:0001::1");
  });
});
