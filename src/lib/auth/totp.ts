// TOTP (Time-based One-Time Password) implementation for 2FA
import crypto from 'crypto';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// Generate a random secret for 2FA
export function generateTOTPSecret(length: number = 20): string {
  const bytes = crypto.randomBytes(length);
  let secret = '';

  for (let i = 0; i < bytes.length; i++) {
    secret += BASE32_CHARS[bytes[i] % 32];
  }

  return secret;
}

// Convert base32 to buffer
function base32ToBuffer(base32: string): Buffer {
  const cleanedInput = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const bits: number[] = [];

  for (const char of cleanedInput) {
    const val = BASE32_CHARS.indexOf(char);
    for (let i = 4; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | bits[i + j];
    }
    bytes.push(byte);
  }

  return Buffer.from(bytes);
}

// Generate TOTP code
export function generateTOTP(secret: string, timestamp?: number): string {
  const time = timestamp || Date.now();
  const counter = Math.floor(time / 30000); // 30-second window

  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const secretBuffer = base32ToBuffer(secret);
  const hmac = crypto.createHmac('sha1', secretBuffer);
  hmac.update(counterBuffer);
  const hash = hmac.digest();

  const offset = hash[hash.length - 1] & 0x0f;
  const code = (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  ) % 1000000;

  return code.toString().padStart(6, '0');
}

// Verify TOTP code with time window tolerance
export function verifyTOTP(secret: string, code: string, window: number = 1): boolean {
  const now = Date.now();

  // Check current time and adjacent windows
  for (let i = -window; i <= window; i++) {
    const timestamp = now + (i * 30000);
    const expectedCode = generateTOTP(secret, timestamp);

    if (expectedCode === code) {
      return true;
    }
  }

  return false;
}

// Generate QR code URL for authenticator apps
export function generateTOTPUri(
  secret: string,
  email: string,
  issuer: string = 'Al-Shaye Family Tree'
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);

  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

// Generate backup codes
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }

  return codes;
}

// Hash backup code for storage
export function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code.toUpperCase().replace(/-/g, '')).digest('hex');
}

// Verify backup code
export function verifyBackupCode(code: string, hashedCodes: string[]): { valid: boolean; usedIndex: number } {
  const hashedInput = hashBackupCode(code);
  const index = hashedCodes.findIndex(hashed => hashed === hashedInput);

  return {
    valid: index !== -1,
    usedIndex: index,
  };
}
