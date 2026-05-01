import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // Prevent Node-only packages from being bundled by webpack into client chunks
  serverExternalPackages: ['sharp', 'fluent-ffmpeg'],
};

export default nextConfig;
