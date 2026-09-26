#!/bin/sh
set -eu
case "${1:-}" in
  restore)
    pg_restore --clean --if-exists --no-owner --dbname "$RESTORE_DATABASE_URL" /dump
    ;;
  smoke)
    psql "$RESTORE_DATABASE_URL" -Atc "SELECT CASE WHEN to_regclass('public.\"User\"') IS NULL THEN 'missing' ELSE 'User' END;"
    ;;
  *)
    echo "restore-exec" >&2
    exit 2
    ;;
esac
