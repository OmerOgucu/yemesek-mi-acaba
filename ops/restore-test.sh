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
target="${RESTORE_DATABASE_URL:-}"
if [ -z "$target" ]; then
  echo "RESTORE_DATABASE_URL yok. Production veritabanına geri yükleme yok." >&2
  exit 1
fi
case "$target" in
  *restore*|*disposable*) ;;
  *)
    echo "RESTORE_DATABASE_URL adı restore veya disposable içermeli." >&2
    exit 1
    ;;
esac
if [ "$target" = "${DATABASE_URL:-}" ]; then
  echo "hedef production bağlantısıyla aynı" >&2
  exit 1
fi
src="${BACKUP_FILE:-}"
if [ -z "$src" ] || [ ! -f "$src" ]; then
  echo "BACKUP_FILE şifreli dump yolu gerekli" >&2
  exit 1
fi
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_PASSPHRASE -in "$src" -out "$tmp"
pg_restore --clean --if-exists --no-owner --dbname "$target" "$tmp"
echo "restore-test: disposable database restored. Bu R2 nesnelerini geri getirmez."
