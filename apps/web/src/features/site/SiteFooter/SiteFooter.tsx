import Link from 'next/link';

const LINKS = [
  { href: '/kvkk', label: 'KVKK aydınlatma' },
  { href: '/gizlilik', label: 'Gizlilik' },
  { href: '/kullanim-kosullari', label: 'Kullanım koşulları' },
  { href: '/cerez-politikasi', label: 'Çerez bildirimi' },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-ink/15">
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm leading-relaxed text-muted">
        <p>
          Buradaki şikayetler kullanıcıların anlattıklarıdır. Resmi denetim, laboratuvar sonucu veya
          mahkeme kararı değildir. Hakaret, tehdit ve kişisel veri (telefon, tam adres, kimlik) yazmayın.
          Yüksek kötülük skoru “uzak dur” tavsiyesidir, birinin suçluluğu değildir.
        </p>
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="underline decoration-line underline-offset-4">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
