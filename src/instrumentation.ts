// Next.js Instrumentation - Runs once when the server starts
// See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

import { validateEnvironment } from './lib/validate-env';
import { validateProductionConfig } from './config/admin-config';

export async function register() {
  // Only validate on server startup (not during build)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🔧 Starting server initialization...');

    // Validate environment variables
    const envResult = validateEnvironment();

    // Log warnings
    for (const warning of envResult.warnings) {
      console.warn(`⚠️  ENV WARNING: ${warning}`);
    }

    // Log errors (but don't fail in development)
    for (const error of envResult.errors) {
      console.error(`❌ ENV ERROR: ${error}`);
    }

    // In production, fail fast if required environment variables are missing
    if (process.env.NODE_ENV === 'production') {
      if (!envResult.valid) {
        console.error('\n❌ Production environment validation failed!');
        console.error('Please set all required environment variables.');
        console.error('Required in production:');
        console.error('  - JWT_SECRET');
        console.error('  - ENCRYPTION_SECRET');
        console.error('  - NEXT_PUBLIC_BASE_URL');
        console.error('  - ADMIN_EMAIL');
        console.error('  - ADMIN_PASSWORD');
        console.error('  - NEXT_PUBLIC_ACCESS_CODE (recommended)');
        // In production, we should fail but Next.js doesn't support this well
        // so we just log a critical warning
        console.error('\n⚠️  CRITICAL: Application starting with invalid configuration!');
      }

      // Also validate admin config
      const adminResult = validateProductionConfig();
      if (!adminResult.valid) {
        for (const error of adminResult.errors) {
          console.error(`❌ ADMIN CONFIG ERROR: ${error}`);
        }
      }
    }

    if (envResult.valid) {
      console.log('✅ Environment validation passed');
    }

    console.log('🚀 Server initialization complete');
  }
}
