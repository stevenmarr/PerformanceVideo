# Device catalog import

`data/catalog/devices.json` is the global library (schema `data/catalog/schema.json`). The import is safe to run more than once. The same `generated_at` does nothing; a newer file upserts by device id.

```bash
# Against Postgres. With no DATABASE_URL the script skips, and the app
# imports the file into the local database on startup when the file is present.
node scripts/import-devices.mjs
```

`port_data_confidence: none` (and any port group whose count was left null) becomes a single placeholder port marked unverified. Counts that are in the file are copied. Counts are never filled in from memory.

Coverage and the Companion manufacturers that are not in this file yet:

- `docs/catalog-coverage.md` — what is strong, what is identity-only, and which official sources were blocked.
- `docs/catalog-companion-gap.md` — the next manufacturers to add as identity-only nodes until a datasheet is in hand.

Next pass, still without invented port counts: Barco Event Master, Brompton Tessera, ROE panels, Panasonic PTZ and Kairos, Sony switchers and PTZ, Grass Valley K-Frame, then the Companion priority list (NovaStar, Roland, BirdDog, disguise, PIXERA, Millumin, vMix, TriCaster).
