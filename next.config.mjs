/** @type {import('next').NextConfig} */
const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH ??
  (process.env.NODE_ENV === 'production' ? '/admin' : '');

const nextConfig = {
  output: 'standalone',
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
