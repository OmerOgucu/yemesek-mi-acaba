import { randomBytes } from 'crypto';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { basename, join } from 'path';
import { BadRequestException } from '@nestjs/common';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTOS = 3;

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export const VENUE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
  'base64',
);
export const RECEIPT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

export type ImageExt = 'jpg' | 'png' | 'webp';

export type IncomingImage = {
  buffer: Buffer;
  size: number;
};

export function uploadsRoot(): string {
  return process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');
}

export function detectImage(buffer: Buffer): ImageExt | null {
  if (buffer.length < 12 || buffer.length > MAX_IMAGE_BYTES) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.subarray(0, 8).equals(PNG_MAGIC)) return 'png';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'webp';
  }
  return null;
}

export function publicUploadPath(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/uploads/')) return null;
  if (value.includes('..') || value.includes('\\') || value.includes('\0')) return null;
  return value;
}

export function photoUrlList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(publicUploadPath).filter((item): item is string => Boolean(item));
}

export function saveEvidenceFile(buffer: Buffer): string {
  const ext = detectImage(buffer);
  if (!ext) {
    throw new BadRequestException('Yalnızca JPEG, PNG veya WebP yükleyebilirsin.');
  }
  const name = `${randomBytes(16).toString('hex')}.${ext}`;
  const dir = join(uploadsRoot(), 'reports');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), buffer);
  return `/uploads/reports/${name}`;
}

export function removeStoredFile(url: string): void {
  if (!url.startsWith('/uploads/reports/')) return;
  const name = basename(url);
  if (!/^[a-f0-9]{32}\.(jpg|png|webp)$/.test(name)) return;
  const full = join(uploadsRoot(), 'reports', name);
  if (!existsSync(full)) return;
  try {
    unlinkSync(full);
  } catch {
    // The account is already gone. A leftover file is better than a failed deletion.
  }
}

export function writeSeedPlaceholders(): { photoUrl: string; receiptUrl: string } {
  const dir = join(uploadsRoot(), 'seed');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'venue.png'), VENUE_PNG);
  writeFileSync(join(dir, 'receipt.png'), RECEIPT_PNG);
  return { photoUrl: '/uploads/seed/venue.png', receiptUrl: '/uploads/seed/receipt.png' };
}

export function assertEvidenceFiles(photos: IncomingImage[] | undefined, receipt: IncomingImage[] | undefined): {
  photoUrls: string[];
  receiptUrl: string;
} {
  if (!photos?.length) {
    throw new BadRequestException('En az bir yemek veya mekan fotoğrafı gerekli.');
  }
  if (photos.length > MAX_PHOTOS) {
    throw new BadRequestException('En fazla 3 fotoğraf yükleyebilirsin.');
  }
  if (!receipt?.length) {
    throw new BadRequestException('Fiş veya fatura fotoğrafı gerekli.');
  }
  if (receipt.length > 1) {
    throw new BadRequestException('Tek bir fiş veya fatura yükleyebilirsin.');
  }

  const written: string[] = [];
  try {
    const photoUrls = photos.map((file) => {
      const url = saveEvidenceFile(file.buffer);
      written.push(url);
      return url;
    });
    const receiptUrl = saveEvidenceFile(receipt[0].buffer);
    written.push(receiptUrl);
    return { photoUrls, receiptUrl };
  } catch (error) {
    for (const url of written) removeStoredFile(url);
    throw error;
  }
}
