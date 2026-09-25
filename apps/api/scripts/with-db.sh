#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="file:${PWD}/prisma/dev.db"
fi
if [ -z "${PORT:-}" ]; then
  export PORT=3001
fi
exec "$@"
