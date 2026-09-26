import Image from 'next/image';
import Link from 'next/link';
import { AuthMenu } from '@/components/auth/AuthMenu/AuthMenu';

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="block">
          <Image
            src="/brand/logo.png"
            alt="Yemesek Mi Acaba?"
            width={661}
            height={268}
            priority
            className="h-14 w-auto sm:h-16"
            style={{ width: 'auto' }}
          />
        </Link>
        <AuthMenu />
      </div>
    </header>
  );
}
