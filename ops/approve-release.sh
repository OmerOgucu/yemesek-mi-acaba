#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
. ops/load-env.sh
# shellcheck disable=SC1091
. ops/common.sh

file=""
tag=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --env-file)
      file="$2"
      shift 2
      ;;
    --tag)
      tag="$2"
      shift 2
      ;;
    *)
      echo "bilinmeyen argüman" >&2
      exit 2
      ;;
  esac
done
if [ -z "$file" ] || [ -z "$tag" ]; then
  echo "--env-file ve --tag gerekli" >&2
  exit 2
fi
case "$tag" in
  *[!A-Za-z0-9._-]*|'') echo "release etiketi geçersiz" >&2; exit 2 ;;
esac
load_env_file "$file"
export ENV_FILE="$file"
export RELEASE_TAG="$tag"
if ! sh ops/smoke.sh --env-file "$file"; then
  echo "approve-release: smoke failed" >&2
  exit 1
fi
build_compose_args
migration="$(
  # shellcheck disable=SC2086
  docker compose $COMPOSE_FILE_ARGS --env-file "$file" exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc \
    "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY finished_at DESC LIMIT 1;"
)"
api_id="$(docker image inspect --format '{{.Id}}' "yemesek-api:${tag}")"
web_id="$(docker image inspect --format '{{.Id}}' "yemesek-web:${tag}")"
if [ -z "$migration" ] || [ -z "$api_id" ] || [ -z "$web_id" ]; then
  echo "approve-release: kayıt eksik" >&2
  exit 1
fi
mkdir -p ops/state/releases
umask 077
tmp="ops/state/releases/.${tag}.tmp"
cat > "$tmp" <<EOF
tag=${tag}
api=${api_id}
web=${web_id}
migration=${migration}
EOF
mv "$tmp" "ops/state/releases/${tag}"
printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$tag" >> ops/state/releases.log
echo "approve-release: ${tag}"
