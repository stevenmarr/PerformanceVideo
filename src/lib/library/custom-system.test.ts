import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseShowPhrase, matchPhrase } from "../assist/phrase.ts";
import { extractPdfText, parseProposal } from "../assist/proposal.ts";
import { pushHistory, undoHistory } from "../edit-history.ts";
import { filterGear, orderGear } from "./picker.ts";
import { applyDefinition, duplicateDraft, emptyDraft, syncNetworkToPorts, validateDraft } from "./custom-system.ts";

describe("custom modules", () => {
  it("requires a name, a maker, and one jack", () => {
    const draft = emptyDraft();
    assert.equal(validateDraft(draft, ["HDMI"]), "Name the module.");
    draft.name = "Podium";
    draft.manufacturer = "Unbranded";
    draft.ports = [{ id: "pin-1", label: "HDMI In", direction: "input", signal: "HDMI", connector: "HDMI" }];
    assert.equal(validateDraft(draft, ["HDMI"]), null);
    const copy = duplicateDraft(draft);
    assert.equal(copy.id, undefined);
    assert.match(copy.name, /copy/);
  });

  it("adds a NIC only for an Ethernet jack", () => {
    const ports = [
      { id: "pin-1", label: "HDMI In", direction: "input" as const, signal: "HDMI", connector: "" },
      { id: "pin-2", label: "LAN", direction: "output" as const, signal: "Ethernet", connector: "RJ45" },
    ];
    const network = syncNetworkToPorts(ports, []);
    assert.equal(network.length, 1);
    assert.equal(network[0]?.name, "LAN");
    assert.equal(network[0]?.role, "control");
  });

  it("updates every instance or only the selected box", () => {
    const nodes = [
      { id: "a", data: { equipmentId: 3, model: "Old", manufacturer: "Us", deviceType: "Switcher", kind: "device", color: "#111", pins: [] } },
      { id: "b", data: { equipmentId: 3, model: "Old", manufacturer: "Us", deviceType: "Switcher", kind: "device", color: "#111", pins: [] } },
    ];
    const definition = {
      equipmentId: 9,
      model: "New",
      manufacturer: "Us",
      deviceType: "Switcher",
      kind: "device",
      color: "#222",
      pins: [{ id: "pin-1", label: "HDMI In", direction: "input" as const, signal: "HDMI" }],
    };
    const all = applyDefinition(nodes, definition, { mode: "all", fromId: 3 });
    assert.equal(all.updated, 2);
    assert.equal(all.nodes[1]?.data.model, "New");
    const one = applyDefinition(nodes, definition, { mode: "one", nodeId: "a" });
    assert.equal(one.updated, 1);
    assert.equal(one.nodes[0]?.data.equipmentId, 9);
    assert.equal(one.nodes[1]?.data.model, "Old");
  });
});

describe("library picker", () => {
  const gear = [
    { id: 1, model: "ATEM", manufacturer: "Blackmagic Design", deviceType: "Switcher", kind: "device", origin: "builtin" as const, notes: "" },
    { id: 2, model: "Podium", manufacturer: "Unbranded", deviceType: "Switcher", kind: "device", origin: "custom" as const, notes: "show" },
  ];

  it("filters by category and keeps favorites first", () => {
    assert.equal(filterGear(gear, "podium", "").length, 1);
    assert.equal(filterGear(gear, "", "Switcher").length, 2);
    assert.equal(orderGear(gear, [2], [1])[0]?.id, 2);
  });
});

describe("show phrase", () => {
  it("reads a 2 M/E switcher and eight cameras without placing them", () => {
    const plan = parseShowPhrase("add a 2 M/E switcher with 8 cameras");
    assert.ok(plan);
    assert.equal(plan?.items.find((item) => item.category === "Camera")?.count, 8);
    assert.equal(plan?.items.find((item) => item.category === "Switcher")?.count, 1);
    const matched = matchPhrase(plan!, [
      { id: 1, model: "ATEM Television Studio HD8", manufacturer: "Blackmagic Design", deviceType: "Switcher" },
      { id: 2, model: "AW-UE160", manufacturer: "Panasonic", deviceType: "Camera" },
    ]);
    assert.equal(matched[0]?.gear?.id, 1);
    assert.equal(matched[1]?.gear?.model, "AW-UE160");
  });
});

describe("datasheet draft", () => {
  it("reads a proposal and a tiny PDF string, and does not keep an address", () => {
    const parsed = parseProposal('sure {"manufacturer":"AJA","model":"Ki Pro","category":"Recorder","notes":"","ports":[{"label":"SDI In","direction":"input","signal":"12G-SDI","connector":"BNC"}],"network":[{"name":"LAN","role":"control","controlProtocol":"HTTP","address":"10.0.0.9"}]}');
    assert.equal(parsed.proposal?.ports[0]?.label, "SDI In");
    assert.equal(parsed.proposal?.network[0]?.address, "");
    assert.equal(parsed.proposal?.network[0]?.controlProtocol, "HTTP");
    const text = extractPdfText("junk (HDMI In 1) more (12G-SDI Out)");
    assert.match(text, /HDMI In 1/);
    assert.match(text, /12G-SDI Out/);
  });
});

describe("undo", () => {
  it("restores the previous drawing step", () => {
    const past = pushHistory([], { label: "place", state: { boxes: 1 } });
    const undone = undoHistory(past, [], { label: "now", state: { boxes: 2 } });
    assert.equal(undone.present?.label, "place");
    assert.equal(undone.present?.state.boxes, 1);
    assert.equal(undone.future.length, 1);
  });
});
