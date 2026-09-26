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
# compose run -d stops the one-off when its client exits, so the lease holder
# is already gone by the time we try to kill it. docker run -d leaves it up.
holder_image="$(docker inspect yemesek-api-local-1 --format '{{.Config.Image}}')"
holder_network="$(docker inspect yemesek-api-local-1 --format '{{range $name, $v := .NetworkSettings.Networks}}{{println $name}}{{end}}' | head -n 1)"
if [ -z "$holder_image" ] || [ -z "$holder_network" ]; then
  echo "queue crash: api image or network missing" >&2
  exit 1
fi
docker run -d --name yemesek-hold --network "$holder_network" \
  --env-file ops/state/env/api.env \
  -w /app/apps/api \
  "$holder_image" \
  node -e "for (const signal of ['SIGHUP','SIGINT','SIGTERM']) process.on(signal,()=>{}); setInterval(()=>{},1000); const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); const key=process.argv[1]; p.cleanupJob.create({data:{objectKey:key,status:'RUNNING',attempts:1,leaseOwner:'victim',leaseUntil:new Date(Date.now()+3000)}}).then(()=>process.stdout.write('lease held\n')).catch((error)=>{console.error(error&&error.name); process.exit(1);});" \
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
holder_state="$(docker inspect -f '{{.State.Status}}' yemesek-hold 2>/dev/null || echo missing)"
if [ "$holder_state" != "running" ]; then
  echo "queue crash: holder state=${holder_state}" >&2
  docker inspect -f 'exit={{.State.ExitCode}} oom={{.State.OOMKilled}} err={{.State.Error}}' yemesek-hold >&2 || true
  docker logs yemesek-hold 2>&1 | tail -n 30 >&2 || true
  docker rm -f yemesek-hold >/dev/null 2>&1 || true
  exit 1
fi
docker kill yemesek-hold >/dev/null
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
