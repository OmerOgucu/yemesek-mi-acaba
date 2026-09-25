import type { Metadata } from 'next';
import { getDocument } from '@yemesek/legal';
import { notFound } from 'next/navigation';
import { LegalDocument } from '@/components/legal/LegalDocument/LegalDocument';

const document = getDocument('kvkk');

export const metadata: Metadata = { title: document?.title ?? 'KVKK' };

export default function KvkkPage() {
  if (!document) notFound();
  return <LegalDocument document={document} />;
}
