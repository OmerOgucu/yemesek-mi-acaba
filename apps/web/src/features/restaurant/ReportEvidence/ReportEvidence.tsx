/* User uploads and local previews stay as plain images; the optimizer has no remote pattern for them. */
/* eslint-disable @next/next/no-img-element */
import { mediaUrl } from '@/lib/api/client';

export function ReportEvidence({
  photoUrls,
  receiptUrl,
  evidenceVerified,
}: {
  photoUrls: string[];
  receiptUrl: string;
  evidenceVerified: boolean;
}) {
  if (!photoUrls.length && !receiptUrl) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-medium tracking-wide text-moss uppercase">Kanıtlı şikayet</p>
      {evidenceVerified ? null : (
        <p className="mt-1 text-xs text-muted">Kanıt kullanıcı tarafından yüklendi, henüz incelenmedi.</p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {photoUrls.map((url) => (
          <a key={url} href={mediaUrl(url)} target="_blank" rel="noreferrer">
            <img src={mediaUrl(url)} alt="Yemek veya mekan fotoğrafı" className="h-24 w-24 rounded-xl object-cover" />
          </a>
        ))}
        {receiptUrl ? (
          <a href={mediaUrl(receiptUrl)} target="_blank" rel="noreferrer">
            <img src={mediaUrl(receiptUrl)} alt="Fiş veya fatura" className="h-24 w-24 rounded-xl object-cover" />
          </a>
        ) : null}
      </div>
    </div>
  );
}
