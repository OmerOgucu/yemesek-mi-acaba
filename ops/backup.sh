#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
file=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --env-file)
      file="$2"
      shift 2
      ;;
    *)
      echo "bilinmeyen argüman: $1" >&2
      exit 2
      ;;
  esac
done
if [ -z "$file" ]; then
  echo "--env-file gerekli" >&2
  exit 2
fi
# shellcheck disable=SC1091
. ops/load-env.sh
load_env_file "$file"
if [ -z "${BACKUP_PASSPHRASE:-}" ] || printf '%s' "$BACKUP_PASSPHRASE" | grep -Eq 'FILL_ME|CHANGE_ME|change-me'; then
  echo "BACKUP_PASSPHRASE yok. Şifresiz yedek başarı sayılmaz. Anahtar yedeğin içine yazılmaz; kaybolursa geri açılmaz." >&2
  exit 1
fi
if [ -z "${BACKUP_S3_BUCKET:-}" ] || printf '%s' "$BACKUP_S3_BUCKET" | grep -Eq 'FILL_ME|CHANGE_ME|change-me'; then
  echo "BACKUP_S3_BUCKET yok. Aynı diskteki tek kopya yedek sayılmaz." >&2
  exit 1
fi
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p ops/state/backups
dump="ops/state/backups/yemesek-${stamp}.dump.enc"
raw="$(mktemp)"
trap 'rm -f "$raw"' EXIT
if command -v docker >/dev/null 2>&1 && docker compose -f compose.production.yml --env-file "$file" ps --status running postgres >/dev/null 2>&1; then
  docker compose -f compose.production.yml --env-file "$file" exec -T postgres \
    pg_dump --format=custom --no-owner --username "$POSTGRES_USER" "$POSTGRES_DB" > "$raw"
else
  pg_dump --format=custom --no-owner --dbname "$DATABASE_URL" --file "$raw"
fi
openssl enc -aes-256-cbc -pbkdf2 -salt -pass env:BACKUP_PASSPHRASE -in "$raw" -out "$dump"
if [ ! -s "$dump" ]; then
  echo "yedek boş" >&2
  exit 1
fi
if ! command -v aws >/dev/null 2>&1; then
  rm -f "$dump"
  echo "aws cli yok. Uzak kopya atılamadı; yerel şifreli dosya silindi." >&2
  exit 1
fi
AWS_ACCESS_KEY_ID="${BACKUP_S3_ACCESS_KEY_ID:?}" \
AWS_SECRET_ACCESS_KEY="${BACKUP_S3_SECRET_ACCESS_KEY:?}" \
  aws s3 cp "$dump" "s3://${BACKUP_S3_BUCKET}/yemesek/${stamp}.dump.enc" \
  --endpoint-url "${BACKUP_S3_ENDPOINT:?}"
rm -f "$dump"
date -u +%Y-%m-%dT%H:%M:%SZ > ops/state/last-backup-at
echo "backup: remote copy stored"
