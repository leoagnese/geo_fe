import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Amplify-compatible: no standalone output to avoid edge runtime issues
  // Images: default loader (no custom image optimizer needed for MVP)
  images: {
    remotePatterns: [],
  },
  // Strict mode for React dev warnings
  reactStrictMode: true,
}

export default nextConfig
