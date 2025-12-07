// Password Hashing Utilities
import bcrypt from 'bcryptjs';

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
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const randomValues = new Uint8Array(length);

  // Use crypto.getRandomValues in browser, or fallback for Node
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < length; i++) {
      randomValues[i] = Math.floor(Math.random() * 256);
    }
  }

  for (let i = 0; i < length; i++) {
    token += chars[randomValues[i] % chars.length];
  }

  return token;
}

/**
 * Generate an invite code
 * Format: ALSHAYE-XXXX-XXXX
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (I, O, 0, 1)
  let code = 'ALSHAYE-';

  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  code += '-';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

/**
 * Generate a session token (longer, more secure)
 */
export function generateSessionToken(): string {
  return generateToken(64);
}
