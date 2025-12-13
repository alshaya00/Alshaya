/**
 * Environment Variable Validation
 * Call this at application startup to fail fast if required vars are missing
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

  // Required in all environments
  const required: string[] = [];

  // Required only in production
  const productionRequired = [
    'JWT_SECRET',
    'ENCRYPTION_SECRET',
    'NEXT_PUBLIC_BASE_URL',
  ];

  // Optional but recommended
  const recommended = [
    'NEXT_PUBLIC_SENTRY_DSN',
    'DATABASE_URL',
  ];

  // Check required variables
  for (const key of required) {
    if (!process.env[key]) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  // Check production-required variables
  if (isProduction) {
    for (const key of productionRequired) {
      if (!process.env[key]) {
        errors.push(`Missing required production environment variable: ${key}`);
      }
    }
  } else {
    // In development, warn about missing production variables
    for (const key of productionRequired) {
      if (!process.env[key]) {
        warnings.push(`Missing environment variable (required in production): ${key}`);
      }
    }
  }

  // Check recommended variables
  for (const key of recommended) {
    if (!process.env[key]) {
      warnings.push(`Missing recommended environment variable: ${key}`);
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
 * Throws if environment validation fails
 * Call this in production startup
 */
export function assertValidEnvironment(): void {
  const result = validateEnvironment();

  // Log warnings
  for (const warning of result.warnings) {
    console.warn(`⚠️ ENV WARNING: ${warning}`);
  }

  // Throw on errors
  if (!result.valid) {
    const errorMessage = [
      '❌ Environment validation failed:',
      ...result.errors.map(e => `  - ${e}`),
      '',
      'Please set the required environment variables and restart.',
    ].join('\n');

    throw new Error(errorMessage);
  }

  console.log('✅ Environment validation passed');
}
