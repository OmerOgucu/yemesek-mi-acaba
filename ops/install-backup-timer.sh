#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
install=0
file=".env.production"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --install) install=1; shift ;;
    --env-file) file="$2"; shift 2 ;;
    *) echo "bilinmeyen argüman" >&2; exit 2 ;;
  esac
done
root="$(pwd)"
if [ -f "$file" ]; then
  file="$(cd "$(dirname "$file")" && pwd)/$(basename "$file")"
fi
mkdir -p ops/state/systemd
sed -e "s#@ROOT@#${root}#g" -e "s#@ENV@#${file}#g" ops/systemd/yemesek-backup.service.in > ops/state/systemd/yemesek-backup.service
sed -e "s#@ROOT@#${root}#g" -e "s#@ENV@#${file}#g" ops/systemd/yemesek-backup-age.service.in > ops/state/systemd/yemesek-backup-age.service
cp ops/systemd/yemesek-backup.timer ops/state/systemd/yemesek-backup.timer
cp ops/systemd/yemesek-backup-age.timer ops/state/systemd/yemesek-backup-age.timer
echo "timer rendered. Yedek 02:30 UTC. Yaş kontrolü 6 saatte bir. R2 nesneleri dahil değildir."
if [ "$install" -eq 0 ]; then
  echo "Kurmak için root ile --install. Bu komut /etc dosyalarını kendiliğinden değiştirmez."
  exit 0
fi
if [ "$(id -u)" -ne 0 ]; then
  echo "--install root ister" >&2
  exit 1
fi
cp ops/state/systemd/yemesek-backup.service /etc/systemd/system/yemesek-backup.service
cp ops/state/systemd/yemesek-backup.timer /etc/systemd/system/yemesek-backup.timer
cp ops/state/systemd/yemesek-backup-age.service /etc/systemd/system/yemesek-backup-age.service
cp ops/state/systemd/yemesek-backup-age.timer /etc/systemd/system/yemesek-backup-age.timer
systemctl daemon-reload
systemctl enable --now yemesek-backup.timer
systemctl enable --now yemesek-backup-age.timer
echo "timer installed for ${file}"
