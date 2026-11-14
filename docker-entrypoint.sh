#!/bin/sh
set -eu
node scripts/migrate.mjs
node scripts/import-devices.mjs
exec node .output/server/index.mjs
