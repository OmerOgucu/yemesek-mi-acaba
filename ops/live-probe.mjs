import { randomBytes } from 'crypto';
import { createRequire } from 'module';

const require = createRequire(new URL('../services/evidence/package.json', import.meta.url));
const { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');

const endpoint = process.env.S3_ENDPOINT?.trim();
const bucket = process.env.S3_BUCKET?.trim();
const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
if (!endpoint || !bucket || !accessKeyId || !secretAccessKey || /FILL_ME|CHANGE_ME/i.test(`${endpoint}${bucket}${accessKeyId}`)) {
  process.stdout.write('BLOCKED_EXTERNAL r2 credentials\n');
  process.exit(2);
}

const key = `preflight/${randomBytes(16).toString('hex')}.bin`;
const body = Buffer.from('yemesek-preflight');
const client = new S3Client({
  region: process.env.S3_REGION?.trim() || 'auto',
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: true,
});

try {
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, CacheControl: 'private, no-store' }));
  const read = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = await read.Body?.transformToByteArray();
  if (!bytes || Buffer.compare(Buffer.from(bytes), body) !== 0) throw new Error('read mismatch');
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  process.stdout.write('r2 probe ok\n');
} catch (error) {
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch {
    // The probe object may not exist.
  }
  process.stderr.write(`BLOCKED_EXTERNAL r2 probe failed: ${error instanceof Error ? error.name : 'error'}\n`);
  process.exit(2);
}

if (!process.env.BREVO_API_KEY?.trim() || /FILL_ME|CHANGE_ME/i.test(process.env.BREVO_API_KEY)) {
  process.stdout.write('BLOCKED_EXTERNAL brevo\n');
  process.exit(2);
}
process.stdout.write('brevo key present; delivery was not attempted\n');
