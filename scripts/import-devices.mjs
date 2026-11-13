#!/usr/bin/env node
/**
 * Load data/catalog/devices.json into device_definitions.
 * Safe to run again: the same generated_at is a no-op, otherwise rows are upserted.
 * No DATABASE_URL: skip (PGLite imports on server start when the file is present).
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { upsertCatalog } from "./catalog-import.mjs";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.log("[catalog] DATABASE_URL not set — skipping (the app imports into PGLite on startup).");
  process.exit(0);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = join(root, "data", "catalog", "devices.json");
const catalog = JSON.parse(await readFile(file, "utf8"));
const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
try {
  const result = await upsertCatalog(
    async (text, params = []) => (await pool.query(text, params)).rows,
    catalog,
  );
  console.log(`[catalog] ${result.status} ${result.count} devices`);
} finally {
  await pool.end();
}
