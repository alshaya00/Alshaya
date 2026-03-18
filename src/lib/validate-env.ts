import { z } from 'zod';

// ===========================================
// Environment Variable Schema
// ===========================================

const envSchema = z.object({
  // --- Database (Required) ---
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // --- Authentication & Security ---
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').optional(),
  ENCRYPTION_SECRET: z.string().min(32, 'ENCRYPTION_SECRET must be at least 32 characters').optional(),
  ENCRYPTION_SALT: z.string().optional(),
  SESSION_DURATION_DAYS: z.coerce.number().int().positive().default(7),
  REMEMBER_ME_DURATION_DAYS: z.coerce.number().int().positive().default(30),

  // --- Admin Account ---
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  ADMIN_ACCESS_CODE: z.string().optional(),

  // --- Access Control ---
  NEXT_PUBLIC_ACCESS_CODE: z.string().optional(),

  // --- Application URLs ---
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_BASE_URL: z.string().url().default('http://localhost:3000'),

  // --- Node Environment ---
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // --- Email Service ---
  EMAIL_PROVIDER: z.enum(['resend', 'sendgrid', 'mailgun', 'smtp', 'none']).default('none'),
  EMAIL_FROM_ADDRESS: z.string().optional(),
  EMAIL_FROM_NAME: z.string().default('Al-Shaye Family Tree'),
  RESEND_API_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  MAILGUN_API_KEY: z.string().optional(),
  MAILGUN_DOMAIN: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: z.string().transform((v) => v !== 'false').optional(),

  // --- SMS / OTP Service ---
  OTP_PROVIDER: z.enum(['twilio', 'vonage', 'messagebird', 'none']).default('none'),
  OTP_FROM_NUMBER: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional(),
  VONAGE_API_KEY: z.string().optional(),
  VONAGE_API_SECRET: z.string().optional(),
  MESSAGEBIRD_API_KEY: z.string().optional(),

  // --- OAuth Providers ---
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // --- Google Services (export features) ---
  GOOGLE_ACCESS_TOKEN: z.string().optional(),
  GOOGLE_CLIENT_EMAIL: z.string().optional(),
  GOOGLE_PRIVATE_KEY: z.string().optional(),

  // --- GitHub Backup ---
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_ACCESS_TOKEN: z.string().optional(),

  // --- External Storage ---
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_S3_REGION: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // --- Redis ---
  REDIS_URL: z.string().url().optional(),

  // --- Development / Testing ---
  TEST_MODE: z.string().transform((v) => v === 'true').default('false'),

  // --- Sync Scripts ---
  PRODUCTION_DATABASE_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

// ===========================================
// Production Refinements
// ===========================================

const productionSchema = envSchema.superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production') {
    if (!data.JWT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'JWT_SECRET is required in production',
        path: ['JWT_SECRET'],
      });
    }
    if (!data.ENCRYPTION_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'ENCRYPTION_SECRET is required in production',
        path: ['ENCRYPTION_SECRET'],
      });
    }
    if (!data.ADMIN_EMAIL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'ADMIN_EMAIL is required in production',
        path: ['ADMIN_EMAIL'],
      });
    }
    if (!data.ADMIN_PASSWORD) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'ADMIN_PASSWORD is required in production',
        path: ['ADMIN_PASSWORD'],
      });
    }
    if (!data.NEXT_PUBLIC_ACCESS_CODE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'NEXT_PUBLIC_ACCESS_CODE is required in production',
        path: ['NEXT_PUBLIC_ACCESS_CODE'],
      });
    }

    // Validate email provider has its required API key
    if (data.EMAIL_PROVIDER === 'resend' && !data.RESEND_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'RESEND_API_KEY is required when EMAIL_PROVIDER is "resend"',
        path: ['RESEND_API_KEY'],
      });
    }
    if (data.EMAIL_PROVIDER === 'sendgrid' && !data.SENDGRID_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'SENDGRID_API_KEY is required when EMAIL_PROVIDER is "sendgrid"',
        path: ['SENDGRID_API_KEY'],
      });
    }
    if (data.EMAIL_PROVIDER === 'mailgun' && (!data.MAILGUN_API_KEY || !data.MAILGUN_DOMAIN)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'MAILGUN_API_KEY and MAILGUN_DOMAIN are required when EMAIL_PROVIDER is "mailgun"',
        path: ['MAILGUN_API_KEY'],
      });
    }
    if (data.EMAIL_PROVIDER === 'smtp' && !data.SMTP_HOST) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'SMTP_HOST is required when EMAIL_PROVIDER is "smtp"',
        path: ['SMTP_HOST'],
      });
    }

    // Validate OTP provider has its required credentials
    if (data.OTP_PROVIDER === 'twilio' && (!data.TWILIO_ACCOUNT_SID || !data.TWILIO_AUTH_TOKEN)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required when OTP_PROVIDER is "twilio"',
        path: ['TWILIO_ACCOUNT_SID'],
      });
    }
    if (data.OTP_PROVIDER === 'vonage' && (!data.VONAGE_API_KEY || !data.VONAGE_API_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'VONAGE_API_KEY and VONAGE_API_SECRET are required when OTP_PROVIDER is "vonage"',
        path: ['VONAGE_API_KEY'],
      });
    }
    if (data.OTP_PROVIDER === 'messagebird' && !data.MESSAGEBIRD_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'MESSAGEBIRD_API_KEY is required when OTP_PROVIDER is "messagebird"',
        path: ['MESSAGEBIRD_API_KEY'],
      });
    }
  }
});

// ===========================================
// Cached validated env
// ===========================================

let _cachedEnv: Env | null = null;

// ===========================================
// Public API
// ===========================================

/**
 * Validate all environment variables against the schema.
 * Throws in production if required vars are missing.
 * Logs warnings in development.
 */
export function validateEnv(): Env {
  if (_cachedEnv) return _cachedEnv;

  const result = productionSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.flatten();
    const fieldErrors = formatted.fieldErrors;
    const formErrors = formatted.formErrors;

    console.error('\n--- Environment Validation Failed ---');

    if (formErrors.length > 0) {
      for (const err of formErrors) {
        console.error(`  - ${err}`);
      }
    }

    for (const [field, errors] of Object.entries(fieldErrors)) {
      if (errors && errors.length > 0) {
        console.error(`  ${field}: ${errors.join(', ')}`);
      }
    }

    console.error('------------------------------------\n');

    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid environment configuration. Check .env file and fix the errors above.');
    } else {
      console.warn('Continuing with invalid env in development mode...');
      // In dev, parse with base schema (no production refinements) to get defaults
      const devResult = envSchema.safeParse(process.env);
      if (devResult.success) {
        _cachedEnv = devResult.data;
        return _cachedEnv;
      }
      // If even the base schema fails, we have a critical issue (e.g., missing DATABASE_URL)
      throw new Error('Critical environment variables missing. Check DATABASE_URL and other required vars.');
    }
  }

  console.log('Environment validation passed');
  _cachedEnv = result.data;
  return _cachedEnv;
}

/**
 * Validates environment and logs results.
 * Backwards-compatible wrapper for existing code that calls assertValidEnvironment().
 */
export function assertValidEnvironment(): void {
  validateEnv();
}

/**
 * Get a validated environment variable with a fallback.
 */
export function getEnvWithFallback(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

/**
 * Generate a secure random string for secrets.
 */
export function generateSecureSecret(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
  } else {
    for (let i = 0; i < length; i++) {
      randomValues[i] = Math.floor(Math.random() * 256);
    }
  }

  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }

  return result;
}
