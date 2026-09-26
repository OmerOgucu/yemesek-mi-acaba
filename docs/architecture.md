# Mimari

Yemesek tek bir Nest sürecidir. `services/` altındaki paketler ayrı sunucu değildir; her biri bir alanın modülüdür. `apps/api` bunları birleştirir ve HTTP kapısıdır.

```
İstek
  → apps/api            CORS, gövde sınırı, hata filtresi, /uploads statik
  → services/auth       hesap, JWT, e-posta doğrulama
  → services/mail       Brevo veya yerel günlük
  → services/restaurants  liste, detay, yeni mekan, şehir grubu
  → services/reports    şikayet ve yararlı oy
  → services/evidence   fotoğraf + fiş dosyası
  → services/moderation metin politikası, evidenceVerified damgası
  → services/badges     katkı eşiği ve rozet
  → services/settings   site ayarı
  → services/admin      yönetim uçları
  → packages/database   Prisma
```

Skor formülü, kategori ağırlıkları ve ortak hata cümleleri `packages/shared` içindedir. Ortam değişkenleri `packages/config` ile okunur. Site parçaları `apps/web/src/components` altındadır. Yönetim yalnızca webdedir: `apps/web/src/app/admin`. Mobil ekranlar `apps/mobile/features` altındadır.

Herkese açık olanlar: sağlık, mekan listesi ve detay, site ayarlarının görünen metni, yasal sayfalar. Giriş serbesttir; mekan eklemek, şikayet ve oy e-posta doğrulaması ister. Şehir ve ilçe zorunludur ve `City` / `District` tablosunda tekilleşir: ilk yazım kalır, sonraki aynı anahtar o kayda bağlanır. Yönetim yazıları aynı API’ye gider; web ve mobil aynı veriyi okur. Kanıt dosyası olmadan şikayet yazılmaz. `evidenceVerified` inceleme onayına kadar kapalıdır; herkese açık “Kanıtlı şikayet” rozeti dosyanın yüklendiğini söyler.

Yerel dosyalar `uploads/` altındadır. Yayında bu klasörün yerini nesne deposu almalıdır.
