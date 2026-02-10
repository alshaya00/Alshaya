// Server-only admin config utilities
// WARNING: This file uses Node.js 'crypto' and must NOT be imported by client components.
// Client code should import config constants from './admin-config' instead.

import { randomBytes } from 'crypto';
import { tokenConfig } from './admin-config';

export function generateRandomCode(length: number = tokenConfig.accessCodeLength): string {
  const chars = tokenConfig.codeCharacters;
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

export function generateBranchToken(): string {
  return generateRandomCode(tokenConfig.branchTokenLength);
}
