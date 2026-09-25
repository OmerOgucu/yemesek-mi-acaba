#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
. ops/load-env.sh
# shellcheck disable=SC1091
. ops/common.sh

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

mkdir -p ops/state
lock="ops/state/deploy.lock"
exec 9>"$lock"
if ! flock -n 9; then
  echo "başka bir deploy sürüyor" >&2
  exit 1
fi
load_env_file "$file"
export ENV_FILE="$file"
profile="${DEPLOY_PROFILE:-edge}"
case "$profile" in
  edge|localhost) ;;
  *)
    echo "DEPLOY_PROFILE edge veya localhost olmalı" >&2
    exit 1
    ;;
esac
if [ "$profile" = "edge" ]; then
  if [ -z "${EDGE_NETWORK:-}" ] || [ -z "${API_HOST:-}" ] || [ -z "${WEB_HOST:-}" ]; then
    echo "edge profili EDGE_NETWORK, API_HOST ve WEB_HOST ister. 80/443 burada açılmaz." >&2
    exit 1
  fi
fi

write_failure() {
  {
    echo "deploy failed"
    # shellcheck disable=SC2086
    docker compose $COMPOSE_FILE_ARGS --env-file "$file" $profile_flags ps --format '{{.Service}} {{.Status}}' 2>/dev/null || true
  } > ops/state/last-failure.txt
}

sh ops/preflight.sh --env-file "$file"
build_compose_args
tag="$(git rev-parse --short HEAD 2>/dev/null || echo nogit)"
export RELEASE_TAG="$tag"
profile_flags="--profile ${profile}"
if [ -n "${COMPOSE_EXTRA:-}" ]; then
  profile_flags="${profile_flags} --profile ci"
fi
api_image="yemesek-api:${tag}"
web_image="yemesek-web:${tag}"
if ! docker build -f Dockerfile.api -t "$api_image" .; then
  write_failure
  exit 1
fi
if ! docker build -f Dockerfile.web --build-arg "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:?}" -t "$web_image" .; then
  write_failure
  exit 1
fi
docker tag "$api_image" yemesek-api:local
docker tag "$web_image" yemesek-web:local

# shellcheck disable=SC2086
if ! docker compose $COMPOSE_FILE_ARGS --env-file "$file" up -d postgres; then
  write_failure
  exit 1
fi
# shellcheck disable=SC2086
if ! docker compose $COMPOSE_FILE_ARGS --env-file "$file" --profile ops run --rm migrate; then
  write_failure
  exit 1
fi
# shellcheck disable=SC2086
if ! docker compose $COMPOSE_FILE_ARGS --env-file "$file" --profile ops run --rm bootstrap; then
  write_failure
  exit 1
fi
# shellcheck disable=SC2086
if ! docker compose $COMPOSE_FILE_ARGS --env-file "$file" $profile_flags up -d --wait --wait-timeout 180; then
  write_failure
  exit 1
fi
if ! sh ops/smoke.sh --env-file "$file"; then
  write_failure
  exit 1
fi

migration="$(
  # shellcheck disable=SC2086
  docker compose $COMPOSE_FILE_ARGS --env-file "$file" exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc \
    "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY finished_at DESC LIMIT 1;"
)"
api_id="$(docker image inspect --format '{{.Id}}' "$api_image")"
web_id="$(docker image inspect --format '{{.Id}}' "$web_image")"
if [ -z "$migration" ]; then
  write_failure
  exit 1
fi
mkdir -p ops/state/releases
umask 077
cat > "ops/state/releases/${tag}" <<EOF
tag=${tag}
api=${api_id}
web=${web_id}
migration=${migration}
EOF
printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$tag" >> ops/state/releases.log
echo "deploy: ${tag}"
