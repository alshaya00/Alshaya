// Password Hashing Utilities
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string, minLength: number = 8): {
  valid: boolean;
  errors: { en: string; ar: string }[];
} {
  const errors: { en: string; ar: string }[] = [];

  if (password.length < minLength) {
    errors.push({
      en: `Password must be at least ${minLength} characters`,
      ar: `يجب أن تكون كلمة المرور ${minLength} أحرف على الأقل`,
    });
  }

  if (!/[A-Z]/.test(password)) {
    errors.push({
      en: 'Password must contain at least one uppercase letter',
      ar: 'يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل',
    });
  }

  if (!/[a-z]/.test(password)) {
    errors.push({
      en: 'Password must contain at least one lowercase letter',
      ar: 'يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل',
    });
  }

  if (!/[0-9]/.test(password)) {
    errors.push({
      en: 'Password must contain at least one number',
      ar: 'يجب أن تحتوي كلمة المرور على رقم واحد على الأقل',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a cryptographically secure random token
 * Uses Node.js crypto.randomBytes (secure)
 */
export function generateToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';

  // Use Node.js crypto.randomBytes for secure random generation
  const bytes = randomBytes(length);

  for (let i = 0; i < length; i++) {
    token += chars[bytes[i] % chars.length];
  }

  return token;
}

/**
 * Generate a cryptographically secure invite code
 * Format: ALSHAYE-XXXX-XXXX (uses crypto.randomBytes instead of Math.random)
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (I, O, 0, 1)
  let code = 'ALSHAYE-';

  // Use cryptographically secure random bytes
  const bytes = randomBytes(8);
  for (let i = 0; i < 4; i++) {
    code += chars[bytes[i] % chars.length];
  }
  code += '-';
  for (let i = 4; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }

  return code;
}

/**
 * Generate a session token (longer, more secure)
 */
export function generateSessionToken(): string {
  return generateToken(64);
}
