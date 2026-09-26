#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ -z "${GH_TOKEN:-${GITHUB_TOKEN:-}}" ]; then
  echo "NOT_APPLIED: GH_TOKEN yok. Ruleset dosyası .github/rulesets/main.json. Dosyanın varlığı uygulama değildir."
  exit 2
fi
export GH_TOKEN="${GH_TOKEN:-$GITHUB_TOKEN}"
repo="${GITHUB_REPOSITORY:-OmerOgucu/yemesek-mi-acaba}"
node ops/apply-ruleset.mjs "$repo"
