# Arama motoru

Şikayet ve kanıt sayfaları varsayılan olarak `noindex, nofollow` alır. Ana liste açık kalabilir. Ayar `indexPublicReports` bunu açar. Kapalıyken `robots.txt` `/restoran/` yolunu da kapatır.

Yüklenen dosyalar `X-Robots-Tag: noindex, nofollow` ile sunulur.

Google bir sayfayı daha önce dizine aldıysa, noindex sonraki taramada düşürür. Eski önbellek kopyası bir süre aramada kalabilir. Bunu panelden anında silmek mümkün değildir. Kaldırma için Search Console’dan URL kaldırma istenir. Bu, başkasının kopyaladığı metni silmez.
