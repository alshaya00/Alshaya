/** @type {import('next').NextConfig} */
const nextConfig = {
  // Replit deployment: standalone output for smaller deployments
  output: 'standalone',

  // Disable telemetry
  env: {
    NEXT_TELEMETRY_DISABLED: '1',
  },

  // Empty experimental block - Replit recommended
  experimental: {},

  // Enable SWC minification for smaller bundles
  swcMinify: true,

  // Image optimization - Replit recommended minimal config
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'alshaye.family',
      },
      {
        protocol: 'https',
        hostname: '*.replit.dev',
      },
      {
        protocol: 'https',
        hostname: '*.repl.co',
      },
    ],
    unoptimized: false,
  },

  // Required for Replit proxy
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
