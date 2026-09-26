UPDATE "SiteContent"
SET "body" = 'Yemesek mi acaba, gönüllü bir topluluk hizmetidir. Şirket değildir. Kanıtlı kötü mekan deneyimlerini paylaşmak içindir. Hakaret yok. Kişisel veri yok. Fotoğraf ve fiş zorunlu. Aynı mekanı çoğaltma. Şikayet kullanıcı metnidir; gönüllü inceleme resmi tespit değildir. İşletme yanıtı sırayı değiştirmez. Şu an reklam ve skor satışı yoktur. İleride tüzel kişilik kurulursa ayrıca açıklanır. Çıkar çatışması bu tahtayı satın alamaz.'
WHERE "key" = 'community_guidelines'
  AND "body" IN (
    'Hakaret yok. Kişisel veri yok. Fotoğraf ve fiş zorunlu. Aynı mekanı çoğaltma.',
    'Hakaret yok. Kişisel veri yok. Fotoğraf ve fiş zorunlu. Aynı mekanı çoğaltma. İşletme yanıtı sırayı değiştirmez. Reklam veya skor satışı yoktur; çıkar çatışması bu tahtayı satın alamaz.'
  );
