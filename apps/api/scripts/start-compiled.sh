#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
tsc-alias -p tsconfig.build.json
exec node dist/apps/api/src/main.js
