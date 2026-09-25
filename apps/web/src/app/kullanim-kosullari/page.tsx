import type { Metadata } from 'next';
import { getDocument } from '@yemesek/legal';
import { notFound } from 'next/navigation';
import { LegalDocument } from '@/features/legal/LegalDocument/LegalDocument';

const document = getDocument('kullanim-kosullari');

export const metadata: Metadata = { title: document?.title ?? 'Kullanım koşulları' };

export default function TermsPage() {
  if (!document) notFound();
  return <LegalDocument document={document} />;
}
