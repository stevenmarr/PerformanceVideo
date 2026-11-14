#!/usr/bin/env node
/**
 * Load every data/catalog/*.json catalog (except schema.json) into device_definitions.
 * Safe to run again: each file is skipped when its generated_at is already imported.
 * No DATABASE_URL: skip (the app imports into PGLite on startup when the files are present).
 */
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { applyDatasheetPorts, upsertCatalog } from "./catalog-import.mjs";
import { companionIdentityCatalog } from "./companion-identity-source.mjs";
import { datasheetExtraDevices, datasheetPortOverlay } from "./datasheet-ports.mjs";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.log("[catalog] DATABASE_URL not set — skipping (the app imports into PGLite on startup).");
  process.exit(0);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "catalog");
const names = (await readdir(root)).filter((name) => name.endsWith(".json") && name !== "schema.json").sort();
const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
try {
  const query = async (text, params = []) => (await pool.query(text, params)).rows;
  for (const name of names) {
    const catalog = JSON.parse(await readFile(join(root, name), "utf8"));
    if (name === "devices.json") {
      catalog.devices = applyDatasheetPorts(catalog.devices, datasheetPortOverlay, datasheetExtraDevices);
    }
    const result = await upsertCatalog(query, catalog, name.replace(/\.json$/, ""));
    console.log(`[catalog] ${name} ${result.status} ${result.count} devices`);
  }
  const companion = await upsertCatalog(query, companionIdentityCatalog, "companion-identity");
  console.log(`[catalog] companion-identity ${companion.status} ${companion.count} devices`);
} finally {
  await pool.end();
}
