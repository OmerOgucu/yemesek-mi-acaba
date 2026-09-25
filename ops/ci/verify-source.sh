#!/bin/sh
# Source suite shared by PR, main, and release workflows. No production secrets.
set -eu
cd "$(dirname "$0")/../.."
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm audit:deps
pnpm --filter @yemesek/web build
node -e "process.env.APP_ENV='production'; process.env.EXPO_PUBLIC_API_URL='http://localhost:3001'; try { require('./apps/mobile/app.config.js')(); process.exit(1);} catch (e) { if (!String(e.message).includes('https')) process.exit(1); }"
node -e "process.env.APP_ENV='production'; process.env.EXPO_PUBLIC_API_URL='https://api.yemesekmiacaba.com'; const cfg=require('./apps/mobile/app.config.js')(); if (cfg.expo.android.usesCleartextTraffic) process.exit(1);"
if sh ops/android-emulator.sh; then
  :
else
  code="$?"
  if [ "$code" -ne 2 ]; then
    exit "$code"
  fi
fi
CI=1 EXPO_NO_TELEMETRY=1 pnpm --filter @yemesek/mobile exec expo export --platform android --output-dir dist/android
docker build -f Dockerfile.api -t yemesek-api:ci .
docker build -f Dockerfile.web --build-arg NEXT_PUBLIC_API_URL=https://api.yemesekmiacaba.com -t yemesek-web:ci .
