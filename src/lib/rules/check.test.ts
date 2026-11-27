import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkConnection, checkDesign } from "./check.ts";

describe("design rule checker", () => {
  it("lets 3G land on 12G and refuses HDMI on SDI with a converter", () => {
    const slower = checkConnection("3G-SDI", "12G-SDI");
    assert.equal(slower.ok, true);
    const crossed = checkConnection("HDMI", "12G-SDI");
    assert.equal(crossed.ok, false);
    assert.match(crossed.suggestion, /MD-HX|Micro Converter/);
    const findings = checkDesign(
      [
        { id: "a", label: "Laptop", pins: [{ id: "h", label: "HDMI Out", direction: "output", signal: "HDMI" }] },
        { id: "b", label: "Switch", pins: [{ id: "s", label: "SDI In", direction: "input", signal: "12G-SDI" }] },
      ],
      [{ id: "e", source: "a", target: "b", sourceHandle: "h", targetHandle: "s" }],
    );
    assert.equal(findings[0]?.code, "incompatible");
    assert.match(findings[0]?.suggestion ?? "", /converter|MD-HX|Micro/i);
  });

  it("names the LED fan-out when 10G hits a panel port", () => {
    const result = checkConnection("LED 10G", "LED data");
    assert.equal(result.ok, false);
    assert.match(result.suggestion, /Tessera XD/);
  });
});
