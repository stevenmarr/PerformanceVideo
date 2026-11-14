import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRowDelete, buildRowUpdate, buildTableSelect, cellText, exportWindow, toCsv } from "./table-query.ts";

const columns = ["id", "email", "password", "name"];

describe("table browser queries", () => {
  it("parameterizes filters and rejects odd identifiers", () => {
    const query = buildTableSelect({
      table: "user",
      columns,
      filter: { column: "email", op: "contains", value: "50%_\\" },
      sort: { column: "name", dir: "desc" },
      limit: 999,
      offset: -4,
    });
    assert.match(query.text, /ilike \$1 escape/);
    assert.match(query.text, /order by "name" desc/);
    assert.match(query.text, /limit \$2 offset \$3/);
    assert.deepEqual(query.params[0], "%50\\%\\_\\\\%");
    assert.equal(query.params[1], 200);
    assert.equal(query.params[2], 0);
    assert.throws(() => buildTableSelect({ table: "user;drop", columns: ["id"], limit: 10, offset: 0 }));
    const searched = buildTableSelect({
      table: "user",
      columns,
      search: "ada",
      limit: 25,
      offset: 0,
    });
    assert.match(searched.text, /"email"::text ilike/);
    assert.match(searched.text, /"name"::text ilike/);
    assert.doesNotMatch(searched.text, /"password"::text ilike/);
    assert.equal(searched.params.filter((item) => item === "%ada%").length, 3);
  });

  it("masks secrets and refuses to write them from the grid", () => {
    assert.equal(cellText("hash", "password", false), "••••");
    assert.equal(cellText("hash", "password", true), "hash");
    const blocked = buildRowUpdate({
      table: "account",
      columns,
      primaryKey: ["id"],
      changes: { password: "nope" },
      key: { id: "1" },
    });
    assert.equal("error" in blocked, true);
    const ok = buildRowUpdate({
      table: "user",
      columns,
      primaryKey: ["id"],
      changes: { name: "Ada" },
      key: { id: "1" },
    });
    assert.equal("text" in ok, true);
    const deleted = buildRowDelete({ table: "user", columns, primaryKey: ["id"], key: { id: "1" } });
    assert.equal("text" in deleted && deleted.text.startsWith("delete from"), true);
  });

  it("escapes csv", () => {
    assert.equal(toCsv(["name"], [{ name: "a, \"b\"" }]), "name\n\"a, \"\"b\"\"\"");
  });

  it("pages an export past 5,000 rows and stops at the cap", () => {
    const six = exportWindow(6000);
    assert.deepEqual(six.offsets, [0, 1000, 2000, 3000, 4000, 5000]);
    assert.equal(six.take, 6000);
    assert.equal(six.truncated, false);
    const capped = exportWindow(100_001);
    assert.equal(capped.offsets.length, 100);
    assert.equal(capped.take, 100_000);
    assert.equal(capped.truncated, true);
    assert.equal(exportWindow(0).offsets.length, 0);
  });
});
