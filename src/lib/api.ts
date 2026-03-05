/**
 * Frontend fetch utility with:
 * - In-flight request deduplication (same URL+method returns existing promise)
 * - Simple response caching with configurable TTL
 * - AbortController support
 */

interface CacheEntry {
  data: any;
  timestamp: number;
}

const DEFAULT_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

const responseCache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, Promise<Response>>();

function getCacheKey(url: string, options?: RequestInit): string {
  const method = options?.method?.toUpperCase() || 'GET';
  // Only cache GET requests; POST/PUT/DELETE always go through
  if (method !== 'GET') return '';
  return `${method}:${url}`;
}

function getCached(key: string, ttl: number): any | null {
  if (!key) return null;
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttl) {
    responseCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any): void {
  if (!key) return;
  // Cap cache size
  if (responseCache.size > 200) {
    const oldest = responseCache.keys().next().value;
    if (oldest !== undefined) responseCache.delete(oldest);
  }
  responseCache.set(key, { data, timestamp: Date.now() });
}

export interface ApiFetchOptions extends RequestInit {
  /** Cache TTL in ms. Set to 0 to skip cache. Default: 2 min */
  cacheTTL?: number;
  /** If true, skip deduplication (for mutations) */
  skipDedup?: boolean;
}

/**
 * Deduplicated, cached fetch wrapper.
 * - GET requests are cached for `cacheTTL` ms (default 2 min)
 * - Concurrent identical GET requests share the same in-flight promise
 * - Pass an AbortSignal via `options.signal` for cleanup on unmount
 */
export async function apiFetch<T = any>(
  url: string,
  options?: ApiFetchOptions
): Promise<{ data: T; ok: boolean; status: number }> {
  const cacheTTL = options?.cacheTTL ?? DEFAULT_CACHE_TTL;
  const cacheKey = getCacheKey(url, options);

  // 1. Check response cache (GET only)
  const cached = getCached(cacheKey, cacheTTL);
  if (cached !== null) {
    return { data: cached as T, ok: true, status: 200 };
  }

  // 2. Deduplicate in-flight GET requests
  const isGet = !options?.method || options.method.toUpperCase() === 'GET';
  if (isGet && !options?.skipDedup && inflightRequests.has(cacheKey)) {
    try {
      const res = await inflightRequests.get(cacheKey)!.then(r => r.clone());
      const data = await res.json();
      return { data: data as T, ok: res.ok, status: res.status };
    } catch (err: any) {
      // Only propagate AbortError if the caller's own signal was aborted.
      // Otherwise, a stale dedup'd promise (e.g. from React StrictMode's
      // first mount being aborted) failed — fall through to a fresh fetch.
      if (err.name === 'AbortError' && options?.signal?.aborted) throw err;
    }
  }

  // 3. Make the real fetch
  const fetchPromise = fetch(url, options);

  // For dedup: store a clone promise so other callers can read independently
  if (isGet && cacheKey) {
    inflightRequests.set(cacheKey, fetchPromise.then(r => r.clone()));
  }

  try {
    const response = await fetchPromise;
    // Clone before reading body so the dedup clone isn't affected
    const data = await response.clone().json();

    // Cache successful GET responses
    if (response.ok && cacheKey) {
      setCache(cacheKey, data);
    }

    return { data: data as T, ok: response.ok, status: response.status };
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    return { data: null as T, ok: false, status: 0 };
  } finally {
    if (cacheKey) {
      inflightRequests.delete(cacheKey);
    }
  }
}

/** Invalidate a specific cached URL */
export function invalidateCache(url: string): void {
  const key = `GET:${url}`;
  responseCache.delete(key);
}

/** Invalidate all cached URLs matching a prefix */
export function invalidateCachePrefix(prefix: string): void {
  for (const key of responseCache.keys()) {
    if (key.includes(prefix)) {
      responseCache.delete(key);
    }
  }
}
