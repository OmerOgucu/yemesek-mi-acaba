'use client';

import { ONBOARDING_STEPS } from '@yemesek/legal';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { COOKIE_SAVED_EVENT } from '@/components/site/CookieNotice/CookieNotice';
import { hasCookieChoice, readIntroSeen, writeIntroSeen } from './intro-storage';

const SKIP_PREFIXES = ['/admin', '/nasil-calisir'];

export function OnboardingDialog() {
  const pathname = usePathname() ?? '/';
  const titleId = useId();
  const bodyId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const step = ONBOARDING_STEPS[index] ?? ONBOARDING_STEPS[0];
  const last = index >= ONBOARDING_STEPS.length - 1;
  const skipped = SKIP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  useEffect(() => {
    if (skipped) {
      setOpen(false);
      return;
    }
    const maybeOpen = () => {
      if (readIntroSeen() || !hasCookieChoice()) return;
      setOpen(true);
    };
    maybeOpen();
    window.addEventListener(COOKIE_SAVED_EVENT, maybeOpen);
    return () => window.removeEventListener(COOKIE_SAVED_EVENT, maybeOpen);
  }, [skipped]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      writeIntroSeen();
      setOpen(false);
      setIndex(0);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, index]);

  if (!open || skipped) return null;

  function finish() {
    writeIntroSeen();
    setOpen(false);
    setIndex(0);
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        ref={panelRef}
        tabIndex={-1}
        className="relative max-h-[min(36rem,100%)] w-full max-w-lg overflow-y-auto rounded-3xl border border-line bg-paper p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs tracking-[0.18em] text-chili uppercase">
            {step.kicker} · {index + 1}/{ONBOARDING_STEPS.length}
          </p>
          <button type="button" className="text-sm font-semibold text-ink underline" onClick={finish}>
            Atla
          </button>
        </div>
        <h2 id={titleId} className="mt-3 font-display text-3xl font-semibold text-ink">
          {step.title}
        </h2>
        <div id={bodyId} className="mt-3 space-y-2 text-base leading-relaxed text-ink">
          {step.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {index > 0 ? (
            <button type="button" className="btn btn-ghost text-sm" onClick={() => setIndex((current) => current - 1)}>
              Geri
            </button>
          ) : null}
          {last ? (
            <button type="button" className="btn btn-primary text-sm" onClick={finish}>
              Anladım
            </button>
          ) : (
            <button type="button" className="btn btn-primary text-sm" onClick={() => setIndex((current) => current + 1)}>
              İleri
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
