#!/bin/sh
set -eu
node scripts/migrate.mjs
exec node .output/server/index.mjs
