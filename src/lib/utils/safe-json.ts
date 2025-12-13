/**
 * Safe JSON parsing utilities to prevent runtime crashes
 * All JSON.parse operations should use these functions
 */

/**
 * Safely parse JSON string with fallback value
 * Prevents runtime crashes from malformed JSON in database
 */
export function safeJsonParse<T>(
  jsonString: string | null | undefined,
  fallback: T,
  logError: boolean = true
): T {
  if (!jsonString) return fallback;

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    if (logError) {
      console.error(
        '[JSON Parse Error] Failed to parse:',
        jsonString.substring(0, 100),
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
    return fallback;
  }
}

/**
 * Safely parse JSON array
 */
export function safeJsonParseArray<T>(
  jsonString: string | null | undefined,
  logError: boolean = true
): T[] {
  return safeJsonParse<T[]>(jsonString, [], logError);
}

/**
 * Safely parse JSON object
 */
export function safeJsonParseObject<T extends Record<string, unknown>>(
  jsonString: string | null | undefined,
  logError: boolean = true
): T {
  return safeJsonParse<T>(jsonString, {} as T, logError);
}

/**
 * Safely stringify JSON with error handling
 */
export function safeJsonStringify(
  value: unknown,
  fallback: string = '{}',
  logError: boolean = true
): string {
  try {
    return JSON.stringify(value);
  } catch (error) {
    if (logError) {
      console.error(
        '[JSON Stringify Error] Failed to stringify value:',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
    return fallback;
  }
}
