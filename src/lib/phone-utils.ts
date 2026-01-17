/**
 * Phone number utilities for Saudi Arabia format
 * Standard format: +9665XXXXXXXX (13 characters total)
 */

/**
 * Normalizes a phone number to Saudi international format: +9665XXXXXXXX
 * Handles ALL formats including the problematic double-zero case:
 * - +9660505399914 -> +966505399914 (removes extra 0 after country code)
 * - +966505399914 -> +966505399914 (already correct)
 * - 00966505399914 -> +966505399914
 * - 0505399914 -> +966505399914
 * - 505399914 -> +966505399914
 * - 05XXXXXXXX -> +9665XXXXXXXX
 * - 5XXXXXXXX -> +9665XXXXXXXX
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Remove leading + for processing
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // Handle different formats
  if (cleaned.startsWith('00966')) {
    // 009665XXXXXXXX or 009660XXXXXXXX -> remove 00
    cleaned = cleaned.substring(2);
  }
  
  // Now handle 966 prefix cases
  if (cleaned.startsWith('966')) {
    // Remove the 966 prefix to get the local number
    let localPart = cleaned.substring(3);
    
    // CRITICAL FIX: Remove leading 0 if present (handles +9660505... case)
    if (localPart.startsWith('0')) {
      localPart = localPart.substring(1);
    }
    
    // Rebuild with clean local number
    cleaned = '966' + localPart;
  } else if (cleaned.startsWith('05')) {
    // 05XXXXXXXX -> 9665XXXXXXXX (remove leading 0)
    cleaned = '966' + cleaned.substring(1);
  } else if (cleaned.startsWith('5') && cleaned.length === 9) {
    // 5XXXXXXXX -> 9665XXXXXXXX
    cleaned = '966' + cleaned;
  } else if (cleaned.length === 9 && /^\d{9}$/.test(cleaned)) {
    // 9 digits starting with 5
    if (cleaned.startsWith('5')) {
      cleaned = '966' + cleaned;
    }
  } else if (cleaned.startsWith('0') && cleaned.length === 10) {
    // 0XXXXXXXXX -> might be 05XXXXXXXX
    if (cleaned.charAt(1) === '5') {
      cleaned = '966' + cleaned.substring(1);
    }
  }
  
  // Validate final format: should be 9665XXXXXXXX (12 digits)
  if (cleaned.length === 12 && cleaned.startsWith('9665')) {
    return '+' + cleaned;
  }
  
  // If we can't normalize, return the original (stripped) or null
  return phone.trim() || null;
}

/**
 * Formats a phone number for display: +966 5X XXX XXXX
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return '-';
  
  // First normalize the phone
  const normalized = normalizePhone(phone);
  if (!normalized) return phone;
  
  // Remove the + for formatting
  const digits = normalized.replace('+', '');
  
  // Format: 966 5X XXX XXXX
  if (digits.length === 12 && digits.startsWith('966')) {
    const countryCode = digits.substring(0, 3);
    const firstTwo = digits.substring(3, 5);
    const middle = digits.substring(5, 8);
    const last = digits.substring(8, 12);
    return `+${countryCode} ${firstTwo} ${middle} ${last}`;
  }
  
  return phone;
}

/**
 * Extracts the 9-digit local number from a Saudi phone number
 * Returns: 5XXXXXXXX
 */
export function extractLocalNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  
  const normalized = normalizePhone(phone);
  if (!normalized) return '';
  
  // Remove +966 prefix
  const digits = normalized.replace('+966', '');
  return digits;
}

/**
 * Validates if a phone number is in valid Saudi format
 */
export function isValidSaudiPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  
  const normalized = normalizePhone(phone);
  if (!normalized) return false;
  
  // Must be +9665XXXXXXXX format (13 chars)
  return /^\+9665\d{8}$/.test(normalized);
}

/**
 * Builds a full Saudi phone number from local 9 digits
 */
export function buildSaudiPhone(localNumber: string): string | null {
  if (!localNumber) return null;
  
  // Clean the input
  const cleaned = localNumber.replace(/\D/g, '');
  
  // Handle if they included 0 prefix
  let digits = cleaned;
  if (digits.startsWith('0') && digits.length === 10) {
    digits = digits.substring(1);
  }
  
  // Must be 9 digits starting with 5
  if (digits.length === 9 && digits.startsWith('5')) {
    return '+966' + digits;
  }
  
  return null;
}
