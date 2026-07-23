import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    // Pin Turbopack to this package so a lockfile in a parent directory
    // is not mistaken for the workspace root.
    root: process.cwd(),
  },
};

export default nextConfig;
