import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { uploadsDir } from '@yemesek/config';

export async function storeReportImage(name: string, buffer: Buffer): Promise<string> {
  const driver = (process.env.STORAGE_DRIVER ?? 'local').trim().toLowerCase();
  if (driver === 's3') return storeS3(name, buffer);
  const dir = join(uploadsDir(), 'reports');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), buffer);
  return `/uploads/reports/${name}`;
}

async function storeS3(name: string, buffer: Buffer): Promise<string> {
  const bucket = process.env.S3_BUCKET?.trim();
  const region = process.env.S3_REGION?.trim() || 'auto';
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  const endpoint = process.env.S3_ENDPOINT?.trim();
  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('S3 deposu için S3_BUCKET, S3_ACCESS_KEY_ID ve S3_SECRET_ACCESS_KEY gerekli.');
  }
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const client = new S3Client({
    region,
    endpoint: endpoint || undefined,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  });
  const key = `reports/${name}`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType(name),
      CacheControl: 'public, max-age=3600',
    }),
  );
  const base = process.env.S3_PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
  return base ? `${base}/${key}` : `/uploads/reports/${name}`;
}

function contentType(name: string): string {
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}
