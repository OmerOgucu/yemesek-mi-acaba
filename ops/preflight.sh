#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
. ops/common.sh
file=""
live=0
mail_to=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --env-file)
      file="$2"
      shift 2
      ;;
    --live)
      live=1
      shift
      ;;
    --mail-to)
      mail_to="$2"
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

missing=0
if ! command -v docker >/dev/null 2>&1; then
  echo "eksik: docker" >&2
  missing=1
else
  docker version --format 'docker {{.Client.Version}}'
  if ! docker compose version >/dev/null 2>&1; then
    echo "eksik: docker compose" >&2
    missing=1
  else
    docker compose version
  fi
fi
if ! command -v git >/dev/null 2>&1; then
  echo "eksik: git" >&2
  missing=1
else
  git --version
fi
echo "shell ok"
if [ "$missing" -ne 0 ]; then
  echo "host aracı eksik. Uygulama node_modules, host pnpm, aws ve psql gerekmez. Zorunlu olan docker, docker compose, sh ve git." >&2
  exit 1
fi

docker build -f Dockerfile.ops -t yemesek-ops:local .
docker run --rm -w /opt/yemesek --entrypoint node yemesek-ops:local -e "process.stdout.write('ops-image node ' + process.version + '\n')"
docker run --rm --entrypoint psql yemesek-ops:local --version
docker run --rm --entrypoint openssl yemesek-ops:local version
docker run --rm -w /opt/yemesek --entrypoint node yemesek-ops:local -e "require('@aws-sdk/client-s3'); process.stdout.write('ops-image s3 sdk ok\n')"

mkdir -p ops/state/env
docker_as_invoker --rm -v "$PWD:/work" -w /work --entrypoint node yemesek-ops:local ops/render-env.mjs "$file" ops/state/env
docker run --rm -v "$PWD:/work" -w /work --env-file "$file" --entrypoint node yemesek-ops:local --experimental-strip-types ops/preflight-inner.mjs
echo "preflight: config ok. Gerçek R2/Brevo ağı yalnız --live ile denenir."
if [ "$live" -eq 0 ]; then
  exit 0
fi
set -- ops/live-probe.mjs
if [ -n "$mail_to" ]; then
  set -- "$@" --mail-to "$mail_to"
fi
script="$1"
shift
docker run --rm --env-file "$file" --entrypoint node yemesek-ops:local "/opt/yemesek/${script}" "$@"
