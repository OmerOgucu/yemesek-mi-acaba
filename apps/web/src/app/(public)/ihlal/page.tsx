import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'İhlal adımları' };

export default function BreachPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-display text-4xl font-semibold">Kişisel veri ihlali</h1>
      <p className="text-muted">
        Bu sayfa işletme içi kontrol listesinin kısa halidir. Ayrıntı depoda `docs/breach-response.md`. Hukuki görüş değildir.
      </p>
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>Olayı saatle kaydet. Kim fark etti, hangi veri, hangi sistem.</li>
        <li>Erişimi kes: anahtar, oturum, etkilenen hesap. Kanıtı silmeden önce kopyala.</li>
        <li>Kapsamı daralt. Başka kullanıcıların verisi karışmasın.</li>
        <li>Gerekirse ilgilileri ve Kurul bildirimini ayrıca değerlendir. Süreleri kaçırma.</li>
        <li>Ne yapıldığını denetim notuna yaz. Düzeltmeyi ve tekrarını kapat.</li>
      </ol>
    </article>
  );
}
