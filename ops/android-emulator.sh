#!/bin/sh
set -eu
if command -v emulator >/dev/null 2>&1 || { [ -n "${ANDROID_HOME:-}" ] && [ -x "${ANDROID_HOME}/emulator/emulator" ]; }; then
  echo "ANDROID_EMULATOR sdk present"
  exit 0
fi
echo "ANDROID_EMULATOR NOT_RUN sdk missing"
exit 2
