/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@edu-platform/types',
    '@edu-platform/validators',
    '@edu-platform/database',
    '@edu-platform/supabase-client',
  ],
};

export default nextConfig;
