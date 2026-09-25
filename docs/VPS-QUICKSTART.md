# VPS hızlı başlangıç

Bu paket mevcut 80/443 sahibine dokunmaz. İkinci reverse proxy veya sertifika yöneticisi açmaz. Postgres portu hosta yayınlanmaz.

## Edge (mevcut Dokploy/Traefik ağı)

`DEPLOY_PROFILE=edge`. `EDGE_NETWORK` var olan ağın adıdır. `API_HOST` ve `WEB_HOST` o ağdaki yönlendiricinin kullanacağı hostlardır. `TRAEFIK_ENABLE=true` yalnız etiket basar; Traefik’i bu compose başlatmaz.

## Localhost (mevcut Nginx)

`DEPLOY_PROFILE=localhost`. API `127.0.0.1:3001`, web `127.0.0.1:3000`. Nginx’i sen yönlendirirsin. 80/443 bu dosyada yoktur.

## Komutlar

```sh
cp .env.production.example .env.production
./ops/init-env.sh --env-file .env.production
# gerçek hesap, DNS, R2, Brevo, proje kimliği, şehir listesi
./ops/preflight.sh --env-file .env.production
./ops/deploy.sh --env-file .env.production
./ops/smoke.sh --env-file .env.production
./ops/backup.sh --env-file .env.production
./ops/restore-test.sh --env-file .env.production
./ops/rollback.sh --env-file .env.production --to <ONAYLI_RELEASE>
```

`deploy.sh` kilit alır, imajı bu commit ile etiketler, Postgres hazır olunca migration, sonra bootstrap, sonra API (`RUN_WORKER=false`), worker ve web. Hata kodu sıfırdan farklıdır. `compose down -v` yoktur.

İlk yönetici daveti `INITIAL_ADMIN_SETUP_SECRET` özetiyle saklanır. Kurulum:

```sh
curl -fsS -X POST "$API_URL/auth/admin/setup" \
  -H 'content-type: application/json' \
  -d '{"email":"...","setupSecret":"...","password":"...","displayName":"..."}'
```

Ardından giriş, `POST /auth/2fa/setup`, `POST /auth/2fa/confirm`. Eski oturum düşer. Yönetim, aynı oturumda TOTP doğrulanmadan açılmaz.

`backup.sh` şifreli dump’ı uzak kovaya koyar. Anahtar dump’ın içinde değildir; kaybolursa dosya açılmaz. Aynı diskteki tek kopya başarı sayılmaz. `restore-test.sh` yalnız adında `restore` veya `disposable` geçen başka bir veritabanına açar. Geri yükleme R2 nesnelerini geri getirmez. `rollback.sh` imaj etiketini geri alır, migration down çalıştırmaz.

GitHub koruması uygulanmış sayılmaz. Dosya `.github/rulesets/main.json`. Uygulamak için `GH_TOKEN` ile `./ops/github-protect.sh`. Uygulama sırlarına bu token yazılmaz.

Mobil imza bu depoda yoktur. Production EAS profili `EXPO_PUBLIC_API_URL` https değilse durur:

```sh
cd apps/mobile
eas build --profile production --platform android
eas build --profile production --platform ios
```
