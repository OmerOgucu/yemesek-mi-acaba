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
if [ -z "$file" ] || [ ! -f "$file" ]; then
  echo "Önce örneği kopyala: cp .env.production.example .env.production" >&2
  exit 1
fi
node ops/init-env.mjs "$file"
chmod 600 "$file"
echo "init-env: dosya 0600. Değerler ekrana yazılmadı."
