import type { Metadata } from 'next';
import { getDocument } from '@yemesek/legal';
import { notFound } from 'next/navigation';
import { LegalDocument } from '@/components/legal/LegalDocument/LegalDocument';

const document = getDocument('gizlilik');

export const metadata: Metadata = { title: document?.title ?? 'Gizlilik' };

export default function PrivacyPage() {
  if (!document) notFound();
  return <LegalDocument document={document} />;
}
