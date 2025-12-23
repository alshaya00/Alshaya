/** @type {import('next').NextConfig} */
const nextConfig = {
  // Replit deployment: standalone output for smaller deployments
  output: 'standalone',

  // Empty experimental block - Replit recommended
  experimental: {},

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
  },
};

module.exports = nextConfig;
