#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
file=""
to=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --env-file)
      file="$2"
      shift 2
      ;;
    --to)
      to="$2"
      shift 2
      ;;
    *)
      echo "bilinmeyen argüman: $1" >&2
      exit 2
      ;;
  esac
done
if [ -z "$file" ] || [ -z "$to" ]; then
  echo "--env-file ve --to gerekli" >&2
  exit 2
fi
if [ ! -f "ops/state/releases/${to}" ]; then
  echo "onaylı release kaydı yok: $to" >&2
  exit 1
fi
# shellcheck disable=SC1091
. ops/load-env.sh
load_env_file "$file"
export RELEASE_TAG="$to"
export ENV_FILE="$file"
profile="${DEPLOY_PROFILE:-edge}"
files="-f compose.production.yml"
if [ "$profile" = "edge" ]; then
  files="$files -f compose.edge.yml"
fi
echo "rollback: image ${to}. Şema geri alınmaz. Destructive migration varsa disposable restore kullan."
services="worker"
if [ "$profile" = "localhost" ]; then
  services="api-local worker web-local"
else
  services="api worker web"
fi
# shellcheck disable=SC2086
docker compose $files --env-file "$file" --profile "$profile" up -d $services
echo "rollback: containers restarted from ${to}. Veritabanı migrate down çalışmadı."
