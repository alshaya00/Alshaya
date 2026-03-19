// In-memory cache with TTL for frequently accessed data
const cache = new Map<string, { data: unknown; expires: number }>();

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCached(key: string, data: unknown, ttlMs: number): void {
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

export function invalidateCache(key: string): void {
  cache.delete(key);
}

export function invalidateCachePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
