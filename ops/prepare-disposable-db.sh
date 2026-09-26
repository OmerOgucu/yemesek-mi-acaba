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
load_env_file "$file"
mkdir -p ops/state/restore
cleanup() {
  rm -f ops/state/restore/role.sql ops/state/restore/probe.env ops/state/restore/probe.out ops/state/restore/names.env
}
trap cleanup EXIT
docker_as_invoker --rm -v "$PWD:/work" -w /work --env-file "$file" --entrypoint node yemesek-ops:local ops/prepare-disposable-files.mjs
restore_user="$(awk -F= '/^RESTORE_USER=/ {print $2}' ops/state/restore/names.env)"
restore_db="$(awk -F= '/^RESTORE_DB=/ {print $2}' ops/state/restore/names.env)"
case "$restore_user" in
  *[!A-Za-z0-9_]*) echo "kimlik geçersiz" >&2; exit 1 ;;
esac
case "$restore_db" in
  *[!A-Za-z0-9_]*) echo "kimlik geçersiz" >&2; exit 1 ;;
esac
build_compose_args
# shellcheck disable=SC2086
docker compose $COMPOSE_FILE_ARGS --env-file "$file" exec -T postgres \
  psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -f - < ops/state/restore/role.sql
# shellcheck disable=SC2086
exists="$(docker compose $COMPOSE_FILE_ARGS --env-file "$file" exec -T postgres \
  psql -U "$POSTGRES_USER" -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname = '${restore_db}'")"
if [ "$exists" != "1" ]; then
  # shellcheck disable=SC2086
  docker compose $COMPOSE_FILE_ARGS --env-file "$file" exec -T postgres \
    psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${restore_db} OWNER ${restore_user};"
fi
# shellcheck disable=SC2086
docker compose $COMPOSE_FILE_ARGS --env-file "$file" exec -T postgres \
  psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -f - < ops/state/restore/grants.sql
set +e
docker run --rm --network yemesek_internal --env-file ops/state/restore/probe.env \
  --entrypoint psql yemesek-ops:local -v ON_ERROR_STOP=1 -c 'SELECT 1' > ops/state/restore/probe.out 2>&1
probe_code=$?
set -e
if [ "$probe_code" -eq 0 ]; then
  echo "restore user reached production" >&2
  exit 1
fi
if ! grep -q 'permission denied for database' ops/state/restore/probe.out; then
  echo "restore probe did not prove a permission denial" >&2
  exit 1
fi
echo "disposable database ready"
