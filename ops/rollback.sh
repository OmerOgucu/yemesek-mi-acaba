#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
. ops/load-env.sh
# shellcheck disable=SC1091
. ops/common.sh
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
      echo "bilinmeyen argüman" >&2
      exit 2
      ;;
  esac
done
if [ -z "$file" ] || [ -z "$to" ]; then
  echo "--env-file ve --to gerekli" >&2
  exit 2
fi
if [ ! -f "ops/state/releases/${to}" ]; then
  echo "onaylı release kaydı yok" >&2
  exit 1
fi
load_env_file "$file"
export RELEASE_TAG="$to"
export ENV_FILE="$file"
profile="${DEPLOY_PROFILE:-edge}"
build_compose_args
recorded="$(awk -F= '/^migration=/ {print $2}' "ops/state/releases/${to}")"
if [ -z "$recorded" ]; then
  echo "release kaydında şema yok" >&2
  exit 1
fi
if ! docker image inspect "yemesek-api:${to}" >/dev/null 2>&1 || ! docker image inspect "yemesek-web:${to}" >/dev/null 2>&1; then
  echo "rollback imajı yok" >&2
  exit 1
fi
# shellcheck disable=SC2086
current="$(docker compose $COMPOSE_FILE_ARGS --env-file "$file" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc \
  "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY finished_at DESC LIMIT 1;")"
if [ "$current" != "$recorded" ]; then
  {
    echo "rollback refused"
    echo "schema ahead of approved image"
  } > ops/state/last-failure.txt
  echo "şema uyumsuz. Migration down çalıştırılmadı." >&2
  exit 1
fi
# shellcheck disable=SC2086
if ! docker compose $COMPOSE_FILE_ARGS --env-file "$file" --profile "$profile" up -d --wait --wait-timeout 180; then
  {
    echo "rollback failed"
    # shellcheck disable=SC2086
    docker compose $COMPOSE_FILE_ARGS --env-file "$file" --profile "$profile" ps --format '{{.Service}} {{.Status}}' 2>/dev/null || true
  } > ops/state/last-failure.txt
  exit 1
fi
if ! sh ops/smoke.sh --env-file "$file"; then
  echo "rollback smoke failed" > ops/state/last-failure.txt
  exit 1
fi
echo "rollback: ${to}. Veritabanı migrate down çalışmadı."
