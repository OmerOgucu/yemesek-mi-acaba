#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
ROOT="$(cd "$PWD/../.." && pwd)"
if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="file:${ROOT}/packages/database/prisma/dev.db"
fi
if [ -z "${PORT:-}" ]; then
  export PORT=3001
fi
if [ -z "${JWT_ACCESS_SECRET:-}" ]; then
  export JWT_ACCESS_SECRET="dev-only-access-secret-change-me"
fi
if [ -z "${UPLOADS_DIR:-}" ]; then
  export UPLOADS_DIR="${ROOT}/uploads"
fi
exec "$@"
