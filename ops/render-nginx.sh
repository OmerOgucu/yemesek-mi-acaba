#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
. ops/load-env.sh
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
if ! command -v docker >/dev/null 2>&1; then
  echo "docker yok. nginx -t çalıştırılmadı." >&2
  exit 1
fi
docker run --rm -v "$PWD:/work" -w /work -e API_BIND_PORT -e WEB_BIND_PORT -e API_HOST -e WEB_HOST \
  --entrypoint node yemesek-ops:local ops/render-nginx.mjs ops/state/nginx
docker run --rm -v "$PWD/ops/state/nginx/test.conf:/etc/nginx/nginx.conf:ro" nginx:1.27-alpine nginx -t
echo "nginx -t ok. Host sitesine yazılmadı. 80/443 açılmadı."
