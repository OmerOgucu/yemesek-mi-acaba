#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
. ops/load-env.sh
# shellcheck disable=SC1091
. ops/common.sh

file=""
backup_id=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --env-file)
      file="$2"
      shift 2
      ;;
    --backup-id)
      backup_id="$2"
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
if [ -n "${BACKUP_ID:-}" ] && [ -z "$backup_id" ]; then
  backup_id="$BACKUP_ID"
fi
docker_as_invoker --rm -v "$PWD:/work" -w /work --entrypoint node yemesek-ops:local ops/render-env.mjs "$file" ops/state/env
docker run --rm -v "$PWD:/work" -w /work --env-file "$file" --entrypoint node yemesek-ops:local ops/restore-check.mjs

if [ -n "$backup_id" ]; then
  case "$backup_id" in
    *[!A-Za-z0-9_-]*)
      echo "backup kimliği geçersiz" >&2
      exit 1
      ;;
  esac
fi
mkdir -p ops/state/restore
src="${BACKUP_FILE:-}"
prefix="${BACKUP_S3_PREFIX:-yemesek}"
fetch_remote() {
  docker_as_invoker --rm \
    -v "$PWD/ops/state/restore:/backups" \
    -v "$PWD/ops/backup-remote.mjs:/opt/yemesek/ops/backup-remote.mjs:ro" \
    --network yemesek_internal \
    -e NODE_PATH=/opt/yemesek/node_modules \
    --env-file ops/state/env/backup.env \
    --entrypoint node yemesek-ops:local \
    /opt/yemesek/ops/backup-remote.mjs "$@"
}
if [ -n "$backup_id" ]; then
  src="ops/state/restore/${backup_id}.dump.enc"
  manifest="ops/state/restore/${backup_id}.manifest.json"
  fetch_remote get "/backups/${backup_id}.manifest.json" "${prefix}/${backup_id}.manifest.json"
  fetch_remote get "/backups/${backup_id}.dump.enc" "${prefix}/${backup_id}.dump.enc"
  expect="$(docker run --rm -v "$PWD/ops/state/restore:/backups" --entrypoint node yemesek-ops:local \
    -e "const b=JSON.parse(require('fs').readFileSync('/backups/${backup_id}.manifest.json','utf8')); if(!/^[a-f0-9]{64}$/.test(b.sha256)) process.exit(1); process.stdout.write(b.sha256)")"
  got="$(docker run --rm -v "$PWD/ops/state/restore:/backups" --entrypoint sha256sum yemesek-ops:local "/backups/${backup_id}.dump.enc" | awk '{print $1}')"
  if [ "$expect" != "$got" ]; then
    echo "bütünlük uyuşmuyor" >&2
    exit 1
  fi
fi
if [ -z "$src" ] || [ ! -f "$src" ]; then
  echo "BACKUP_FILE veya --backup-id gerekli" >&2
  exit 1
fi
plain="ops/state/restore/plain.dump"
rm -f "$plain"
trap 'rm -f "$plain"' EXIT
if ! docker_as_invoker --rm -v "$PWD:/work" -w /work -e BACKUP_PASSPHRASE --entrypoint openssl yemesek-ops:local \
  enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_PASSPHRASE -in "$src" -out "$plain"; then
  echo "şifre çözülemedi" >&2
  exit 1
fi
if [ ! -s "$plain" ]; then
  echo "çözülen yedek boş" >&2
  exit 1
fi
chmod 600 "$plain"
set +e
docker run --rm --network yemesek_internal \
  -v "$PWD/ops/state/restore/plain.dump:/dump:ro" \
  -v "$PWD/ops/restore-exec.sh:/restore-exec.sh:ro" \
  -e RESTORE_DATABASE_URL \
  --entrypoint sh yemesek-ops:local /restore-exec.sh restore
restore_code=$?
set -e
found="$(docker run --rm --network yemesek_internal \
  -v "$PWD/ops/restore-exec.sh:/restore-exec.sh:ro" \
  -e RESTORE_DATABASE_URL \
  --entrypoint sh yemesek-ops:local /restore-exec.sh smoke)"
if [ "$found" != "User" ]; then
  echo "restore sonrası şema yok (${restore_code}) bulunan=${found}" >&2
  exit 1
fi
echo "restore-test: disposable database restored. R2 nesneleri bu işlemle geri gelmez."
