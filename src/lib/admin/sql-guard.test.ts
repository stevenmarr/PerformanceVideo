import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifySql, redactSqlLiterals, stripSqlComments, writeConfirmed } from "./sql-guard.ts";

describe("sql guard", () => {
  it("allows a single read and rejects a stacked write", () => {
    assert.equal(classifySql("select id from \"user\"").ok && (classifySql("select id from \"user\"") as { kind?: string }).kind, "read");
    const stacked = classifySql("select 1; drop table \"user\"");
    assert.equal(stacked.ok, false);
  });

  it("ignores comments that try to hide a second statement", () => {
    const hidden = classifySql("select 1 -- ;\n; drop table drawings");
    assert.equal(hidden.ok, false);
    assert.match(stripSqlComments("select 1 -- drop\n"), /select 1/);
  });

  it("treats data-changing CTE as a write and blocks file functions", () => {
    const cte = classifySql("with gone as (delete from drawings returning id) select * from gone");
    assert.equal(cte.ok && cte.kind, "write");
    assert.equal(classifySql("select pg_read_file('/etc/passwd')").ok, false);
  });

  it("requires both write phrases", () => {
    assert.equal(writeConfirmed("WRITE", "CONFIRM WRITE"), true);
    assert.equal(writeConfirmed("write", "CONFIRM WRITE"), false);
    assert.equal(writeConfirmed("WRITE", "WRITE"), false);
  });

  it("redacts string literals before they land in the audit log", () => {
    assert.equal(redactSqlLiterals("update \"user\" set email = 'secret@x.com'"), "update \"user\" set email = '…'");
  });
});
