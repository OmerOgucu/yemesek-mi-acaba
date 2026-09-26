#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="postgresql://yemesek:yemesek@127.0.0.1:5432/yemesek_dev"
fi
case "$DATABASE_URL" in
  file:*)
    echo "SQLite DATABASE_URL is not supported." >&2
    exit 1
    ;;
esac
exec "$@"
