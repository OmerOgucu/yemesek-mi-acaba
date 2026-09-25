#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
file=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --env-file)
      file="$2"
      shift 2
      ;;
    *)
      echo "bilinmeyen argüman: $1" >&2
      exit 2
      ;;
  esac
done
if [ -z "$file" ]; then
  echo "--env-file gerekli" >&2
  exit 2
fi
# shellcheck disable=SC1091
. ops/load-env.sh
load_env_file "$file"
base="${API_INTERNAL_URL:-http://127.0.0.1:${API_BIND_PORT:-3001}}"
health="$(curl -fsS "${base}/health")"
printf '%s\n' "$health" | grep -q '"status":"ok"'
if printf '%s\n' "$health" | grep -Eq 'mailConfigured|maintenance|secret|stack'; then
  echo "health sızıntı" >&2
  exit 1
fi
code="$(curl -s -o /dev/null -w '%{http_code}' "${base}/uploads/secret.png")"
if [ "$code" != "404" ]; then
  echo "/uploads $code" >&2
  exit 1
fi
echo "smoke: health ok, /uploads kapalı"
