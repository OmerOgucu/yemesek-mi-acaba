# Kişisel veri ihlali kontrol listesi

Bu dosya işletme içi adımdır. Avukat görüşü veya Kurul formu değildir. Süre ve bildirim yükümlülüğü somut olaya göre ayrıca bakılır.

## 1. Fark et

- Saati yaz. Kim gördü, hangi sistem, hangi veri (e-posta, şikayet, kanıt dosyası).
- Ekran görüntüsü ve günlük kopyasını, silmeden, sınırlı bir yere al.

## 2. Durdur

- Sızan anahtarı, jetonu veya hesabı kapat. Yeni anahtar üret. Eski anahtarı depoya koyma.
- Etkilenen oturumları `sessionsRevokedAt` ile düşür. Gerekirse bakımı aç (`maintenanceMode`).
- Kovayı herkese açık listeleme ile açma. İmzalı adres varsa süresini kısalt.

## 3. Kapsamı say

- Kaç hesap, hangi alan, ne zamandan beri.
- Başka kullanıcının verisi karıştıysa onu ayır. Dışa aktarma uçları yalnızca hesabın sahibine aittir.

## 4. Haber ver

- İlgili kişilere, somut ve kısa bir not. Ne oldu, ne yaptın, ne yapmalarını istiyorsun.
- Kurul bildirimi gerekip gerekmediğini hukukçu ile say. Bu liste o kararı vermez.
- Basın metni, basın adresinden gider. Gizli dökümü oraya koyma.

## 5. Kapat

- Denetim kaydına kim, ne zaman, hangi uç yazıldı.
- Düzeltmeyi ve tekrarını not et. Yedekten dönülecekse `docs/backup-restore-drill.md`.
- Bu liste sitede yayımlanmaz. Yalnızca depoda durur.
