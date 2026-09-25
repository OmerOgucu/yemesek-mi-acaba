import type { Metadata } from 'next';
import { getDocument } from '@yemesek/legal';
import { notFound } from 'next/navigation';
import { LegalDocument } from '@/features/legal/LegalDocument/LegalDocument';

const document = getDocument('cerez-politikasi');

export const metadata: Metadata = { title: document?.title ?? 'Çerez bildirimi' };

export default function CookiePolicyPage() {
  if (!document) notFound();
  return <LegalDocument document={document} />;
}