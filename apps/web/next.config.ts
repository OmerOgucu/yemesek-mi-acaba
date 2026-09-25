import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  transpilePackages: ['@yemesek/legal'],
};

export default nextConfig;
