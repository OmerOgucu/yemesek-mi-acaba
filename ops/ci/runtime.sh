#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
# shellcheck disable=SC1091
. ops/load-env.sh

export COMPOSE_EXTRA="-f compose.ci.yml"
export SMOKE_INSECURE=1
export ENV_FILE=ops/ci/stack.env
load_env_file "$ENV_FILE"

# GitHub-hosted runners ship a PostgreSQL client. Remove it so this job matches a VPS
# that only has Docker, Compose, sh, and git. The scripts must not call host psql or aws.
hide_host_tool() {
  tool="$1"
  hash -r 2>/dev/null || true
  bin=$(command -v "$tool" 2>/dev/null || true)
  if [ -z "$bin" ]; then
    return 0
  fi
  pkg=$(dpkg -S "$bin" 2>/dev/null | head -n 1 | cut -d: -f1 || true)
  if [ -n "$pkg" ]; then
    sudo apt-get remove -y "$pkg" || true
  fi
  hash -r 2>/dev/null || true
  if [ -e "$bin" ]; then
    sudo mv "$bin" "/tmp/yemesek-disabled-${tool}"
  fi
}
if [ -n "${GITHUB_ACTIONS:-}" ]; then
  export DEBIAN_FRONTEND=noninteractive
  if command -v psql >/dev/null 2>&1 || command -v aws >/dev/null 2>&1; then
    sudo apt-get update -y
  fi
  hide_host_tool psql
  hide_host_tool aws
  hash -r 2>/dev/null || true
fi
if command -v psql >/dev/null 2>&1; then
  echo "host psql present; clean-host proof expects it absent" >&2
  exit 1
fi
if command -v aws >/dev/null 2>&1; then
  echo "host aws present; clean-host proof expects it absent" >&2
  exit 1
fi
echo "host pnpm: $(command -v pnpm || echo absent)"
echo "host node_modules app: $([ -d node_modules ] && echo present || echo absent)"

grep -q 'yemesek.test' /etc/hosts || echo '127.0.0.1 api.yemesek.test web.yemesek.test' | sudo tee -a /etc/hosts >/dev/null
mkdir -p ops/state/ci-certs
docker build -f Dockerfile.ops -t yemesek-ops:local .
docker run --rm -v "$PWD/ops/state/ci-certs:/certs" --entrypoint openssl yemesek-ops:local \
  req -x509 -nodes -newkey rsa:2048 -keyout /certs/tls.key -out /certs/tls.crt -days 2 \
  -subj "/CN=yemesek.test" -addext "subjectAltName=DNS:web.yemesek.test,DNS:api.yemesek.test"
sh ops/render-nginx.sh --env-file "$ENV_FILE"

sh ops/deploy.sh --env-file "$ENV_FILE"

docker run --rm --network yemesek_internal \
  -e NODE_PATH=/opt/yemesek/node_modules \
  --env-file ops/state/env/api.env \
  -v "$PWD/ops/ci/prepare-minio.mjs:/prepare.mjs:ro" \
  --entrypoint node yemesek-ops:local /prepare.mjs

# shellcheck disable=SC1091
. ops/common.sh
build_compose_args
# shellcheck disable=SC2086
docker compose $COMPOSE_FILE_ARGS --env-file "$ENV_FILE" exec -T postgres psql -U "$POSTGRES_USER" -d postgres <<'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'restore_only') THEN
    CREATE ROLE restore_only LOGIN PASSWORD 'ci-restore-password' NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END $$;
SQL
# shellcheck disable=SC2086
if ! docker compose $COMPOSE_FILE_ARGS --env-file "$ENV_FILE" exec -T postgres \
  psql -U "$POSTGRES_USER" -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname = 'yemesek_disposable'" | grep -q 1; then
  # shellcheck disable=SC2086
  docker compose $COMPOSE_FILE_ARGS --env-file "$ENV_FILE" exec -T postgres \
    psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE yemesek_disposable OWNER restore_only;"
fi
# shellcheck disable=SC2086
docker compose $COMPOSE_FILE_ARGS --env-file "$ENV_FILE" exec -T postgres psql -U "$POSTGRES_USER" -d postgres <<'SQL'
REVOKE CONNECT ON DATABASE yemesek FROM PUBLIC;
GRANT CONNECT ON DATABASE yemesek TO yemesek;
GRANT CONNECT, TEMP ON DATABASE yemesek_disposable TO restore_only;
SQL

playwright() {
  docker run --rm --network host \
    -v "$PWD:/work" -w /work \
    -e PLAYWRIGHT_BASE_URL=https://web.yemesek.test:8443 \
    -e ADMIN_EMAIL \
    -e ADMIN_SETUP_SECRET \
    mcr.microsoft.com/playwright:v1.55.1-noble \
    bash -lc "cd /work/ops/e2e && npm ci && cd /work && /work/ops/e2e/node_modules/.bin/playwright test --config /work/ops/e2e/playwright.config.ts $1"
}

export ADMIN_EMAIL="$INITIAL_ADMIN_EMAIL"
export ADMIN_SETUP_SECRET
playwright user.spec.ts
# shellcheck disable=SC2086
docker compose $COMPOSE_FILE_ARGS --env-file "$ENV_FILE" --profile localhost restart api-local
# shellcheck disable=SC2086
docker compose $COMPOSE_FILE_ARGS --env-file "$ENV_FILE" --profile localhost --profile ci up -d --wait --wait-timeout 180
playwright admin.spec.ts

sh ops/ci/queue-crash.sh

sh ops/backup.sh --env-file "$ENV_FILE"
id="$(cat ops/state/last-backup-id)"
sh ops/restore-test.sh --env-file "$ENV_FILE" --backup-id "$id"

bad="ops/state/restore/corrupt.dump.enc"
mkdir -p ops/state/restore
printf 'not-a-backup' > "$bad"
if BACKUP_FILE="$bad" sh ops/restore-test.sh --env-file "$ENV_FILE"; then
  echo "corrupt backup was accepted" >&2
  exit 1
fi
sed 's/^BACKUP_PASSPHRASE=.*/BACKUP_PASSPHRASE=wrong-passphrase-value/' "$ENV_FILE" > ops/state/wrong-pass.env
chmod 600 ops/state/wrong-pass.env
src="$(ls -1 ops/state/backups/*.dump.enc | head -n 1)"
if BACKUP_FILE="$src" sh ops/restore-test.sh --env-file ops/state/wrong-pass.env; then
  echo "wrong passphrase was accepted" >&2
  exit 1
fi
rm -f ops/state/wrong-pass.env

tag="$(git rev-parse --short HEAD)"
sh ops/rollback.sh --env-file "$ENV_FILE" --to "$tag"
# shellcheck disable=SC2086
docker compose $COMPOSE_FILE_ARGS --env-file "$ENV_FILE" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, started_at, applied_steps_count) VALUES ('futurefuturefuturefuturefuturefut', 'deadbeef', NOW() + interval '1 day', '20990101000000_future', NOW(), 1);"
if sh ops/rollback.sh --env-file "$ENV_FILE" --to "$tag"; then
  echo "incompatible rollback was accepted" >&2
  exit 1
fi
# shellcheck disable=SC2086
docker compose $COMPOSE_FILE_ARGS --env-file "$ENV_FILE" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DELETE FROM _prisma_migrations WHERE migration_name = '20990101000000_future';"

# shellcheck disable=SC2086
docker compose $COMPOSE_FILE_ARGS --env-file "$ENV_FILE" --profile localhost stop api-local
if sh ops/smoke.sh --env-file "$ENV_FILE"; then
  echo "smoke passed while api was stopped" >&2
  exit 1
fi
# shellcheck disable=SC2086
docker compose $COMPOSE_FILE_ARGS --env-file "$ENV_FILE" --profile localhost --profile ci up -d --wait --wait-timeout 180
echo "ci runtime ok"
