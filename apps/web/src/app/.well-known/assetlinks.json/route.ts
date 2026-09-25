import { NextResponse } from 'next/server';

export function GET() {
  const packageName = process.env.ANDROID_PACKAGE?.trim() ?? '';
  const fingerprints = (process.env.ANDROID_SHA256_CERT_FINGERPRINTS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => /^[0-9A-Fa-f:]+$/.test(item) && !/0{16}/.test(item.replace(/:/g, '')));
  if (!packageName || fingerprints.length === 0) {
    return new NextResponse(null, { status: 404 });
  }
  return NextResponse.json(
    [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: packageName,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300' } },
  );
}
