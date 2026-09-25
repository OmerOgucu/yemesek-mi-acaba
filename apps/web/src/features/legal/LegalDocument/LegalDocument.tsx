import type { LegalDocument as LegalDocumentData } from '@yemesek/legal';

export function LegalDocument({ document }: { document: LegalDocumentData }) {
  return (
    <article className="max-w-3xl">
      <p className="text-[11px] tracking-[0.22em] text-chili uppercase">Yasal · {document.updated}</p>
      <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">{document.title}</h1>
      <p className="mt-3 text-muted">{document.summary}</p>
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
