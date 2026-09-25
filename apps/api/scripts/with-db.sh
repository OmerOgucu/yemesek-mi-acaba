#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
ROOT="$(cd "$PWD/../.." && pwd)"
if [ -z "${DATABASE_URL:-}" ]; then
  if [ "${1:-}" = "jest" ]; then
    export DATABASE_URL="postgresql://yemesek:yemesek@127.0.0.1:5432/yemesek_test"
  else
    export DATABASE_URL="postgresql://yemesek:yemesek@127.0.0.1:5432/yemesek_dev"
  fi
fi
case "$DATABASE_URL" in
  file:*)
    echo "SQLite DATABASE_URL is not supported." >&2
    exit 1
    ;;
esac
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
