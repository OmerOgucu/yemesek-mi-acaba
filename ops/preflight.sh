#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
file=""
live=0
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
node --experimental-strip-types --input-type=module -e "import { assertLaunchConfig } from './packages/config/src/env.ts'; assertLaunchConfig();"
echo "preflight: config ok"
if [ "$live" -eq 0 ]; then
  echo "preflight: provider ağ testi çalışmadı. Gerçek R2/Brevo için --live kullan."
  exit 0
fi
node ops/live-probe.mjs
