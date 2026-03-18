// Next.js Instrumentation - Runs once when the server starts
// See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

import { validateEnv } from './lib/validate-env';
import { validateProductionConfig } from './config/admin-config';

export async function register() {
  // Only validate on server startup (not during build)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('Starting server initialization...');

    try {
      // Validate environment variables using Zod schema
      validateEnv();
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        console.error('\nProduction environment validation failed!');
        console.error('Please set all required environment variables.');
        console.error('CRITICAL: Application starting with invalid configuration!');
      }
      // In development, validateEnv() already logged the issues
    }

    // In production, also validate admin config
    if (process.env.NODE_ENV === 'production') {
      const adminResult = validateProductionConfig();
      if (!adminResult.valid) {
        for (const error of adminResult.errors) {
          console.error(`ADMIN CONFIG ERROR: ${error}`);
        }
      }
    }

    console.log('Server initialization complete');
  }
}
