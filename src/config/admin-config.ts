// Admin Configuration for Al-Shaye Family Tree
// Centralized admin defaults, access codes, and credentials
// IMPORTANT: Sensitive values should be overridden via environment variables in production

// ============================================
// ACCESS CODE CONFIGURATION
// ============================================

export const accessCodeConfig = {
  // Default access code - override via env in production
  defaultCode: process.env.NEXT_PUBLIC_ACCESS_CODE || 'alshaye2024',

  // Session duration for access code authentication (24 hours)
  sessionDurationMs: 24 * 60 * 60 * 1000,

  // Max login attempts before lockout
  maxAttempts: 5,

  // Default admin access code (for initial setup)
  defaultAdminCode: process.env.ADMIN_ACCESS_CODE || 'admin123',
} as const;

// ============================================
// DEFAULT ADMIN CREDENTIALS
// ============================================

export const defaultAdminConfig = {
  // Default super admin - MUST be set via env in production
  email: process.env.ADMIN_EMAIL || (process.env.NODE_ENV === 'production' ? '' : 'admin@alshaye.family'),
  password: process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'Admin@123456'),

  // Default admin display info
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
 * Generate a random token/code
 */
export function generateRandomCode(length: number = tokenConfig.accessCodeLength): string {
  const chars = tokenConfig.codeCharacters;
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a branch link token
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
      errors.push('NEXT_PUBLIC_ACCESS_CODE should be set in production');
    }
  }

  return { valid: errors.length === 0, errors };
}
