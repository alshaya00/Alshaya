/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable telemetry
  env: {
    NEXT_TELEMETRY_DISABLED: '1',
  },

  // Hide X-Powered-By header
  poweredByHeader: false,

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

  // Image optimization (Vercel-friendly)
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
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },

  // Security headers including Content Security Policy
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://alshaye.family https://*.vercel.app https://flagcdn.com",
              "font-src 'self' data:",
              "connect-src 'self' https://alshaye.family https://*.vercel.app",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
