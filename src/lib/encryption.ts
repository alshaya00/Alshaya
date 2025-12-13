/**
 * Encryption utilities for sensitive data (API keys, secrets, etc.)
 * Uses AES-256-GCM for authenticated encryption
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

// Encryption algorithm
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;

// Get encryption key from environment - FAIL FAST if not configured
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || process.env.JWT_SECRET;

  // SECURITY: Fail immediately if secrets not configured in production
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL: ENCRYPTION_SECRET or JWT_SECRET must be set in production. ' +
        'Generate with: openssl rand -base64 32'
      );
    }
    // Allow development with warning
    console.warn(
      '⚠️ WARNING: Using default encryption key. ' +
      'Set ENCRYPTION_SECRET or JWT_SECRET for production!'
    );
  }

  const effectiveSecret = secret || 'dev-only-secret-not-for-production';
  const salt = process.env.ENCRYPTION_SALT || 'family-tree-salt';
  return scryptSync(effectiveSecret, salt, KEY_LENGTH);
}

/**
 * Encrypts sensitive data using AES-256-GCM
 * Returns base64 encoded string: salt:iv:authTag:encryptedData
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return '';

  try {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const salt = randomBytes(SALT_LENGTH);

    // Derive a unique key for this encryption using the salt
    const derivedKey = scryptSync(key, salt, KEY_LENGTH);

    const cipher = createCipheriv(ALGORITHM, derivedKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Combine salt, iv, authTag, and encrypted data
    const combined = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, 'base64'),
    ]);

    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts data encrypted with the encrypt function
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return '';

  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    // Derive the key using the same salt
    const derivedKey = scryptSync(key, salt, KEY_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypts an API key and returns a masked version for display
 */
export function encryptApiKey(apiKey: string): { encrypted: string; masked: string } {
  if (!apiKey) {
    return { encrypted: '', masked: '' };
  }

  const encrypted = encrypt(apiKey);

  // Create masked version for display (show first 4 and last 4 characters)
  let masked: string;
  if (apiKey.length <= 8) {
    masked = '*'.repeat(apiKey.length);
  } else {
    masked = apiKey.substring(0, 4) + '*'.repeat(apiKey.length - 8) + apiKey.substring(apiKey.length - 4);
  }

  return { encrypted, masked };
}

/**
 * Decrypts an encrypted API key
 */
export function decryptApiKey(encryptedKey: string): string {
  if (!encryptedKey) return '';
  return decrypt(encryptedKey);
}

/**
 * Validates if a string looks like an encrypted value from this module
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;

  try {
    const decoded = Buffer.from(value, 'base64');
    // Minimum length: salt (32) + iv (16) + authTag (16) + at least 1 byte of data
    return decoded.length > SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH;
  } catch {
    return false;
  }
}

/**
 * Rotates encryption by decrypting with old key and encrypting with new key
 * Used when ENCRYPTION_SECRET needs to be changed
 */
export function rotateEncryption(encryptedData: string, oldSecret: string, newSecret: string): string {
  if (!encryptedData) return '';

  try {
    // Temporarily use old secret to decrypt
    const originalSecret = process.env.ENCRYPTION_SECRET;
    process.env.ENCRYPTION_SECRET = oldSecret;
    const decrypted = decrypt(encryptedData);

    // Use new secret to encrypt
    process.env.ENCRYPTION_SECRET = newSecret;
    const reEncrypted = encrypt(decrypted);

    // Restore original
    process.env.ENCRYPTION_SECRET = originalSecret;

    return reEncrypted;
  } catch (error) {
    console.error('Key rotation error:', error);
    throw new Error('Failed to rotate encryption key');
  }
}

/**
 * Generates a secure random string suitable for use as an API key
 */
export function generateApiKey(prefix: string = 'sk', length: number = 32): string {
  const randomPart = randomBytes(length).toString('base64url').substring(0, length);
  return `${prefix}_${randomPart}`;
}

/**
 * Hashes an API key for storage (one-way, for verification only)
 */
export function hashApiKey(apiKey: string): string {
  const salt = process.env.ENCRYPTION_SALT || 'family-tree-salt';
  return scryptSync(apiKey, salt, 32).toString('hex');
}

/**
 * Verifies an API key against its hash
 */
export function verifyApiKeyHash(apiKey: string, hash: string): boolean {
  const newHash = hashApiKey(apiKey);
  return newHash === hash;
}

/**
 * Encrypts multiple fields in an object
 */
export function encryptFields<T extends Record<string, unknown>>(
  data: T,
  fieldsToEncrypt: string[]
): T {
  const result = { ...data };

  for (const field of fieldsToEncrypt) {
    const value = result[field];
    if (typeof value === 'string' && value) {
      (result as Record<string, unknown>)[field] = encrypt(value);
    }
  }

  return result;
}

/**
 * Decrypts multiple fields in an object
 */
export function decryptFields<T extends Record<string, unknown>>(
  data: T,
  fieldsToDecrypt: string[]
): T {
  const result = { ...data };

  for (const field of fieldsToDecrypt) {
    const value = result[field];
    if (typeof value === 'string' && value && isEncrypted(value)) {
      try {
        (result as Record<string, unknown>)[field] = decrypt(value);
      } catch {
        // If decryption fails, leave the value as-is
        console.warn(`Failed to decrypt field: ${field}`);
      }
    }
  }

  return result;
}
