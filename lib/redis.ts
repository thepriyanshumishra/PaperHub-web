import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;
let redis: Redis | null = null;

if (REDIS_URL) {
  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
      connectTimeout: 3000, // 3 seconds timeout
      retryStrategy(times) {
        if (times > 2) {
          console.warn("[Redis] Connection attempts exhausted. Running in fallback mode.");
          return null; // Stop retrying
        }
        return 1000; // Retry after 1 second
      },
    });

    redis.on("error", (err) => {
      // Catch connection errors silently without throwing uncaught exceptions
      console.warn("[Redis] Connection error details:", err.message);
    });
  } catch (err) {
    console.error("[Redis] Initialization failed:", err);
  }
} else {
  console.log("[Redis] REDIS_URL environment variable is missing. Caching is disabled.");
}

export { redis };

/**
 * Soft-Failover Cache Wrapper.
 * If Redis is offline or throws errors, it gracefully falls back to the database execution.
 */
export async function getOrSetCache<T>(
  key: string,
  factory: () => Promise<T>,
  ttlSeconds = 3600
): Promise<T> {
  if (!redis) {
    return await factory();
  }

  // 1. Try to read from Redis
  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (readErr) {
    console.warn(`[Redis] Read failure for key "${key}":`, readErr);
  }

  // 2. Fetch fresh data on cache miss or read error
  const freshData = await factory();

  // 3. Try writing fresh data back to Redis asynchronously
  try {
    await redis.set(key, JSON.stringify(freshData), "EX", ttlSeconds);
  } catch (writeErr) {
    console.warn(`[Redis] Write failure for key "${key}":`, writeErr);
  }

  return freshData;
}

/**
 * Safely delete a key from Redis.
 */
export async function invalidateCache(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (err) {
    console.warn(`[Redis] Invalidation failed for key "${key}":`, err);
  }
}

/**
 * Safely delete all keys matching a pattern.
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    let cursor = "0";
    do {
      const [newCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = newCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch (err) {
    console.warn(`[Redis] Pattern invalidation failed for "${pattern}":`, err);
  }
}
