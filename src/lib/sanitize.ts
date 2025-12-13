/**
 * Comprehensive input sanitization utilities
 * Handles XSS prevention, special character escaping, and SQL injection prevention
 */

// HTML entities map for encoding
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

// Reverse map for decoding
const HTML_ENTITIES_REVERSE: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#39;': "'",
  '&#x2F;': '/',
  '&#x60;': '`',
  '&#x3D;': '=',
  '&nbsp;': ' ',
};

/**
 * Escapes HTML special characters to prevent XSS attacks
 * Use this when displaying user input in HTML context
 */
export function escapeHtml(input: string): string {
  if (!input) return '';
  return input.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Decodes HTML entities back to their original characters
 * Use this when you need to process encoded data
 */
export function decodeHtml(input: string): string {
  if (!input) return '';
  return input.replace(
    /&(amp|lt|gt|quot|#x27|#39|#x2F|#x60|#x3D|nbsp);/gi,
    (match) => HTML_ENTITIES_REVERSE[match.toLowerCase()] || match
  );
}

/**
 * Removes all HTML tags from input
 * Preserves text content between tags
 */
export function stripHtmlTags(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags with content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove style tags with content
    .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
    .replace(/<[^>]*>/g, ''); // Remove all HTML tags
}

/**
 * Sanitizes string input for safe storage and display
 * Removes HTML tags and escapes special characters
 */
export function sanitizeString(input: string | null | undefined): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== 'string') return null;

  return stripHtmlTags(input)
    .replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char)
    .trim();
}

/**
 * Sanitizes string for use in URLs
 * Encodes special URL characters
 */
export function sanitizeUrl(input: string): string {
  if (!input) return '';
  try {
    // Check if it's a valid URL
    const url = new URL(input);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return '';
    }
    return url.href;
  } catch {
    // Not a valid URL
    return encodeURIComponent(input);
  }
}

/**
 * Sanitizes input for use in SQL LIKE queries
 * Escapes SQL wildcard characters
 */
export function sanitizeSqlLike(input: string): string {
  if (!input) return '';
  return input
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

/**
 * Sanitizes filename to prevent path traversal attacks
 */
export function sanitizeFilename(input: string): string {
  if (!input) return '';
  return input
    .replace(/\.\./g, '') // Prevent directory traversal
    .replace(/[/\\:*?"<>|]/g, '_') // Replace invalid filename characters
    .replace(/^\.+/, '') // Remove leading dots
    .trim();
}

/**
 * Sanitizes JSON string to prevent injection
 */
export function sanitizeJson(input: string): string {
  if (!input) return '';
  try {
    // Parse and re-stringify to ensure valid JSON
    const parsed = JSON.parse(input);
    return JSON.stringify(parsed);
  } catch {
    // Not valid JSON, escape it
    return escapeHtml(input);
  }
}

/**
 * Validates and sanitizes email address
 */
export function sanitizeEmail(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim().toLowerCase();
  // Basic email validation regex
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
  if (!emailRegex.test(trimmed)) {
    return null;
  }
  return trimmed;
}

/**
 * Validates and sanitizes phone number
 * Keeps only digits and common phone characters
 */
export function sanitizePhone(input: string): string | null {
  if (!input) return null;
  // Remove all characters except digits, +, -, (, ), and spaces
  const cleaned = input.replace(/[^\d+\-() ]/g, '').trim();
  // Must have at least 7 digits
  const digitCount = (cleaned.match(/\d/g) || []).length;
  if (digitCount < 7) return null;
  return cleaned;
}

/**
 * Sanitizes Arabic text while preserving Arabic characters
 * Removes HTML but keeps Arabic letters, numbers, and common punctuation
 */
export function sanitizeArabicText(input: string | null | undefined): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== 'string') return null;

  return stripHtmlTags(input)
    // Keep Arabic characters, Arabic numbers, Latin characters, common punctuation, and whitespace
    .replace(/[^\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\u0660-\u0669a-zA-Z0-9\s.,!?؟،؛:\-()'"]/g, '')
    .trim();
}

/**
 * Comprehensive sanitization for form input
 * Returns sanitized object with all string fields processed
 */
export function sanitizeFormData<T extends Record<string, unknown>>(data: T): T {
  const result = { ...data };

  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'string') {
      if (key.toLowerCase().includes('email')) {
        (result as Record<string, unknown>)[key] = sanitizeEmail(value);
      } else if (key.toLowerCase().includes('phone')) {
        (result as Record<string, unknown>)[key] = sanitizePhone(value);
      } else if (key.toLowerCase().includes('url') || key.toLowerCase().includes('link')) {
        (result as Record<string, unknown>)[key] = sanitizeUrl(value);
      } else if (key.toLowerCase().includes('ar') || key.toLowerCase().includes('arabic')) {
        (result as Record<string, unknown>)[key] = sanitizeArabicText(value);
      } else {
        (result as Record<string, unknown>)[key] = sanitizeString(value);
      }
    }
  }

  return result;
}

/**
 * Validates that input doesn't contain potentially dangerous patterns
 */
export function validateSafeInput(input: string): { safe: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for script injection
  if (/<script/i.test(input)) {
    issues.push('Contains script tags');
  }

  // Check for event handlers
  if (/on\w+\s*=/i.test(input)) {
    issues.push('Contains event handlers');
  }

  // Check for javascript: URLs
  if (/javascript:/i.test(input)) {
    issues.push('Contains javascript: protocol');
  }

  // Check for data: URLs that might contain scripts
  if (/data:text\/html/i.test(input)) {
    issues.push('Contains data:text/html protocol');
  }

  // Check for SQL injection patterns
  if (/('|"|;|--|\/\*|\*\/|xp_|exec|execute|insert|select|delete|update|drop|create|alter|truncate)/i.test(input)) {
    issues.push('Contains potential SQL injection pattern');
  }

  return {
    safe: issues.length === 0,
    issues,
  };
}
