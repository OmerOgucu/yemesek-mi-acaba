import type { LegalDocument as LegalDocumentData } from '@yemesek/legal';
import { apiBaseUrl } from '@/lib/api/client';

export async function LegalDocument({ document }: { document: LegalDocumentData }) {
  let legalEmail = 'hukuk@yemesekmiacaba.com';
  let pressEmail = 'basin@yemesekmiacaba.com';
  let controllerName: string | null = null;
  let contactAddress: string | null = null;
  try {
    const response = await fetch(new URL('/site/identity', apiBaseUrl()), { cache: 'no-store' });
    if (response.ok) {
      const identity = (await response.json()) as {
        legalEmail?: string;
        pressEmail?: string;
        controllerName?: string | null;
        contactAddress?: string | null;
      };
      if (identity.legalEmail) legalEmail = identity.legalEmail;
      if (identity.pressEmail) pressEmail = identity.pressEmail;
      controllerName = identity.controllerName ?? null;
      contactAddress = identity.contactAddress ?? null;
    }
  } catch {
    // Kimlik okunamazsa yer tutucu adresler kalır. Sahte şirket adı yazılmaz.
  }

  return (
    <article className="max-w-3xl">
      <p className="text-[11px] tracking-[0.22em] text-chili uppercase">Yasal · {document.updated}</p>
      <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">{document.title}</h1>
      <p className="mt-3 text-muted">{document.summary}</p>
      <p className="mt-3 text-sm text-muted">
        Güncel iletişim (ayarlar): hukuk{' '}
        <a className="underline" href={`mailto:${legalEmail}`}>{legalEmail}</a>
        , basın{' '}
        <a className="underline" href={`mailto:${pressEmail}`}>{pressEmail}</a>
        . Şu an tüzel kişilik yoktur.
        {controllerName ? ` Proje yürütücüsü: ${controllerName}.` : ' Proje yürütücüsü adı site ayarında yok.'}
        {contactAddress ? ` Adres: ${contactAddress}.` : ''}
      </p>
      <div className="mt-8 space-y-8">
        {document.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-2xl">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-3 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
