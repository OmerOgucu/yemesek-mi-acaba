# Mimari

Yemesek tek bir Nest sürecidir. `services/` altındaki paketler ayrı sunucu değildir; her biri bir alanın modülüdür. `apps/api` bunları birleştirir ve HTTP kapısıdır.

```
İstek
  → apps/api            CORS, gövde sınırı, hata filtresi, /uploads statik
  → services/auth       hesap, JWT, yenileme jetonu
  → services/restaurants  liste, detay, yeni mekan, kötülük skoru görünümü
  → services/reports    şikayet ve yararlı oy
  → services/evidence   fotoğraf + fiş dosyası
  → services/moderation metin politikası, evidenceVerified damgası
  → packages/database   Prisma
```

Skor formülü, kategori ağırlıkları ve ortak hata cümleleri `packages/shared` içindedir. Ortam değişkenleri `packages/config` ile okunur. Site parçaları `apps/web/src/components` altındadır. Mobil ekranlar `apps/mobile/features` altındadır.

Herkese açık olanlar: sağlık, mekan listesi ve detay, yeni mekan, yasal sayfalar. Şikayet ve oy giriş ister. Kanıt dosyası olmadan şikayet yazılmaz. `evidenceVerified` varsayılanı kapalıdır; rozet dosyanın yüklendiğini söyler, incelemenin geçtiğini değil.

Yerel dosyalar `uploads/` altındadır. Yayında bu klasörün yerini nesne deposu almalıdır.
