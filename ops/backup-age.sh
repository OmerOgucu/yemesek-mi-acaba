#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
. ops/load-env.sh
file=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --env-file) file="$2"; shift 2 ;;
    *) echo "bilinmeyen argüman" >&2; exit 2 ;;
  esac
done
hours=26
if [ -n "$file" ]; then
  load_env_file "$file"
fi
if [ -n "${BACKUP_MAX_AGE_HOURS:-}" ]; then
  hours="$BACKUP_MAX_AGE_HOURS"
fi
alert() {
  if [ -z "${ALERT_WEBHOOK_URL:-}" ]; then
    return 0
  fi
  curl --silent --show-error --max-time 10 -H 'content-type: application/json' \
    --data '{"text":"yemesek backup age exceeded"}' "$ALERT_WEBHOOK_URL" >/dev/null || true
}

if [ ! -f ops/state/last-backup-at ]; then
  echo "backup age: henüz başarılı yedek yok"
  exit 0
fi
if ! docker run --rm -v "$PWD/ops/state/last-backup-at:/stamp:ro" -e HOURS="$hours" --entrypoint node yemesek-ops:local -e '
const fs = require("fs");
const stamp = Date.parse(fs.readFileSync("/stamp", "utf8").trim());
const hours = Number(process.env.HOURS);
if (!Number.isFinite(stamp) || !Number.isFinite(hours)) process.exit(1);
const age = Date.now() - stamp;
if (age > hours * 3600 * 1000) {
  process.stderr.write("backup age exceeded\n");
  process.exit(1);
}
process.stdout.write("backup age ok\n");
'; then
  alert
  exit 1
fi
