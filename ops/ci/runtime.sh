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
# that has Docker, Compose, sh, git, flock, and curl. The scripts must not call host psql or aws.
record_step() {
  mkdir -p ops/state
  printf '%s\n' "$1" >> ops/state/runtime-steps.txt
}
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
record_step "host psql present"
record_step "host aws present"
echo "host pnpm: $(command -v pnpm || echo absent)"
echo "host node_modules app: $([ -d node_modules ] && echo present || echo absent)"

grep -q 'yemesek.test' /etc/hosts || echo '127.0.0.1 api.yemesek.test web.yemesek.test' | sudo tee -a /etc/hosts >/dev/null
mkdir -p ops/state/ci-certs
docker build -f Dockerfile.ops -t yemesek-ops:local .
docker run --rm -v "$PWD/ops/state/ci-certs:/certs" --entrypoint openssl yemesek-ops:local \
  req -x509 -nodes -newkey rsa:2048 -keyout /certs/tls.key -out /certs/tls.crt -days 2 \
  -subj "/CN=yemesek.test" -addext "subjectAltName=DNS:web.yemesek.test,DNS:api.yemesek.test"
sh ops/render-nginx.sh --env-file "$ENV_FILE"

# Later compose commands must keep this tag. An empty RELEASE_TAG switches the
# image and label to "local", recreates web, and the already-running proxy 502s.
export RELEASE_TAG="$(git rev-parse --short HEAD 2>/dev/null || echo local)"
sh ops/deploy.sh --env-file "$ENV_FILE"
record_step "ops/smoke.sh::web kabında yasak anahtar"

# ESM does not use NODE_PATH. The script must sit under /opt/yemesek so Node finds the image's node_modules.
docker run --rm --network yemesek_internal \
  --env-file ops/state/env/api.env \
  --entrypoint node yemesek-ops:local /opt/yemesek/ops/ci/prepare-minio.mjs

# shellcheck disable=SC1091
. ops/common.sh
build_compose_args
sh ops/prepare-disposable-db.sh --env-file "$ENV_FILE"
record_step "restore user reached production"

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
export ADMIN_SETUP_SECRET="${INITIAL_ADMIN_SETUP_SECRET}"
playwright user.spec.ts
record_step "ops/e2e/user.spec.ts::register, verify, reset, and file a report"
# shellcheck disable=SC2086
docker compose $COMPOSE_FILE_ARGS --env-file "$ENV_FILE" --profile localhost restart api-local
# shellcheck disable=SC2086
docker compose $COMPOSE_FILE_ARGS --env-file "$ENV_FILE" --profile localhost --profile ci up -d --wait --wait-timeout 180
playwright admin.spec.ts
record_step "ops/e2e/admin.spec.ts::admin invite, totp, moderation, closed city, and account delete"

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
record_step "wrong passphrase was accepted"

umask 077
full="ops/state/restore/full-for-truncate.dump"
trunc="ops/state/restore/truncated-plain.dump"
enc="ops/state/restore/truncated.dump.enc"
docker_as_invoker --rm -v "$PWD:/work" -w /work -e BACKUP_PASSPHRASE --entrypoint openssl yemesek-ops:local \
  enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_PASSPHRASE -in "$src" -out "$full"
dd if="$full" of="$trunc" bs=1024 count=1 status=none
docker_as_invoker --rm -v "$PWD:/work" -w /work -e BACKUP_PASSPHRASE --entrypoint openssl yemesek-ops:local \
  enc -e -aes-256-cbc -pbkdf2 -pass env:BACKUP_PASSPHRASE -in "$trunc" -out "$enc"
rm -f "$full" "$trunc"
if BACKUP_FILE="$enc" sh ops/restore-test.sh --env-file "$ENV_FILE"; then
  echo "restore failed while User already existed" >&2
  exit 1
fi
rm -f "$enc"
record_step "restore failed while User already existed"

# shellcheck disable=SC2086
docker compose $COMPOSE_FILE_ARGS --env-file "$ENV_FILE" exec -T postgres \
  psql -U "$POSTGRES_USER" -d yemesek_disposable -v ON_ERROR_STOP=1 -c 'TRUNCATE "User" CASCADE;'
restore_url="$(tr -d '\r\n' < ops/state/restore/target.url)"
partial="$(docker run --rm --network yemesek_internal \
  -v "$PWD/ops/restore-exec.sh:/restore-exec.sh:ro" \
  -e RESTORE_DATABASE_URL="$restore_url" \
  --entrypoint sh yemesek-ops:local /restore-exec.sh smoke)"
unset restore_url
case "$partial" in
  missing-user|missing-session|missing-report|missing-constraint|missing-row) ;;
  *)
    echo "partial restore was accepted" >&2
    exit 1
    ;;
esac
record_step "partial restore was accepted"

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
record_step "incompatible rollback was accepted"

api_a="$(docker image inspect --format '{{.Id}}' "yemesek-api:${tag}")"
web_a="$(docker image inspect --format '{{.Id}}' "yemesek-web:${tag}")"
migration="$(awk -F= '/^migration=/ {print $2}' "ops/state/releases/${tag}")"
docker tag "yemesek-api:${tag}" yemesek-api:ci-a
docker tag "yemesek-web:${tag}" yemesek-web:ci-a
umask 077
cat > ops/state/releases/ci-a <<EOF
tag=ci-a
api=${api_a}
web=${web_a}
migration=${migration}
EOF
docker build --label com.yemesek.ci-variant=b -f Dockerfile.api -t yemesek-api:ci-b .
docker build --label com.yemesek.ci-variant=b -f Dockerfile.web --build-arg "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:?}" -t yemesek-web:ci-b .
api_b="$(docker image inspect --format '{{.Id}}' yemesek-api:ci-b)"
web_b="$(docker image inspect --format '{{.Id}}' yemesek-web:ci-b)"
if [ "$api_a" = "$api_b" ] || [ "$web_a" = "$web_b" ]; then
  echo "ci-b did not produce a distinct image" >&2
  exit 1
fi
cat > ops/state/releases/ci-b <<EOF
tag=ci-b
api=${api_b}
web=${web_b}
migration=${migration}
EOF
sh ops/rollback.sh --env-file "$ENV_FILE" --to ci-b
if EXPECT_RELEASE=ci-a sh ops/smoke.sh --env-file "$ENV_FILE"; then
  echo "wrong release was accepted" >&2
  exit 1
fi
record_step "wrong release was accepted"
docker tag yemesek-api:ci-b yemesek-api:ci-a
docker tag yemesek-web:ci-b yemesek-web:ci-a
if sh ops/rollback.sh --env-file "$ENV_FILE" --to ci-a; then
  echo "moved tag was accepted as the approved image" >&2
  exit 1
fi
record_step "moved tag was accepted as the approved image"
docker tag "$api_a" yemesek-api:ci-a
docker tag "$web_a" yemesek-web:ci-a
sh ops/rollback.sh --env-file "$ENV_FILE" --to ci-a
# shellcheck disable=SC2086
running="$(docker inspect -f '{{.Image}}' "$(docker compose $COMPOSE_FILE_ARGS --env-file "$ENV_FILE" --profile localhost ps -q api-local)")"
if [ "$running" != "$api_a" ]; then
  echo "rollback did not return the previous image" >&2
  exit 1
fi
EXPECT_RELEASE=ci-a sh ops/smoke.sh --env-file "$ENV_FILE"
record_step "rollback returned the previous image"
sed 's#^API_URL=.*#API_URL=https://web.yemesek.test:8443#' "$ENV_FILE" > ops/state/wrong-proxy.env
chmod 600 ops/state/wrong-proxy.env
if sh ops/smoke.sh --env-file ops/state/wrong-proxy.env; then
  echo "web health was accepted as the api" >&2
  exit 1
fi
rm -f ops/state/wrong-proxy.env
record_step "web health was accepted as the api"

# shellcheck disable=SC2086
docker compose $COMPOSE_FILE_ARGS --env-file "$ENV_FILE" --profile localhost stop api-local
if sh ops/smoke.sh --env-file "$ENV_FILE"; then
  echo "smoke passed while api was stopped" >&2
  exit 1
fi
record_step "smoke passed while api was stopped"
if sh ops/approve-release.sh --env-file "$ENV_FILE" --tag unhealthy-ci; then
  echo "unhealthy deploy wrote an approved release" >&2
  exit 1
fi
if [ -f ops/state/releases/unhealthy-ci ]; then
  echo "unhealthy deploy wrote an approved release" >&2
  exit 1
fi
record_step "unhealthy deploy wrote an approved release"
# shellcheck disable=SC2086
docker compose $COMPOSE_FILE_ARGS --env-file "$ENV_FILE" --profile localhost --profile ci up -d --wait --wait-timeout 180
docker_as_invoker --rm -v "$PWD:/work" -w /work \
  -e GITHUB_SHA -e GITHUB_RUN_ID -e GITHUB_RUN_ATTEMPT \
  --entrypoint node yemesek-ops:local ops/verify/write-runtime-evidence.mjs
echo "ci runtime ok"
