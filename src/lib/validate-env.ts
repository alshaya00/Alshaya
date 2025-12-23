/**
 * Environment Variable Validation - Replit Compatible
 *
 * This module validates environment variables at startup.
 * On Replit, some variables are auto-set (DATABASE_URL) while others
 * need to be configured in Secrets.
 */

interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';
  const isReplit = !!process.env.REPL_ID;

  // Required in all environments (critical for app to function)
  const required: string[] = ['DATABASE_URL'];

  // Required only in production (security-critical)
  const productionRequired = [
    'JWT_SECRET',
    'ENCRYPTION_SECRET',
  ];

  // Recommended but not required
  const recommended = [
    'NEXT_PUBLIC_BASE_URL',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD',
  ];

  // Check required variables
  for (const key of required) {
    if (!process.env[key]) {
      if (isReplit && key === 'DATABASE_URL') {
        errors.push(`${key} not set. Make sure PostgreSQL is attached to your Replit.`);
      } else {
        errors.push(`Missing required environment variable: ${key}`);
      }
    }
  }

  // Check production-required variables
  if (isProduction) {
    for (const key of productionRequired) {
      if (!process.env[key]) {
        if (isReplit) {
          // On Replit, warn but don't block
          warnings.push(`${key} not set in Secrets. Using auto-generated fallback.`);
        } else {
          errors.push(`Missing required production environment variable: ${key}`);
        }
      }
    }
  } else {
    // In development, just warn
    for (const key of productionRequired) {
      if (!process.env[key]) {
        warnings.push(`${key} not set (required in production)`);
      }
    }
  }

  // Check recommended variables
  for (const key of recommended) {
    if (!process.env[key]) {
      warnings.push(`Recommended: Set ${key} in Replit Secrets`);
    }
  }

  // Validate specific values
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters for security');
  }

  if (process.env.ENCRYPTION_SECRET && process.env.ENCRYPTION_SECRET.length < 32) {
    warnings.push('ENCRYPTION_SECRET should be at least 32 characters for security');
  }

  if (process.env.NEXT_PUBLIC_BASE_URL) {
    try {
      new URL(process.env.NEXT_PUBLIC_BASE_URL);
    } catch {
      errors.push('NEXT_PUBLIC_BASE_URL must be a valid URL');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates environment and logs results
 * Replit-compatible: Does NOT throw - allows app to start with warnings
 */
export function assertValidEnvironment(): void {
  const result = validateEnvironment();
  const isReplit = !!process.env.REPL_ID;

  // Log warnings (only in development or if there are issues)
  if (result.warnings.length > 0 && process.env.NODE_ENV !== 'production') {
    console.log('\n⚠️  Environment warnings:');
    for (const warning of result.warnings) {
      console.warn(`   - ${warning}`);
    }
  }

  // Handle errors
  if (!result.valid) {
    console.log('\n❌ Environment validation issues:');
    for (const error of result.errors) {
      console.error(`   - ${error}`);
    }

    // On Replit, don't throw - allow graceful degradation
    if (isReplit) {
      console.log('\n⚠️  Running on Replit with missing config. Some features may not work.');
    } else if (process.env.NODE_ENV === 'production') {
      throw new Error('Environment validation failed. Set required variables and restart.');
    }
  } else {
    console.log('✅ Environment validation passed');
  }
}

/**
 * Get environment variable with fallback
 * Useful for generating defaults in Replit
 */
export function getEnvWithFallback(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

/**
 * Generate a secure random string for secrets
 */
export function generateSecureSecret(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
  } else {
    // Fallback for Node.js
    for (let i = 0; i < length; i++) {
      randomValues[i] = Math.floor(Math.random() * 256);
    }
  }

  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }

  return result;
}
