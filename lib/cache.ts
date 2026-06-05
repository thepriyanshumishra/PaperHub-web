/**
 * cache.ts
 *
 * Lightweight in-process Time-To-Live (TTL) cache for expensive read queries.
 *
 * RATIONALE:
 *   Leaderboard rankings, study recommendations, and admin metric aggregations
 *   involve multi-collection MongoDB aggregations that are expensive at scale.
 *   These results change slowly (minutes to hours), not per-request.
 *   An in-memory cache eliminates redundant DB round-trips without adding Redis.
 *
 * LIMITATIONS:
 *   - Memory only: cache is per-process. In multi-process/serverless deployments,
 *     each instance has its own cache (acceptable for beta scale).
 *   - Not shared across Next.js hot-reloads in development.
 *   - Not suitable for user-specific highly sensitive data (auth tokens, etc.).
 *
 * USAGE:
 *   import { ttlCache } from '@/lib/cache';
 *
 *   const result = await ttlCache.getOrSet('leaderboard:university:user123', async () => {
 *     return await expensiveDbQuery();
 *   }, 60_000); // cache for 60 seconds
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class TTLCache {
  private store: Map<string, CacheEntry<unknown>> = new Map();
  private readonly cleanupIntervalMs: number;
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(cleanupIntervalMs = 5 * 60 * 1000) {
    this.cleanupIntervalMs = cleanupIntervalMs;
    // Start periodic cleanup to prevent memory leaks in long-running processes
    if (typeof window === 'undefined') {
      this.cleanupTimer = setInterval(() => this.evictExpired(), this.cleanupIntervalMs);
      // Allow process to exit even if this timer is running
      this.cleanupTimer?.unref?.();
    }
  }

  /**
   * Get a cached value, or compute and cache it if missing / expired.
   *
   * @param key     Unique cache key
   * @param factory Async function to compute the value on cache miss
   * @param ttlMs   Time-to-live in milliseconds (default: 60 seconds)
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs = 60_000): Promise<T> {
    const now = Date.now();
    const entry = this.store.get(key) as CacheEntry<T> | undefined;

    if (entry && entry.expiresAt > now) {
      return entry.value;
    }

    // Cache miss or expired — compute fresh value
    const value = await factory();
    this.store.set(key, { value, expiresAt: now + ttlMs });
    return value;
  }

  /**
   * Forcefully invalidate a cache key (use after writes that affect cached data).
   */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix.
   * Useful for invalidating all leaderboard scopes at once.
   *
   * @example ttlCache.invalidatePrefix('leaderboard:')
   */
  invalidatePrefix(prefix: string): void {
    for (const key of Array.from(this.store.keys())) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Remove all expired entries to free memory.
   */
  evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of Array.from(this.store.entries())) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get current cache size (for monitoring).
   */
  size(): number {
    return this.store.size;
  }

  /**
   * Clear the entire cache (for testing).
   */
  clear(): void {
    this.store.clear();
  }
}

// Singleton cache instance shared across all Next.js API routes in the same process.
// Using a global to survive hot-reloads in development.
declare global {
  // eslint-disable-next-line no-var
  var __paperhubTtlCache: TTLCache | undefined;
}

export const ttlCache: TTLCache =
  global.__paperhubTtlCache ?? (global.__paperhubTtlCache = new TTLCache());

// Export TTL constants for consistent cache durations across routes
export const CACHE_TTL = {
  LEADERBOARD_MS: 2 * 60 * 1000,        // 2 minutes — leaderboard rankings
  RECOMMENDATIONS_MS: 5 * 60 * 1000,    // 5 minutes — study recommendations
  PLATFORM_STATS_MS: 3 * 60 * 1000,     // 3 minutes — admin analytics
  MONITORING_METRICS_MS: 60 * 1000,     // 1 minute  — system monitoring
} as const;
