/**
 * Safe Storage Utility for Al-Shaye Family Tree Application
 * Provides error-safe localStorage operations with type safety
 */

import { logger } from '@/lib/logging';

/**
 * Safe localStorage wrapper that handles errors gracefully
 */
export const safeStorage = {
  /**
   * Get an item from localStorage with type safety and error handling
   * @param key - The storage key
   * @param fallback - Fallback value if key doesn't exist or parsing fails
   * @returns The parsed value or fallback
   */
  getItem<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;

    try {
      const item = localStorage.getItem(key);
      if (item === null) return fallback;
      return JSON.parse(item) as T;
    } catch (error) {
      logger.warn(`Failed to read from localStorage: ${key}`, {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return fallback;
    }
  },

  /**
   * Set an item in localStorage with error handling
   * @param key - The storage key
   * @param value - The value to store (will be JSON stringified)
   * @returns true if successful, false otherwise
   */
  setItem<T>(key: string, value: T): boolean {
    if (typeof window === 'undefined') return false;

    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.warn(`Failed to write to localStorage: ${key}`, {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  },

  /**
   * Remove an item from localStorage with error handling
   * @param key - The storage key
   * @returns true if successful, false otherwise
   */
  removeItem(key: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      logger.warn(`Failed to remove from localStorage: ${key}`, {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  },

  /**
   * Check if a key exists in localStorage
   * @param key - The storage key
   * @returns true if key exists, false otherwise
   */
  hasItem(key: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  },

  /**
   * Clear all items from localStorage
   * @returns true if successful, false otherwise
   */
  clear(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      localStorage.clear();
      return true;
    } catch (error) {
      logger.warn('Failed to clear localStorage', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  },

  /**
   * Get all keys from localStorage
   * @returns Array of keys or empty array on error
   */
  keys(): string[] {
    if (typeof window === 'undefined') return [];

    try {
      return Object.keys(localStorage);
    } catch {
      return [];
    }
  },

  /**
   * Get an item as a raw string (without JSON parsing)
   * @param key - The storage key
   * @returns The raw string value or null
   */
  getRaw(key: string): string | null {
    if (typeof window === 'undefined') return null;

    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  /**
   * Set an item as a raw string (without JSON stringifying)
   * @param key - The storage key
   * @param value - The string value to store
   * @returns true if successful, false otherwise
   */
  setRaw(key: string, value: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      logger.warn(`Failed to write raw to localStorage: ${key}`, {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  },
};

/**
 * Safe sessionStorage wrapper that handles errors gracefully
 */
export const safeSessionStorage = {
  /**
   * Get an item from sessionStorage with type safety and error handling
   */
  getItem<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;

    try {
      const item = sessionStorage.getItem(key);
      if (item === null) return fallback;
      return JSON.parse(item) as T;
    } catch (error) {
      logger.warn(`Failed to read from sessionStorage: ${key}`, {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return fallback;
    }
  },

  /**
   * Set an item in sessionStorage with error handling
   */
  setItem<T>(key: string, value: T): boolean {
    if (typeof window === 'undefined') return false;

    try {
      sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.warn(`Failed to write to sessionStorage: ${key}`, {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  },

  /**
   * Remove an item from sessionStorage with error handling
   */
  removeItem(key: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
      sessionStorage.removeItem(key);
      return true;
    } catch (error) {
      logger.warn(`Failed to remove from sessionStorage: ${key}`, {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  },

  /**
   * Get raw string value from sessionStorage
   */
  getRaw(key: string): string | null {
    if (typeof window === 'undefined') return null;

    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },

  /**
   * Set raw string value in sessionStorage
   */
  setRaw(key: string, value: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Clear all items from sessionStorage
   */
  clear(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      sessionStorage.clear();
      return true;
    } catch {
      return false;
    }
  },
};

export default safeStorage;
