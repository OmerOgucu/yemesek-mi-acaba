import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  transpilePackages: ['@yemesek/legal'],
};

export default nextConfig;
