import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';

const client = new S3Client({
  region: 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

for (const bucket of ['yemesek-evidence', 'yemesek-backups']) {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}
process.stdout.write('ci buckets ready\n');
