import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashPassword, isBcryptHash, verifyStoredPassword } from "./password-crypto.ts";
import { hashResetToken, isRateLimited, newResetToken, tokenStillValid } from "./reset-policy.ts";

describe("password crypto", () => {
  it("stores bcrypt and rejects the wrong password", async () => {
    const hash = await hashPassword("correct horse", 4);
    assert.equal(isBcryptHash(hash), true);
    assert.equal(await verifyStoredPassword(hash, "correct horse"), true);
    assert.equal(await verifyStoredPassword(hash, "nope"), false);
  });
});

describe("reset policy", () => {
  it("hashes tokens and treats them as single-use and expiring", () => {
    const token = newResetToken();
    assert.notEqual(hashResetToken(token), token);
    assert.equal(hashResetToken(token), hashResetToken(token));
    const now = new Date("2026-01-01T00:00:00Z");
    assert.equal(tokenStillValid("2026-01-01T01:00:00Z", null, now), true);
    assert.equal(tokenStillValid("2026-01-01T00:00:00Z", null, now), false);
    assert.equal(tokenStillValid("2026-01-01T01:00:00Z", "2026-01-01T00:30:00Z", now), false);
  });

  it("rate-limits email and ip buckets independently", () => {
    assert.equal(isRateLimited(4, 19), false);
    assert.equal(isRateLimited(5, 0), true);
    assert.equal(isRateLimited(0, 20), true);
  });
});
