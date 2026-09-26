#!/bin/sh
set -eu
case "${1:-}" in
  restore)
    pg_restore --exit-on-error --single-transaction --clean --if-exists --no-owner --dbname "$RESTORE_DATABASE_URL" /dump
    ;;
  smoke)
    psql "$RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 -Atc "SELECT CASE WHEN to_regclass('public.\"User\"') IS NULL THEN 'missing-user' WHEN to_regclass('public.\"RefreshToken\"') IS NULL THEN 'missing-refresh' WHEN to_regclass('public.\"Report\"') IS NULL THEN 'missing-report' WHEN NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.\"User\"'::regclass AND contype IN ('p','u')) THEN 'missing-constraint' WHEN (SELECT COUNT(*) FROM public.\"User\") < 1 THEN 'missing-row' ELSE 'ok' END;"
    ;;
  *)
    echo "restore-exec" >&2
    exit 2
    ;;
esac
