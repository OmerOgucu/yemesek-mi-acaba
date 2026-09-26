import { mkdirSync, readFileSync, rmSync, statSync } from 'fs';
import { dirname, resolve } from 'path';
import { uploadsDir } from '@yemesek/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

export type StoredBody = {
  body: Buffer;
  contentType: string;
};

const KEY = /^evidence\/[a-f0-9]{32}\.(jpg|png|webp)$/;

export function isObjectKey(value: string): boolean {
  return KEY.test(value);
}

function driver(): 's3' | 'local' {
  return (process.env.STORAGE_DRIVER ?? 'local').trim().toLowerCase() === 's3' ? 's3' : 'local';
}

function privateRoot(): string {
  return resolve(uploadsDir(), 'private');
}

function localPath(key: string): string {
  if (!isObjectKey(key)) throw new Error('Geçersiz nesne anahtarı.');
  const full = resolve(privateRoot(), key);
  if (!full.startsWith(`${privateRoot()}/`)) throw new Error('Geçersiz nesne yolu.');
  return full;
}

let s3: S3Client | null = null;

function s3Client(): S3Client {
  if (s3) return s3;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('S3 deposu için S3_ACCESS_KEY_ID ve S3_SECRET_ACCESS_KEY gerekli.');
  }
  s3 = new S3Client({
    region: process.env.S3_REGION?.trim() || 'auto',
    endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  });
  return s3;
}

function bucket(): string {
  const name = process.env.S3_BUCKET?.trim();
  if (!name) throw new Error('S3_BUCKET gerekli.');
  return name;
}

export function contentTypeForKey(key: string): string {
  if (key.endsWith('.png')) return 'image/png';
  if (key.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  if (!isObjectKey(key)) throw new Error('Geçersiz nesne anahtarı.');
  if (driver() === 's3') {
    await s3Client().send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'private, no-store',
      }),
    );
    return;
  }
  const full = localPath(key);
  mkdirSync(dirname(full), { recursive: true });
  const { writeFileSync } = await import('fs');
  writeFileSync(full, body);
}

export async function getObject(key: string): Promise<StoredBody | null> {
  if (!isObjectKey(key)) return null;
  if (driver() === 's3') {
    try {
      const result = await s3Client().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
      const bytes = await result.Body?.transformToByteArray();
      if (!bytes) return null;
      return { body: Buffer.from(bytes), contentType: result.ContentType || contentTypeForKey(key) };
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
  }
  const full = localPath(key);
  try {
    if (!statSync(full).isFile()) return null;
    return { body: readFileSync(full), contentType: contentTypeForKey(key) };
  } catch {
    return null;
  }
}

export async function headObject(key: string): Promise<boolean> {
  if (!isObjectKey(key)) return false;
  if (driver() === 's3') {
    try {
      await s3Client().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
      return true;
    } catch (error) {
      if (isMissing(error)) return false;
      throw error;
    }
  }
  try {
    return statSync(localPath(key)).isFile();
  } catch {
    return false;
  }
}

export async function deleteObject(key: string): Promise<'deleted' | 'missing'> {
  if (!isObjectKey(key)) return 'missing';
  if (driver() === 's3') {
    await s3Client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
    return 'deleted';
  }
  try {
    rmSync(localPath(key), { force: true });
    return 'deleted';
  } catch {
    throw new Error('Yerel nesne silinemedi.');
  }
}

function isMissing(error: unknown): boolean {
  const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : '';
  return name === 'NotFound' || name === 'NoSuchKey';
}
