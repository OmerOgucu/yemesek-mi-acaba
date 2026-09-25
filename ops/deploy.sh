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
if ! command -v docker >/dev/null 2>&1; then
  echo "docker yok. Image build ve compose bu makinede çalıştırılamadı." >&2
  exit 1
fi
mkdir -p ops/state
lock="ops/state/deploy.lock"
exec 9>"$lock"
if ! flock -n 9; then
  echo "başka bir deploy sürüyor" >&2
  exit 1
fi
# shellcheck disable=SC1091
. ops/load-env.sh
load_env_file "$file"
export ENV_FILE="$file"
sh ops/preflight.sh --env-file "$file"
profile="${DEPLOY_PROFILE:-edge}"
case "$profile" in
  edge|localhost) ;;
  *)
    echo "DEPLOY_PROFILE edge veya localhost olmalı" >&2
    exit 1
    ;;
esac
tag="$(git rev-parse --short HEAD 2>/dev/null || echo nogit)"
export RELEASE_TAG="$tag"
files="-f compose.production.yml"
if [ "$profile" = "edge" ]; then
  if [ -z "${EDGE_NETWORK:-}" ] || [ -z "${API_HOST:-}" ] || [ -z "${WEB_HOST:-}" ]; then
    echo "edge profili EDGE_NETWORK, API_HOST ve WEB_HOST ister. 80/443 burada açılmaz." >&2
    exit 1
  fi
  files="$files -f compose.edge.yml"
fi
api_image="yemesek-api:${tag}"
web_image="yemesek-web:${tag}"
docker build -f Dockerfile.api -t "$api_image" .
docker build -f Dockerfile.web --build-arg "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:?}" -t "$web_image" .
docker tag "$api_image" yemesek-api:local
docker tag "$web_image" yemesek-web:local
# shellcheck disable=SC2086
docker compose $files --env-file "$file" --profile "$profile" up -d postgres
# shellcheck disable=SC2086
docker compose $files --env-file "$file" --profile ops run --rm migrate
# shellcheck disable=SC2086
docker compose $files --env-file "$file" --profile ops run --rm bootstrap
# shellcheck disable=SC2086
docker compose $files --env-file "$file" --profile "$profile" up -d
digest="$(docker image inspect --format '{{.Id}}' "$api_image")"
mkdir -p ops/state/releases
printf '%s %s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$tag" "$digest" >> ops/state/releases.log
printf '%s\n' "$tag" > "ops/state/releases/${tag}"
echo "deploy: $tag"
