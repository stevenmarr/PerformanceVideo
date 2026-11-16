import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  lastDrawingStorageKey,
  pickOpenDrawing,
  readLastDrawingId,
  writeLastDrawingId,
} from "./drawing-open.ts";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (key: string) => (key in data ? data[key] : null),
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
    removeItem: (key: string) => {
      delete data[key];
    },
    data,
  };
}

const list = [
  { id: 1, templateKey: "solventum" },
  { id: 2, templateKey: "jpm" },
  { id: 3, templateKey: "" },
];

describe("last drawing memory", () => {
  it("stores and reads a per-user drawing id", () => {
    const storage = memoryStorage();
    assert.equal(readLastDrawingId(storage, "user-a"), null);
    writeLastDrawingId(storage, "user-a", 3);
    assert.equal(readLastDrawingId(storage, "user-a"), 3);
    assert.equal(storage.data[lastDrawingStorageKey("user-a")], "3");
    assert.equal(readLastDrawingId(storage, "user-b"), null);
    writeLastDrawingId(storage, "user-a", null);
    assert.equal(readLastDrawingId(storage, "user-a"), null);
  });

  it("prefers the remembered drawing, then JPM, then Solventum, then the first row", () => {
    assert.equal(pickOpenDrawing(list, 3)?.id, 3);
    assert.equal(pickOpenDrawing(list, 99)?.id, 2);
    assert.equal(pickOpenDrawing(list, null)?.id, 2);
    assert.equal(pickOpenDrawing([{ id: 1, templateKey: "solventum" }], null)?.id, 1);
    assert.equal(pickOpenDrawing([], 3), undefined);
  });
});
