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
