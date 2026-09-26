#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
# shellcheck disable=SC1091
. ops/load-env.sh
# shellcheck disable=SC1091
. ops/common.sh
: "${ENV_FILE:?}"
load_env_file "$ENV_FILE"
build_compose_args

key="$(docker run --rm --entrypoint node yemesek-ops:local -e "process.stdout.write('evidence/' + 'ab'.repeat(16) + '.jpg')")"
# shellcheck disable=SC2086
docker compose $COMPOSE_FILE_ARGS --env-file "$ENV_FILE" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DELETE FROM \"CleanupJob\" WHERE \"objectKey\" = '${key}';" >/dev/null
docker rm -f yemesek-hold >/dev/null 2>&1 || true
# shellcheck disable=SC2086
docker compose $COMPOSE_FILE_ARGS --env-file "$ENV_FILE" --profile localhost run -d --name yemesek-hold --no-deps -w /app/apps/api api-local \
  node -e "for (const signal of ['SIGHUP','SIGINT','SIGTERM']) process.on(signal,()=>{}); const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); const key=process.argv[1]; p.cleanupJob.create({data:{objectKey:key,status:'RUNNING',attempts:1,leaseOwner:'victim',leaseUntil:new Date(Date.now()+3000)}}).then(()=>new Promise(()=>{})).catch((error)=>{console.error(error&&error.name); process.exit(1);});" \
  "$key"
deadline=$(( $(date +%s) + 20 ))
status=""
while [ "$(date +%s)" -lt "$deadline" ]; do
  # shellcheck disable=SC2086
  status="$(docker compose $COMPOSE_FILE_ARGS --env-file "$ENV_FILE" exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT status FROM \"CleanupJob\" WHERE \"objectKey\" = '${key}';")"
  if [ "$status" = "RUNNING" ]; then
    break
  fi
  sleep 1
done
if [ "$status" != "RUNNING" ]; then
  echo "queue crash: lease not running" >&2
  docker rm -f yemesek-hold >/dev/null 2>&1 || true
  exit 1
fi
if ! docker kill yemesek-hold >/dev/null 2>&1; then
  echo "queue crash: holder was not running" >&2
  docker logs yemesek-hold 2>&1 | tail -n 30 >&2 || true
  docker rm -f yemesek-hold >/dev/null 2>&1 || true
  exit 1
fi
sleep 5
deadline=$(( $(date +%s) + 30 ))
while [ "$(date +%s)" -lt "$deadline" ]; do
  # shellcheck disable=SC2086
  status="$(docker compose $COMPOSE_FILE_ARGS --env-file "$ENV_FILE" exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT status FROM \"CleanupJob\" WHERE \"objectKey\" = '${key}';")"
  if [ "$status" = "DONE" ]; then
    count="$(docker compose $COMPOSE_FILE_ARGS --env-file "$ENV_FILE" exec -T postgres \
      psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT count(*) FROM \"CleanupJob\" WHERE \"objectKey\" = '${key}';")"
    docker rm -f yemesek-hold >/dev/null 2>&1 || true
    if [ "$count" != "1" ]; then
      echo "queue crash: row multiplied" >&2
      exit 1
    fi
    echo "queue crash: reclaimed and completed"
    exit 0
  fi
  sleep 1
done
echo "queue crash: not completed" >&2
docker rm -f yemesek-hold >/dev/null 2>&1 || true
exit 1
