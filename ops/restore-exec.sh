#!/bin/sh
set -eu
case "${1:-}" in
  restore)
    pg_restore --clean --if-exists --no-owner --dbname "$RESTORE_DATABASE_URL" /dump
    ;;
  smoke)
    psql "$RESTORE_DATABASE_URL" -Atc "SELECT to_regclass('public.\"User\"');"
    ;;
  *)
    echo "restore-exec" >&2
    exit 2
    ;;
esac
