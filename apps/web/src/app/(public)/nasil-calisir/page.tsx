import { ONBOARDING_STEPS } from '@yemesek/legal';
import type { Metadata } from 'next';
import { IntroDone } from '@/components/site/Onboarding/IntroDone';

export const metadata: Metadata = {
  title: 'Nasıl çalışır?',
  description: 'Yemesek mi acaba neden var, liste nasıl okunur, şikayet nasıl yazılır.',
};

export default function HowItWorksPage() {
  return (
    <article className="mx-auto max-w-2xl">
      <p className="text-[11px] tracking-[0.22em] text-chili uppercase">İlk bakış</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Nasıl çalışır?</h1>
      <p className="mt-3 text-muted">
        Gönüllü bir topluluk hizmeti. Şirket değil. Yüksek kötülük skoru daha kötü demektir.
      </p>
      <ol className="mt-8 space-y-4">
        {ONBOARDING_STEPS.map((step) => (
          <li key={step.id} className="rounded-2xl border border-line bg-card p-5">
            <p className="text-xs tracking-[0.16em] text-amber-ink uppercase">{step.kicker}</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">{step.title}</h2>
            {step.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-2 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </li>
        ))}
      </ol>
      <div className="mt-8">
        <IntroDone />
      </div>
    </article>
  );
}
