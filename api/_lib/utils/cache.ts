/**
 * Shared server-side cache with ETag support and configurable TTL.
 * Replaces the duplicated cache logic in api.controller and user.controller.
 */

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  etag?: string;
}

class ServerCache {
  private store = new Map<string, CacheEntry>();
  private defaultTTL: number;
  private maxEntries: number;

  constructor(defaultTTL = 2 * 60 * 1000, maxEntries = 500) {
    this.defaultTTL = defaultTTL;
    this.maxEntries = maxEntries;
  }

  get<T = any>(key: string, ttl?: number): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    const effectiveTTL = ttl ?? this.defaultTTL;
    if (Date.now() - entry.timestamp > effectiveTTL) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T = any>(key: string, data: T, etag?: string): void {
    // Evict oldest entries if at capacity
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }
    this.store.set(key, { data, timestamp: Date.now(), etag });
  }

  getEtag(key: string): string | undefined {
    return this.store.get(key)?.etag;
  }

  /** Return cached data even if expired (for use with 304 responses) */
  getStale<T = any>(key: string): T | null {
    const entry = this.store.get(key);
    return entry ? (entry.data as T) : null;
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }
}

/** Shared cache instance for all controllers — 2 min default TTL */
export const serverCache = new ServerCache(2 * 60 * 1000, 500);

/** Long-lived cache for data that changes infrequently (e.g. trending) — 15 min TTL */
export const longCache = new ServerCache(15 * 60 * 1000, 100);
