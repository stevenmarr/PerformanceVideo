import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMailer } from "./mailer.ts";

describe("mailer", () => {
  it("logs mail when SMTP is not configured", async () => {
    const lines: string[] = [];
    const mailer = createMailer({}, (line) => lines.push(line));
    assert.equal(mailer.kind, "console");
    await mailer.send({ to: "a@example.com", subject: "Reset", text: "https://example.com/reset?token=abc" });
    assert.match(lines.join("\n"), /a@example.com/);
    assert.match(lines.join("\n"), /token=abc/);
  });

  it("selects SMTP when host and from are set", () => {
    const mailer = createMailer({ SMTP_HOST: "smtp.example.com", SMTP_FROM: "draw@example.com" });
    assert.equal(mailer.kind, "smtp");
  });
});
