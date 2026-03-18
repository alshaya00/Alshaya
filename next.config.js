/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable telemetry
  env: {
    NEXT_TELEMETRY_DISABLED: '1',
  },

  // Enforce ESLint during builds
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Enforce TypeScript checks during builds
  typescript: {
    ignoreBuildErrors: false,
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
