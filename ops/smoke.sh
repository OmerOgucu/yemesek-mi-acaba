#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
. ops/load-env.sh
# shellcheck disable=SC1091
. ops/common.sh
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
profile="${DEPLOY_PROFILE:-edge}"
build_compose_args
if [ "$profile" = "localhost" ]; then
  api_svc="api-local"
  web_svc="web-local"
else
  api_svc="api"
  web_svc="web"
fi

# shellcheck disable=SC2086
api_id="$(docker compose $COMPOSE_FILE_ARGS --env-file "$file" --profile "$profile" ps -q "$api_svc")"
# shellcheck disable=SC2086
web_id="$(docker compose $COMPOSE_FILE_ARGS --env-file "$file" --profile "$profile" ps -q "$web_svc")"
# shellcheck disable=SC2086
worker_id="$(docker compose $COMPOSE_FILE_ARGS --env-file "$file" --profile "$profile" ps -q worker)"
if [ -z "$api_id" ] || [ -z "$web_id" ] || [ -z "$worker_id" ]; then
  echo "smoke: beklenen servis yok" >&2
  exit 1
fi
project="$(docker inspect -f '{{index .Config.Labels "com.yemesek.project"}}' "$api_id")"
if [ "$project" != "yemesek" ]; then
  echo "smoke: proje etiketi uyuşmuyor" >&2
  exit 1
fi

curl_flags="--silent --show-error --max-time 10 --retry 5 --retry-delay 2 --retry-all-errors"
if [ "${SMOKE_INSECURE:-}" = "1" ]; then
  curl_flags="$curl_flags --insecure"
fi

check_url() {
  body="$(curl $curl_flags "$1")"
  printf '%s\n' "$body" | grep -q '"status":"ok"'
  if printf '%s\n' "$body" | grep -Eq 'mailConfigured|maintenance|secret|stack'; then
    echo "smoke: health sızıntı" >&2
    exit 1
  fi
  header="$(curl $curl_flags -D - -o /dev/null "$1" | tr -d '\r' | awk 'BEGIN{IGNORECASE=1} /^x-yemesek-project:/ {print $2}')"
  if [ "$header" != "yemesek" ]; then
    echo "smoke: proje başlığı yok" >&2
    exit 1
  fi
}

if [ "$profile" = "localhost" ]; then
  # shellcheck disable=SC2086
  check_url "http://127.0.0.1:${API_BIND_PORT:-3001}/health"
else
  # shellcheck disable=SC2086
  docker compose $COMPOSE_FILE_ARGS --env-file "$file" --profile "$profile" exec -T "$api_svc" \
    node -e "fetch('http://127.0.0.1:3001/health').then(async (r)=>{const t=await r.text(); if(!r.ok||!t.includes('\"status\":\"ok\"')||t.includes('mailConfigured')) process.exit(1); if(r.headers.get('x-yemesek-project')!=='yemesek') process.exit(1);}).catch(()=>process.exit(1))"
fi

# shellcheck disable=SC2086
check_url "${API_URL:?}/health"
code="$(curl $curl_flags -o /dev/null -w '%{http_code}' "${API_URL}/uploads/secret.png")"
if [ "$code" != "404" ]; then
  echo "smoke: /uploads ${code}" >&2
  exit 1
fi
media="$(curl $curl_flags -o /dev/null -w '%{http_code}' "${API_URL}/media/receipts/missing")"
if [ "$media" != "401" ]; then
  echo "smoke: fiş ${media}" >&2
  exit 1
fi
origin="$(printf '%s' "$APP_PUBLIC_URL" | sed 's#/$##')"
cors="$(curl $curl_flags -D - -o /dev/null -H "Origin: ${origin}" "${API_URL}/health" | tr -d '\r' | awk 'BEGIN{IGNORECASE=1} /^access-control-allow-origin:/ {print $2}')"
if [ "$cors" != "$origin" ]; then
  echo "smoke: cors" >&2
  exit 1
fi

# shellcheck disable=SC2086
docker compose $COMPOSE_FILE_ARGS --env-file "$file" --profile "$profile" exec -T worker \
  node -e "fetch('http://127.0.0.1:3001/ready').then(async (r)=>{const t=await r.text(); if(!r.ok||!t.includes('\"role\":\"worker\"')) process.exit(1);}).catch(()=>process.exit(1))"
# shellcheck disable=SC2086
docker compose $COMPOSE_FILE_ARGS --env-file "$file" --profile "$profile" exec -T "$web_svc" \
  node -e "fetch('http://127.0.0.1:3000/').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

web_keys="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$web_id" | cut -d= -f1)"
api_keys="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$api_id" | cut -d= -f1)"
worker_keys="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$worker_id" | cut -d= -f1)"
if printf '%s\n' "$web_keys" | grep -Eq '^(JWT_ACCESS_SECRET|DATABASE_URL|BREVO_API_KEY|S3_SECRET_ACCESS_KEY|S3_ACCESS_KEY_ID|BACKUP_PASSPHRASE|INITIAL_ADMIN_SETUP_SECRET|POSTGRES_PASSWORD)$'; then
  echo "smoke: web kabında yasak anahtar" >&2
  exit 1
fi
if printf '%s\n' "$api_keys" "$worker_keys" | grep -Eq '^(BACKUP_PASSPHRASE|INITIAL_ADMIN_SETUP_SECRET|POSTGRES_PASSWORD)$'; then
  echo "smoke: api veya worker kabında yedek ya da kurulum sırrı" >&2
  exit 1
fi
echo "smoke: health, proje, cors, fiş ve env anahtarları tamam"
