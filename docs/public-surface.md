# Herkese açık yüzey

Bu liste ilk yayında neyin dışarıda durduğunu sabitler. İç kontrol listeleri (`docs/go-live.md`, `docs/breach-response.md`) sitede linklenmez.

## Herkese açık

- Ana liste, mekan sayfası, yasal metinler, topluluk kuralları, şeffaflık sayıları, basın iletişim adresi, destek formu, çerez tercihi (yalnızca bu cihazda).
- `GET /health`: yalnızca `{ status: "ok", uptime }`. Bakım, e-posta, sürüm ve ayar yok.
- `GET /site/maintenance`: yalnızca `{ active: true|false }`. Bakım sayfası “Bakımdayız.” der. Anahtar adı, yönetici yolu veya nasıl girileceği yazılmaz.
- `GET /settings`: yalnızca `indexPublicReports`. Diğer ayarlar yok.
- Kanıt dosyası: `GET /uploads/reports/<32 hex>.jpg|png|webp`. İsim `randomBytes(16)`. Sıralı numara yok. Dizin listesi 404. MVP’de dosya URL’si bilen okuyabilir; gizli kanıt kovası bu turda yok.
- `robots.txt` şunları kapatır: `/admin`, `/profil`, `/uploads`, `/durum`, `/ihlal`, `/api`. Şikayet sayfaları varsayılan noindex.

## Giriş

- Profil, veri indirme (`GET /auth/me/export`), pazarlama rızası, şikayet, oy, mekan ekleme, işletme talebi.
- Dışa aktarma 10 dakikada 5. Destek formu ve işletme talebi 10 dakikada 5. Giriş ve kayıt 10 dakikada 8. Genel yazma dakikada 20.
- Başka kullanıcının e-postası, parola özeti veya jetonu bu uçlarda yok.

## Yönetici

- `/admin` ve `GET /admin/ops`. Bakım, e-posta yapılandırması ve en düşük mobil sürüm burada.
- Ayar, rol, rozet, şablon, üye silme, şehir birleştirme, kanıt temizliği: yalnız `ADMIN`.
- Moderatör inceleme, gizleme, talep ve itiraz görebilir. Ayar ve rol 403.

## Kapalı

- `GET /auth/dev/verification` production’da 404. Arayüzde link yok. Brevo anahtarı varken de 404.
- Eski `/durum` ve `/ihlal` sayfaları yok.
- Tarayıcı kaynak haritası yayında kapalı (`productionBrowserSourceMaps: false`).
