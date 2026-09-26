#!/bin/sh
# Callers already stand at the repo root. Do not cd from $0: a sourced file keeps the parent script name.
set -eu
# shellcheck disable=SC1091
. ops/load-env.sh

build_compose_args() {
  COMPOSE_FILE_ARGS="-f compose.production.yml"
  if [ "${DEPLOY_PROFILE:-edge}" = "edge" ]; then
    COMPOSE_FILE_ARGS="$COMPOSE_FILE_ARGS -f compose.edge.yml"
  fi
  if [ -n "${COMPOSE_EXTRA:-}" ]; then
    COMPOSE_FILE_ARGS="$COMPOSE_FILE_ARGS ${COMPOSE_EXTRA}"
  fi
}

api_service() {
  if [ "${DEPLOY_PROFILE:-edge}" = "localhost" ]; then
    printf '%s' api-local
  else
    printf '%s' api
  fi
}

web_service() {
  if [ "${DEPLOY_PROFILE:-edge}" = "localhost" ]; then
    printf '%s' web-local
  else
    printf '%s' web
  fi
}

run_ops_node() {
  if [ -f /opt/yemesek/.ops-image ]; then
    node "$@"
    return
  fi
  docker run --rm -v "$PWD:/work" -w /work --entrypoint node yemesek-ops:local "$@"
}

# Mode 600 files must stay readable by the operator and by Compose.
# A root container owns them, and the runner then gets "permission denied".
docker_as_invoker() {
  docker run --user "$(id -u):$(id -g)" "$@"
}

redact_stream() {
  sed -E \
    -e 's#(postgres(ql)?://)[^@[:space:]]+@#\1redacted@#g' \
    -e 's#(SECRET|PASSWORD|TOKEN|PASSPHRASE|API_KEY)[=:][^[:space:]]+#\1=redacted#gI'
}

# Failed deploy output is status plus redacted logs. Values are not kept in the state file.
print_service_diagnostics() {
  echo "diagnostics: container status and redacted logs" >&2
  # shellcheck disable=SC2086
  docker compose $COMPOSE_FILE_ARGS --env-file "$file" ps --format '{{.Service}} {{.Status}}' >&2 || true
  # shellcheck disable=SC2086
  ids="$(docker compose $COMPOSE_FILE_ARGS --env-file "$file" ps -aq 2>/dev/null || true)"
  for id in $ids; do
    docker inspect -f '{{.Name}} status={{.State.Status}} exit={{.State.ExitCode}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$id" >&2 || true
    docker logs --tail 40 "$id" 2>&1 | redact_stream >&2 || true
  done
}
