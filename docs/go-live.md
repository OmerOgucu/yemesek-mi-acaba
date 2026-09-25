# Yayına çıkmadan on madde

Ayrıntı `docs/deploy.md`. Burada kapı listesi durur.

1. Alan adı ve TLS. `APP_PUBLIC_URL` `https://yemesekmiacaba.com` olsun. Yerelde localhost kalır.
2. CORS. API yalnızca bilinen web kökünü kabul etsin. `https://evil.example` gibi kökenler `access-control-allow-origin` almasın.
3. Postgres. SQLite’ı yayına taşıma. Ayrı veritabanı, ayrı kullanıcı.
4. `pnpm db:seed` production’da yok. Demo, yönetici ve moderatör parolaları (`Demo1234!`, `Admin1234!`, `Mod1234!`) yalnızca yereldir.
5. Brevo anahtarı yalnızca sunucuda. Boşsa `/health` içinde `mailConfigured: false` görünür. SPF, DKIM, DMARC: `docs/email-dns.md`.
6. Depo `STORAGE_DRIVER=s3`. Kova listelemesi kapalı. `SENTRY_DSN` boşsa olay gitmez.
7. `indexPublicReports` kapalı kalsın, ta ki şikayet sayfaları bilinçli açılana kadar.
8. Yönetici için `admin2faRequired` production’da açık olsun. Yıkıcı iş (şehir birleştirme, üye silme, kanıt temizliği) parola ve onay metni ister: `SEHRI-BIRLESTIR`, `KULLANICIYI-SIL`, `KANITI-SIL`. İş denetim kaydına düşer.
9. Bakım anahtarı `maintenanceMode`. Açıkken herkese açık yazma 503 döner. Okuma, `/health`, giriş ve `/admin` durur. `/durum` bunu gösterir.
10. Yedek prova edilmiş olsun. `docs/backup-restore-drill.md`. İhlal listesi `docs/breach-response.md`. Dal koruması GitHub ayarından açılır; kod bunu açamaz.

`pnpm audit:deps` üretim bağımlılıklarını tarar. Yamalanabilir olanlar (sharp 0.35, postcss 8.5.23, decode-uri-component 0.5) kilitlendi. Kalan dört uyarı çerçeve içindedir ve `pnpm.auditConfig.ignoreGhsas` ile bilinçli olarak dışarıda bırakıldı: Prisma’nın `deepmerge-ts` bağı, Metro’nun `image-size` bağı, Expo’nun `uuid` bağı. Yeni bir uyarı bu listeye eklenmeden denetimi düşürür.
