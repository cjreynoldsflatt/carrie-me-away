import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.cdn-redfin.com' },
      { protocol: 'https', hostname: '**.rdcpix.com' },
      { protocol: 'https', hostname: '**.realtor.com' },
      { protocol: 'https', hostname: '**.redfin.com' },
    ],
  },
}

export default nextConfig
