import { randomBytes } from 'crypto';
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';

const endpoint = process.env.S3_ENDPOINT?.trim() ?? '';
const bucket = process.env.S3_BUCKET?.trim() ?? '';
const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim() ?? '';
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim() ?? '';
const filled = `${endpoint}${bucket}${accessKeyId}${secretAccessKey}`;
if (!endpoint || !bucket || !accessKeyId || !secretAccessKey || /FILL_ME|CHANGE_ME|change-me/i.test(filled)) {
  process.stdout.write('BLOCKED_EXTERNAL r2 credentials\n');
  process.exit(2);
}

const mailTo = readMailTo(process.argv.slice(2));
const key = `preflight/${randomBytes(16).toString('hex')}.bin`;
const body = Buffer.from('yemesek-preflight');
const client = new S3Client({
  region: process.env.S3_REGION?.trim() || 'auto',
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
});

try {
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, CacheControl: 'private, no-store' }));
  const read = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = await read.Body?.transformToByteArray();
  if (!bytes || Buffer.compare(Buffer.from(bytes), body) !== 0) throw new Error('read mismatch');
  const unsigned = await fetch(unsignedUrl(endpoint, bucket, key), { method: 'GET', signal: AbortSignal.timeout(10_000) });
  if (unsigned.status !== 401 && unsigned.status !== 403) {
    throw new Error(`unsigned status ${unsigned.status}`);
  }
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  process.stdout.write('r2_signed PASS\n');
  process.stdout.write('r2_unsigned_denied PASS\n');
  process.stdout.write('r2_app_read BLOCKED_EXTERNAL\n');
} catch (error) {
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch {
    // The probe object may already be gone.
  }
  process.stderr.write(`BLOCKED_EXTERNAL r2 probe failed: ${error instanceof Error ? error.name : 'error'}\n`);
  process.exit(2);
}

const brevoKey = process.env.BREVO_API_KEY?.trim() ?? '';
if (!brevoKey || /FILL_ME|CHANGE_ME|change-me/i.test(brevoKey)) {
  process.stdout.write('BLOCKED_EXTERNAL brevo\n');
  process.exit(2);
}
if (!mailTo) {
  process.stdout.write('brevo_key_present PASS\n');
  process.stdout.write('brevo_delivery BLOCKED_EXTERNAL\n');
  process.exit(0);
}
if (!/^[^\s@]+@[^\s@]+$/.test(mailTo)) {
  process.stderr.write('BLOCKED_EXTERNAL mail recipient\n');
  process.exit(2);
}
const sender = process.env.BREVO_SENDER_EMAIL?.trim() ?? '';
const response = await fetch(process.env.BREVO_API_URL?.trim() || 'https://api.brevo.com/v3/smtp/email', {
  method: 'POST',
  headers: { 'api-key': brevoKey, 'content-type': 'application/json', accept: 'application/json' },
  signal: AbortSignal.timeout(10_000),
  body: JSON.stringify({
    sender: { email: sender, name: process.env.BREVO_SENDER_NAME?.trim() || 'Yemesek' },
    to: [{ email: mailTo }],
    subject: 'Yemesek preflight',
    textContent: 'Bu, operatörün yetkilendirdiği tek denemedir.',
  }),
});
if (!response.ok) {
  process.stdout.write('brevo_accept FAIL\n');
  process.stdout.write('brevo_delivery BLOCKED_EXTERNAL\n');
  process.exit(2);
}
process.stdout.write('brevo_accept PASS\n');
process.stdout.write('brevo_delivery BLOCKED_EXTERNAL\n');

function readMailTo(argv) {
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--mail-to') return argv[i + 1] ?? '';
  }
  return '';
}

function unsignedUrl(endpointValue, bucketName, objectKey) {
  const url = new URL(endpointValue);
  const base = url.pathname.replace(/\/$/, '');
  url.pathname = `${base}/${bucketName}/${objectKey}`;
  url.search = '';
  url.username = '';
  url.password = '';
  return url;
}
