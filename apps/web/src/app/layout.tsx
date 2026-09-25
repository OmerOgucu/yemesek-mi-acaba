import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Fraunces, Outfit } from 'next/font/google';
import { CookieNotice } from '@/components/site/CookieNotice/CookieNotice';
import { SiteFooter } from '@/components/site/SiteFooter/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader/SiteHeader';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-fraunces',
});

const outfit = Outfit({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: {
    default: 'Yemesek mi acaba?',
    template: '%s · Yemesek mi acaba?',
  },
  description: 'Kötü restoran deneyimlerini oku, şüpheli mekanlardan uzak dur.',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body className={`${fraunces.variable} ${outfit.variable} min-h-screen font-sans antialiased`}>
        <a
          href="#icerik"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-10 focus:rounded-full focus:bg-card focus:px-3 focus:py-2"
        >
          İçeriğe geç
        </a>
        <SiteHeader />
        <main id="icerik" className="mx-auto max-w-5xl px-4 py-8">
          {children}
        </main>
        <SiteFooter />
        <CookieNotice />
      </body>
    </html>
  );
}
