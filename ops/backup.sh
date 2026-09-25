#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
. ops/load-env.sh
# shellcheck disable=SC1091
. ops/common.sh

alert() {
  if [ -z "${ALERT_WEBHOOK_URL:-}" ]; then
    return 0
  fi
  curl --silent --show-error --max-time 10 -H 'content-type: application/json' \
    --data '{"text":"yemesek backup failed"}' "$ALERT_WEBHOOK_URL" >/dev/null || true
}

remote() {
  docker run --rm \
    -v "$PWD/ops/state/backups:/backups" \
    -v "$PWD/ops/backup-remote.mjs:/opt/yemesek/ops/backup-remote.mjs:ro" \
    --network yemesek_internal \
    -e NODE_PATH=/opt/yemesek/node_modules \
    --env-file ops/state/env/backup.env \
    --entrypoint node yemesek-ops:local \
    /opt/yemesek/ops/backup-remote.mjs "$@"
}

file=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --env-file)
      file="$2"
      shift 2
      ;;
    *)
      echo "bilinmeyen argüman" >&2
      exit 2
      ;;
  esac
done
if [ -z "$file" ]; then
  echo "--env-file gerekli" >&2
  exit 2
fi
load_env_file "$file"
build_compose_args
docker run --rm -v "$PWD:/work" -w /work --entrypoint node yemesek-ops:local ops/render-env.mjs "$file" ops/state/env
if [ -z "${BACKUP_PASSPHRASE:-}" ] || printf '%s' "$BACKUP_PASSPHRASE" | grep -Eq 'FILL_ME|CHANGE_ME|change-me'; then
  echo "BACKUP_PASSPHRASE yok. Şifresiz yedek başarı sayılmaz." >&2
  exit 1
fi
if [ -z "${BACKUP_S3_BUCKET:-}" ] || printf '%s' "$BACKUP_S3_BUCKET" | grep -Eq 'FILL_ME|CHANGE_ME|change-me'; then
  echo "BACKUP_S3_BUCKET yok. Aynı diskteki tek kopya yedek sayılmaz." >&2
  exit 1
fi
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p ops/state/backups
raw="ops/state/backups/.${stamp}.raw"
dump="ops/state/backups/yemesek-${stamp}.dump.enc"
manifest="ops/state/backups/yemesek-${stamp}.manifest.json"
prefix="${BACKUP_S3_PREFIX:-yemesek}"
trap 'rm -f "$raw"' EXIT
# shellcheck disable=SC2086
docker compose $COMPOSE_FILE_ARGS --env-file "$file" exec -T postgres \
  pg_dump --format=custom --no-owner --username "$POSTGRES_USER" "$POSTGRES_DB" > "$raw"
if [ ! -s "$raw" ]; then
  echo "yedek boş" >&2
  exit 1
fi
chmod 600 "$raw"
docker run --rm -v "$PWD/ops/state/backups:/backups" -e BACKUP_PASSPHRASE --entrypoint openssl yemesek-ops:local \
  enc -aes-256-cbc -pbkdf2 -salt -pass env:BACKUP_PASSPHRASE \
  -in "/backups/.${stamp}.raw" -out "/backups/yemesek-${stamp}.dump.enc"
if [ ! -s "$dump" ]; then
  echo "şifreli yedek boş" >&2
  exit 1
fi
chmod 600 "$dump"
rm -f "$raw"
sum="$(docker run --rm -v "$PWD/ops/state/backups:/backups" --entrypoint sha256sum yemesek-ops:local \
  "/backups/yemesek-${stamp}.dump.enc" | awk '{print $1}')"
bytes="$(wc -c < "$dump" | tr -d ' ')"
printf '{"id":"%s","sha256":"%s","bytes":%s}\n' "$stamp" "$sum" "$bytes" > "$manifest"
chmod 600 "$manifest"
echo "R2 kanıt nesneleri bu dump içinde değildir. Dump yalnız veritabanıdır."
if ! remote put "/backups/yemesek-${stamp}.dump.enc" "${prefix}/${stamp}.dump.enc"; then
  alert
  echo "uzak kopya başarısız. Yerel şifreli yedek duruyor." >&2
  exit 1
fi
if ! remote put "/backups/yemesek-${stamp}.manifest.json" "${prefix}/${stamp}.manifest.json"; then
  alert
  echo "manifest kopyalanamadı. Yerel şifreli yedek duruyor." >&2
  exit 1
fi
date -u +%Y-%m-%dT%H:%M:%SZ > ops/state/last-backup-at
printf '%s\n' "$stamp" > ops/state/last-backup-id
echo "backup: remote copy stored; local encrypted copy kept"
