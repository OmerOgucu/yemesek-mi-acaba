import { NextResponse } from 'next/server';

export function GET() {
  const team = process.env.APPLE_TEAM_ID?.trim() ?? '';
  const bundle = process.env.IOS_BUNDLE_ID?.trim() ?? '';
  if (!/^[A-Z0-9]{10}$/.test(team) || !/^[a-zA-Z0-9.]+$/.test(bundle)) {
    return new NextResponse(null, { status: 404 });
  }
  return NextResponse.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appID: `${team}.${bundle}`,
            paths: ['/sifre-sifirla', '/dogrula', '/profil'],
          },
        ],
      },
    },
    { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300' } },
  );
}
