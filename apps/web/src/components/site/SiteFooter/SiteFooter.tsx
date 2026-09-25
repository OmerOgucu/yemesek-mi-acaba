import Link from 'next/link';
import { CookieSettingsButton } from '@/components/site/CookieNotice/CookieNotice';

const LINKS = [
  { href: '/kvkk', label: 'KVKK aydınlatma' },
  { href: '/gizlilik', label: 'Gizlilik' },
  { href: '/kullanim-kosullari', label: 'Kullanım koşulları' },
  { href: '/cerez-politikasi', label: 'Çerez bildirimi' },
  { href: '/topluluk-kurallari', label: 'Topluluk kuralları' },
  { href: '/seffaflik', label: 'Şeffaflık' },
  { href: '/basin', label: 'Basın' },
  { href: '/destek', label: 'Destek' },
  { href: '/harita', label: 'Harita' },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-ink/15">
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm leading-relaxed text-muted">
        <p className="font-display text-xl text-ink">Yemesek Mi Acaba?</p>
        <p className="mt-1 text-ink">Mekanları keşfet — kararını kolaylaştır</p>
        <p className="text-xs tracking-wide">yemesekmiacaba.com</p>
        <p className="mt-4">
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
          <li>
            <CookieSettingsButton />
          </li>
        </ul>
      </div>
    </footer>
  );
}
