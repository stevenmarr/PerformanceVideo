import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { studioOwnerLocked } from "./studio-owner.ts";

describe("studio owner", () => {
  it("refuses to demote, disable, or delete stevenmarr", () => {
    assert.match(studioOwnerLocked("stevenmarr") ?? "", /cannot be demoted/);
    assert.match(studioOwnerLocked("StevenMarr") ?? "", /cannot be demoted/);
    assert.equal(studioOwnerLocked("ada"), null);
    assert.equal(studioOwnerLocked(""), null);
  });
});
