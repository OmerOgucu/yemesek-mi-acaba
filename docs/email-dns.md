# E-posta DNS (Brevo)

Bu dosya kayıtların nereye yazılacağını anlatır. Anahtar veya gerçek DNS kaydı burada yoktur.

1. Alan adını Brevo’da ekle. Gönderen adresi `BREVO_SENDER_EMAIL` ile aynı kökte olsun.
2. Brevo’nun verdiği SPF kaydını DNS’e TXT olarak yaz. Zaten bir SPF varsa ikinci satır açma; mevcut kaydın içine Brevo mekanizmasını ekle.
3. DKIM için Brevo’nun verdiği CNAME veya TXT kayıtlarını, gösterdiği ada birebir koy. Doğrulama geçmeden üretim postası gönderme.
4. DMARC’ı en azından izleme ile aç: `v=DMARC1; p=none; rua=mailto:hukuk@yemesekmiacaba.com`. Raporlar oturunca `p=quarantine` düşünülür. Bunu Brevo paneli söylemeden sıkılaştırma.
5. `APP_PUBLIC_URL` bağlantıları bu alan adına gitsin. Doğrulama ve parola sıfırlama linki başka köke düşmesin.
6. Anahtar sunucu ortamında kalır. Depoya, mobil istemciye ve loga yazılmaz.
