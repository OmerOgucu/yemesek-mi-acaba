# Yayına çıkmadan on madde

Ayrıntı `docs/deploy.md`. Burada kapı listesi durur.

1. Alan adı ve TLS. `APP_PUBLIC_URL` `https://yemesekmiacaba.com` olsun. Yerelde localhost kalır.
2. CORS. `CORS_ORIGINS=https://yemesekmiacaba.com`. Boş bırakılırsa yalnızca localhost kabul edilir. `https://evil.example` `access-control-allow-origin` almasın.
3. Postgres. SQLite’ı yayına taşıma. Ayrı veritabanı, ayrı kullanıcı.
4. `pnpm db:seed` production’da yok. `NODE_ENV=production` iken seed, `ALLOW_PRODUCTION_SEED=true` olmadan durur ve veriyi silmez. Demo parolaları yalnızca yereldir.
5. Brevo anahtarı yalnızca sunucuda. Yapılandırma durumu `GET /admin/ops` içindedir, herkese açık sağlık ucunda değil. SPF, DKIM, DMARC: `docs/email-dns.md`.
6. Depo `STORAGE_DRIVER=s3`. Kova listelemesi kapalı. `SENTRY_DSN` boşsa olay gitmez.
7. `indexPublicReports` kapalı kalsın, ta ki şikayet sayfaları bilinçli açılana kadar.
8. Yönetici için `admin2faRequired` production’da açık olsun. Yıkıcı iş (şehir birleştirme, üye silme, kanıt temizliği) parola ve onay metni ister: `SEHRI-BIRLESTIR`, `KULLANICIYI-SIL`, `KANITI-SIL`. İş denetim kaydına düşer.
9. Bakım anahtarı `maintenanceMode`. Açıkken herkese açık yazma 503 döner. Ziyaretçi yalnızca “Bakımdayız.” görür. Ayrıntı `/admin/durum`.
10. Yedek prova edilmiş olsun. `docs/backup-restore-drill.md`. İhlal listesi `docs/breach-response.md`. Dal koruması GitHub ayarından açılır; kod bunu açamaz.

## Yumuşak yayın için yeter mi?

Evet, şu altı iş bittiyse: alan adı ve TLS, Brevo, Postgres, S3 veya R2, `CORS_ORIGINS=https://yemesekmiacaba.com`, sırlar yalnızca sunucuda. `allowedCities` dolu başlasın. Mağaza APK’sı ve TestFlight sonra. Dal koruması, DPA imzası ve gerçek denetim bu depodan açılmaz.

`pnpm audit:deps` üretim bağımlılıklarını tarar. Yamalanabilir olanlar (sharp 0.35, postcss 8.5.23, decode-uri-component 0.5) kilitlendi. Kalan dört uyarı çerçeve içindedir ve `pnpm.auditConfig.ignoreGhsas` ile bilinçli olarak dışarıda bırakıldı: Prisma’nın `deepmerge-ts` bağı, Metro’nun `image-size` bağı, Expo’nun `uuid` bağı. Yeni bir uyarı bu listeye eklenmeden denetimi düşürür.
