#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
ROOT="$(cd "$PWD/../.." && pwd)"
if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="file:${PWD}/prisma/dev.db"
fi
if [ -z "${UPLOADS_DIR:-}" ]; then
  export UPLOADS_DIR="${ROOT}/uploads"
fi
exec "$@"
