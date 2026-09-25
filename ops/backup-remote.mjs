import { createReadStream, writeFileSync } from 'fs';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const [action, localPath, objectKey] = process.argv.slice(2);
const bucket = required('BACKUP_S3_BUCKET');
const endpoint = required('BACKUP_S3_ENDPOINT');
const client = new S3Client({
  region: process.env.BACKUP_S3_REGION?.trim() || 'auto',
  endpoint,
  credentials: {
    accessKeyId: required('BACKUP_S3_ACCESS_KEY_ID'),
    secretAccessKey: required('BACKUP_S3_SECRET_ACCESS_KEY'),
  },
  forcePathStyle: true,
});

if (action === 'put') {
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: objectKey, Body: createReadStream(localPath) }));
  process.stdout.write('backup remote put ok\n');
} else if (action === 'get') {
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: objectKey }));
  if (!response.Body) throw new Error('empty');
  const bytes = await response.Body.transformToByteArray();
  writeFileSync(localPath, Buffer.from(bytes), { mode: 0o600 });
  process.stdout.write('backup remote get ok\n');
} else {
  process.stderr.write('backup remote action missing\n');
  process.exit(1);
}

function required(name) {
  const value = process.env[name]?.trim() ?? '';
  if (!value || /FILL_ME|CHANGE_ME|change-me/i.test(value)) {
    process.stderr.write(`backup remote missing ${name}\n`);
    process.exit(1);
  }
  return value;
}
