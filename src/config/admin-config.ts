// Admin Configuration for Al-Shaye Family Tree
// Centralized admin defaults, access codes, and credentials
// SECURITY: All sensitive values MUST be set via environment variables

import { randomBytes } from 'crypto';

// ============================================
// ACCESS CODE CONFIGURATION
// ============================================

export const accessCodeConfig = {
  // SECURITY: Access code MUST be set via environment variable
  // No default fallback - will be empty string if not set
  defaultCode: process.env.NEXT_PUBLIC_ACCESS_CODE || '',

  // Session duration for access code authentication (24 hours)
  sessionDurationMs: 24 * 60 * 60 * 1000,

  // Max login attempts before lockout
  maxAttempts: 5,

  // SECURITY: Admin access code MUST be set via environment variable
  defaultAdminCode: process.env.ADMIN_ACCESS_CODE || '',
} as const;

// ============================================
// DEFAULT ADMIN CREDENTIALS
// ============================================

export const defaultAdminConfig = {
  // SECURITY: Admin credentials MUST be set via environment variables
  // Empty strings in all environments if not set - require explicit configuration
  email: process.env.ADMIN_EMAIL || '',
  password: process.env.ADMIN_PASSWORD || '',

  // Default admin display info (non-sensitive)
  defaultAdmin: {
    id: 'admin_1',
    email: 'admin@alshaye.com',
    nameAr: 'المدير العام',
    nameEn: 'Super Admin',
    role: 'SUPER_ADMIN' as const,
  },
} as const;

// ============================================
// TOKEN & CODE GENERATION SETTINGS
// ============================================

export const tokenConfig = {
  // Branch link token length
  branchTokenLength: 12,

  // Admin access code length
  accessCodeLength: 8,

  // Characters allowed in generated codes
  codeCharacters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',

  // Token expiry defaults (in days)
  inviteExpiryDays: 7,
  resetTokenExpiryHours: 24,
} as const;

// ============================================
// RATE LIMITING CONFIGURATION
// ============================================

export const rateLimitConfig = {
  login: {
    maxAttempts: 5,
    windowMinutes: 15,
  },
  register: {
    maxAttempts: 3,
    windowMinutes: 60,
  },
  accessRequest: {
    maxAttempts: 5,
    windowMinutes: 60,
  },
  passwordReset: {
    maxAttempts: 3,
    windowMinutes: 60,
  },
  invite: {
    maxAttempts: 5,
    windowMinutes: 60,
  },
  // Cleanup interval for rate limit data
  cleanupIntervalMinutes: 5,
} as const;

// ============================================
// SESSION CONFIGURATION
// ============================================

export const sessionConfig = {
  // Default session duration (7 days)
  defaultDurationMs: 7 * 24 * 60 * 60 * 1000,
  defaultDurationDays: 7,

  // Remember me session duration (30 days)
  rememberMeDurationMs: 30 * 24 * 60 * 60 * 1000,
  rememberMeDurationDays: 30,
} as const;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * SECURITY: Generate a cryptographically secure random token/code
 * Uses crypto.randomBytes instead of Math.random for security
 */
export function generateRandomCode(length: number = tokenConfig.accessCodeLength): string {
  const chars = tokenConfig.codeCharacters;
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * Generate a cryptographically secure branch link token
 */
export function generateBranchToken(): string {
  return generateRandomCode(tokenConfig.branchTokenLength);
}

/**
 * Check if running in production without required env vars
 */
export function validateProductionConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.ADMIN_EMAIL) {
      errors.push('ADMIN_EMAIL environment variable is required in production');
    }
    if (!process.env.ADMIN_PASSWORD) {
      errors.push('ADMIN_PASSWORD environment variable is required in production');
    }
    if (!process.env.NEXT_PUBLIC_ACCESS_CODE) {
      errors.push('NEXT_PUBLIC_ACCESS_CODE environment variable is required in production');
    }
    if (!process.env.JWT_SECRET) {
      errors.push('JWT_SECRET environment variable is required in production');
    }
    if (!process.env.ENCRYPTION_SECRET) {
      errors.push('ENCRYPTION_SECRET environment variable is required in production');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Assert that production configuration is valid
 * Throws if any required env vars are missing
 */
export function assertValidProductionConfig(): void {
  const result = validateProductionConfig();
  if (!result.valid) {
    const message = [
      '❌ Production configuration validation failed:',
      ...result.errors.map(e => `  - ${e}`),
      '',
      'Please set all required environment variables.',
    ].join('\n');
    throw new Error(message);
  }
}
