import type { MetadataRoute } from 'next';
import { getPublicSettings } from '@/lib/api/client';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getPublicSettings().catch(() => []);
  const indexReports = settings.find((row) => row.key === 'indexPublicReports')?.value === 'true';
  const hidden = ['/admin', '/profil', '/uploads', '/durum', '/ihlal', '/api'];
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: indexReports ? hidden : ['/restoran/', ...hidden],
    },
  };
}
