/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  cleanDistDir: false,
  transpilePackages: [
    '@edu-platform/types',
    '@edu-platform/validators',
    '@edu-platform/database',
    '@edu-platform/supabase-client',
  ],
  experimental: {
    webpackBuildWorker: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

