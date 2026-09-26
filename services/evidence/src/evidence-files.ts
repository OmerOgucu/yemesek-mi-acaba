import { randomBytes } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { uploadsDir } from '@yemesek/config';
import { MAX_IMAGE_BYTES, MAX_PHOTOS } from './dto/upload-limits';
import { contentTypeForKey, deleteObject, isObjectKey, putObject } from './object-storage';
import { stripImageMetadata } from './strip-metadata';

export { MAX_IMAGE_BYTES, MAX_PHOTOS };

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
  return uploadsDir();
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

export function storedObjectKey(value: unknown): string | null {
  if (typeof value !== 'string' || !isObjectKey(value)) return null;
  return value;
}

export function photoUrlList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(storedObjectKey).filter((item): item is string => Boolean(item));
}

let inflight = 0;
const MAX_INFLIGHT = 4;

function isHeic(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  return buffer.toString('ascii', 4, 8) === 'ftyp' && /heic|heif|mif1|msf1/.test(buffer.toString('ascii', 8, 12));
}

export async function prepareEvidenceBuffer(buffer: Buffer): Promise<{ ext: ImageExt; bytes: Buffer }> {
  if (inflight >= MAX_INFLIGHT) {
    throw new BadRequestException('Çok fazla yükleme aynı anda. Biraz bekle.');
  }
  inflight += 1;
  try {
    if (isHeic(buffer)) {
      try {
        const sharp = (await import('sharp')).default;
        const bytes = await sharp(buffer, { failOn: 'error', limitInputPixels: 24_000_000 }).rotate().jpeg({ quality: 82 }).toBuffer();
        return { ext: 'jpg', bytes };
      } catch {
        throw new BadRequestException('HEIC okunamadı. Fotoğrafı JPEG olarak seç.');
      }
    }
    const ext = detectImage(buffer);
    if (!ext) {
      throw new BadRequestException('Yalnızca JPEG, PNG veya WebP yükleyebilirsin.');
    }
    const stripped = stripImageMetadata(buffer, ext);
    try {
      const sharp = (await import('sharp')).default;
      let image = sharp(stripped, { failOn: 'error', limitInputPixels: 24_000_000 }).rotate();
      const meta = await image.metadata();
      const width = meta.width ?? 0;
      const height = meta.height ?? 0;
      if (!width || !height) throw new Error('decode');
      if (width * height > 24_000_000) {
        throw new BadRequestException('Görsel çok büyük. Daha küçük bir fotoğraf seç.');
      }
      if (width > 1600 || height > 1600) {
        image = image.resize(1600, 1600, { fit: 'inside', withoutEnlargement: true });
      }
      const bytes =
        ext === 'jpg'
          ? await image.jpeg({ quality: 82 }).toBuffer()
          : ext === 'png'
            ? await image.png({ compressionLevel: 9 }).toBuffer()
            : await image.webp({ quality: 82 }).toBuffer();
      return { ext, bytes };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Görsel okunamadı. JPEG, PNG veya WebP yükle.');
    }
  } finally {
    inflight -= 1;
  }
}

export async function saveEvidenceFile(buffer: Buffer): Promise<{ key: string; byteSize: number; contentType: string }> {
  const prepared = await prepareEvidenceBuffer(buffer);
  const key = `evidence/${randomBytes(16).toString('hex')}.${prepared.ext}`;
  const contentType = contentTypeForKey(key);
  await putObject(key, prepared.bytes, contentType);
  return { key, byteSize: prepared.bytes.length, contentType };
}

export async function removeStoredFile(key: string): Promise<boolean> {
  if (!isObjectKey(key)) return false;
  try {
    await deleteObject(key);
    return true;
  } catch {
    return false;
  }
}

export async function writeSeedPlaceholders(): Promise<{ photoUrl: string; receiptUrl: string }> {
  const photo = await saveEvidenceFile(VENUE_PNG);
  const receipt = await saveEvidenceFile(RECEIPT_PNG);
  return { photoUrl: photo.key, receiptUrl: receipt.key };
}

export type StoredEvidence = {
  key: string;
  kind: 'photo' | 'receipt';
  contentType: string;
  byteSize: number;
};

export async function assertEvidenceFiles(photos: IncomingImage[] | undefined, receipt: IncomingImage[] | undefined): Promise<{
  photoUrls: string[];
  receiptUrl: string;
  objects: StoredEvidence[];
}> {
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

  const written: StoredEvidence[] = [];
  try {
    const photoUrls: string[] = [];
    for (const file of photos) {
      const saved = await saveEvidenceFile(file.buffer);
      written.push({ ...saved, kind: 'photo' });
      photoUrls.push(saved.key);
    }
    const savedReceipt = await saveEvidenceFile(receipt[0].buffer);
    written.push({ ...savedReceipt, kind: 'receipt' });
    return { photoUrls, receiptUrl: savedReceipt.key, objects: written };
  } catch (error) {
    for (const item of written) await removeStoredFile(item.key);
    throw error;
  }
}
