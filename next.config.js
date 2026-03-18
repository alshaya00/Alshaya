/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable telemetry
  env: {
    NEXT_TELEMETRY_DISABLED: '1',
  },

  // TODO: Fix ESLint errors then set to false
  eslint: {
    ignoreDuringBuilds: true,
  },

  // TODO: Fix TypeScript errors then set to false
  // Temporarily allowing build errors to unblock deployment
  typescript: {
    ignoreBuildErrors: true,
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '30mb',
    },
  },

  // Enable SWC minification for smaller bundles
  swcMinify: true,

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'alshaye.family',
      },
      {
        protocol: 'https',
        hostname: '*.vercel.app',
      },
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
      },
    ],
    unoptimized: false,
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
