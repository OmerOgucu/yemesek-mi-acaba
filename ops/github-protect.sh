#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ -z "${GH_TOKEN:-}${GITHUB_TOKEN:-}" ]; then
  echo "NOT_APPLIED: GH_TOKEN yok. Ruleset dosyası .github/rulesets/main.json. Uygulama bu komutla, uygulama sırlarıyla değil."
  exit 2
fi
repo="${GITHUB_REPOSITORY:-OmerOgucu/yemesek-mi-acaba}"
gh api --method POST "repos/${repo}/rulesets" --input .github/rulesets/main.json
echo "ruleset isteği gönderildi. Panelden doğrula."
