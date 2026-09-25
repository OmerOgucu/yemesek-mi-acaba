import Link from 'next/link';
import { AuthMenu } from '@/components/auth/AuthMenu/AuthMenu';

export function SiteHeader() {
  return (
    <header className="border-b border-ink">
      <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-4 px-4 py-5">
        <div>
          <p className="text-[11px] tracking-[0.22em] text-muted uppercase">Kara liste · İstanbul ve KKTC</p>
          <Link href="/" className="font-display text-3xl leading-none font-semibold sm:text-4xl">
            Yemesek mi acaba?
          </Link>
        </div>
        <AuthMenu />
      </div>
    </header>
  );
}
