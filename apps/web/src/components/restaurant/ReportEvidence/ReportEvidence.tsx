/* User uploads and local previews stay as plain images; the optimizer has no remote pattern for them. */
/* eslint-disable @next/next/no-img-element */
import { mediaUrl } from '@/lib/api/client';

export function ReportEvidence({
  photoUrls,
  hasReceipt,
  evidenceVerified,
  moderationStatus,
}: {
  photoUrls: string[];
  hasReceipt?: boolean;
  evidenceVerified: boolean;
  moderationStatus?: string;
}) {
  if (!photoUrls.length && !hasReceipt) return null;
  const approved = moderationStatus === 'APPROVED' || evidenceVerified;
  return (
    <div className="mt-3">
      <p className="text-xs font-medium tracking-wide text-moss uppercase">Kanıtlı (dosya eklendi)</p>
      {approved ? (
        <p className="mt-1 text-xs font-medium text-ink">Moderatör onaylı</p>
      ) : (
        <p className="mt-1 text-xs text-muted">Dosya var. Bu, moderatör onayı değildir.</p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {photoUrls.map((url) => (
          <a key={url} href={mediaUrl(url)} target="_blank" rel="noreferrer">
            <img src={mediaUrl(url)} alt="Yemek veya mekan fotoğrafı" className="h-24 w-24 rounded-xl object-cover" />
          </a>
        ))}
        {hasReceipt ? <p className="text-xs text-muted">Fiş yüklendi. Dosya herkese açık değil.</p> : null}
      </div>
    </div>
  );
}
