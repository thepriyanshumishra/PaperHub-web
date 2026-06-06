import { redis } from './redis';

// Memory store to track request rates by key (IP or user ID)
const ratesStore = new Map<string, { count: number; resetTime: number }>();

// Clean up expired entries every 5 minutes to prevent memory leaks
if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now();
    ratesStore.forEach((record, key) => {
      if (now > record.resetTime) {
        ratesStore.delete(key);
      }
    });
  }, 5 * 60 * 1000).unref?.();
}

/**
 * Checks if a request rate-limits the caller.
 *
 * @param key Unique key to identify the caller (e.g. IP or userId + endpoint)
 * @param limit Maximum number of allowed requests in the window
 * @param windowMs Time window in milliseconds
 * @returns true if rate limited, false otherwise
 */
export async function isRateLimited(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (redis) {
    try {
      const redisKey = `paperhub:ratelimit:${key}`;
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.pexpire(redisKey, windowMs);
      } else {
        const ttl = await redis.pttl(redisKey);
        if (ttl < 0) {
          await redis.pexpire(redisKey, windowMs);
        }
      }
      return count > limit;
    } catch (err) {
      console.warn(`[rateLimit] Redis rate limit check failed for key "${key}", falling back to in-memory:`, err);
    }
  }

  const now = Date.now();
  const record = ratesStore.get(key);

  if (!record) {
    ratesStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return false;
  }

  if (now > record.resetTime) {
    // Reset window
    record.count = 1;
    record.resetTime = now + windowMs;
    return false;
  }

  record.count += 1;
  return record.count > limit;
}

// ─── AI-specific per-user Groq quota limits ───────────────────────────────────
//
// These limits throttle individual Groq API usage to:
//   1. Prevent a single rogue user from exhausting the Groq API quota
//   2. Provide a foundation for future plan-based enforcement
//
// During beta: limits are generous — designed to stop abuse, not normal use.
// When monetization goes live, replace with featureGate.ts checkUsageLimit().

/** Per-user max AI vision evaluations in a rolling 24-hour window (beta limit) */
const AI_EVAL_DAILY_LIMIT = 50;

/** Per-user max AI chat messages in a rolling 24-hour window (beta limit) */
const AI_CHAT_DAILY_LIMIT = 100;

/** Per-user max AI requests in a rolling 60-second burst window */
const AI_BURST_LIMIT_PER_MINUTE = 10;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;

export interface QuotaCheckResult {
  allowed: boolean;
  /** Current usage count in this window */
  used: number;
  /** Maximum allowed in this window */
  limit: number;
  /** Milliseconds until the window resets (0 if allowed) */
  retryAfterMs: number;
}

/**
 * Check and increment per-user AI evaluation quota.
 * Blocks if the user has exceeded their daily evaluation limit.
 *
 * @param userId Firebase UID of the requesting user
 */
export async function checkAiEvalQuota(userId: string): Promise<QuotaCheckResult> {
  const now = Date.now();

  // 1. Burst check: max 10 eval requests per minute
  const burstKey = `ai_eval_burst:${userId}`;
  const burstLimited = await isRateLimited(burstKey, AI_BURST_LIMIT_PER_MINUTE, ONE_MINUTE_MS);
  if (burstLimited) {
    let resetTime = now + ONE_MINUTE_MS;
    let count = AI_BURST_LIMIT_PER_MINUTE + 1;
    if (redis) {
      try {
        const redisKey = `paperhub:ratelimit:${burstKey}`;
        const ttl = await redis.pttl(redisKey);
        if (ttl > 0) {
          resetTime = now + ttl;
        }
        const val = await redis.get(redisKey);
        if (val) {
          count = parseInt(val, 10);
        }
      } catch (err) {
        const record = ratesStore.get(burstKey);
        if (record) {
          resetTime = record.resetTime;
          count = record.count;
        }
      }
    } else {
      const record = ratesStore.get(burstKey);
      if (record) {
        resetTime = record.resetTime;
        count = record.count;
      }
    }
    return {
      allowed: false,
      used: count,
      limit: AI_BURST_LIMIT_PER_MINUTE,
      retryAfterMs: Math.max(0, resetTime - now),
    };
  }

  // 2. Daily quota check
  const dailyKey = `ai_eval_daily:${userId}`;

  if (redis) {
    try {
      const redisKey = `paperhub:quota:${dailyKey}`;
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.pexpire(redisKey, ONE_DAY_MS);
      } else {
        const ttl = await redis.pttl(redisKey);
        if (ttl < 0) {
          await redis.pexpire(redisKey, ONE_DAY_MS);
        }
      }

      const exceeded = count > AI_EVAL_DAILY_LIMIT;
      let ttl = ONE_DAY_MS;
      const currentTtl = await redis.pttl(redisKey);
      if (currentTtl > 0) {
        ttl = currentTtl;
      }
      return {
        allowed: !exceeded,
        used: count,
        limit: AI_EVAL_DAILY_LIMIT,
        retryAfterMs: exceeded ? ttl : 0,
      };
    } catch (err) {
      console.warn(`[rateLimit] Redis daily eval quota check failed, falling back to in-memory:`, err);
    }
  }

  // Fallback to in-memory daily check
  const record = ratesStore.get(dailyKey);

  if (!record) {
    ratesStore.set(dailyKey, { count: 1, resetTime: now + ONE_DAY_MS });
    return { allowed: true, used: 1, limit: AI_EVAL_DAILY_LIMIT, retryAfterMs: 0 };
  }

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + ONE_DAY_MS;
    return { allowed: true, used: 1, limit: AI_EVAL_DAILY_LIMIT, retryAfterMs: 0 };
  }

  record.count += 1;
  const exceeded = record.count > AI_EVAL_DAILY_LIMIT;
  return {
    allowed: !exceeded,
    used: record.count,
    limit: AI_EVAL_DAILY_LIMIT,
    retryAfterMs: exceeded ? Math.max(0, record.resetTime - now) : 0,
  };
}

/**
 * Check and increment per-user AI chat quota.
 * Blocks if the user has exceeded their daily chat message limit.
 *
 * @param userId Firebase UID of the requesting user
 */
export async function checkAiChatQuota(userId: string): Promise<QuotaCheckResult> {
  const now = Date.now();

  // 1. Burst check: max 10 chat requests per minute
  const burstKey = `ai_chat_burst:${userId}`;
  const burstLimited = await isRateLimited(burstKey, AI_BURST_LIMIT_PER_MINUTE, ONE_MINUTE_MS);
  if (burstLimited) {
    let resetTime = now + ONE_MINUTE_MS;
    let count = AI_BURST_LIMIT_PER_MINUTE + 1;
    if (redis) {
      try {
        const redisKey = `paperhub:ratelimit:${burstKey}`;
        const ttl = await redis.pttl(redisKey);
        if (ttl > 0) {
          resetTime = now + ttl;
        }
        const val = await redis.get(redisKey);
        if (val) {
          count = parseInt(val, 10);
        }
      } catch (err) {
        const record = ratesStore.get(burstKey);
        if (record) {
          resetTime = record.resetTime;
          count = record.count;
        }
      }
    } else {
      const record = ratesStore.get(burstKey);
      if (record) {
        resetTime = record.resetTime;
        count = record.count;
      }
    }
    return {
      allowed: false,
      used: count,
      limit: AI_BURST_LIMIT_PER_MINUTE,
      retryAfterMs: Math.max(0, resetTime - now),
    };
  }

  // 2. Daily quota check
  const dailyKey = `ai_chat_daily:${userId}`;

  if (redis) {
    try {
      const redisKey = `paperhub:quota:${dailyKey}`;
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.pexpire(redisKey, ONE_DAY_MS);
      } else {
        const ttl = await redis.pttl(redisKey);
        if (ttl < 0) {
          await redis.pexpire(redisKey, ONE_DAY_MS);
        }
      }

      const exceeded = count > AI_CHAT_DAILY_LIMIT;
      let ttl = ONE_DAY_MS;
      const currentTtl = await redis.pttl(redisKey);
      if (currentTtl > 0) {
        ttl = currentTtl;
      }
      return {
        allowed: !exceeded,
        used: count,
        limit: AI_CHAT_DAILY_LIMIT,
        retryAfterMs: exceeded ? ttl : 0,
      };
    } catch (err) {
      console.warn(`[rateLimit] Redis daily chat quota check failed, falling back to in-memory:`, err);
    }
  }

  // Fallback to in-memory daily check
  const record = ratesStore.get(dailyKey);

  if (!record) {
    ratesStore.set(dailyKey, { count: 1, resetTime: now + ONE_DAY_MS });
    return { allowed: true, used: 1, limit: AI_CHAT_DAILY_LIMIT, retryAfterMs: 0 };
  }

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + ONE_DAY_MS;
    return { allowed: true, used: 1, limit: AI_CHAT_DAILY_LIMIT, retryAfterMs: 0 };
  }

  record.count += 1;
  const exceeded = record.count > AI_CHAT_DAILY_LIMIT;
  return {
    allowed: !exceeded,
    used: record.count,
    limit: AI_CHAT_DAILY_LIMIT,
    retryAfterMs: exceeded ? Math.max(0, record.resetTime - now) : 0,
  };
}

/**
 * Get current quota usage for a user (read-only, no increment).
 * Used for monitoring/admin dashboards.
 */
export async function getAiQuotaUsage(userId: string): Promise<{
  evalUsed: number; evalLimit: number;
  chatUsed: number; chatLimit: number;
}> {
  const now = Date.now();

  let evalUsed = 0;
  let chatUsed = 0;

  if (redis) {
    try {
      const evalVal = await redis.get(`paperhub:quota:ai_eval_daily:${userId}`);
      if (evalVal) {
        evalUsed = parseInt(evalVal, 10);
      }
      const chatVal = await redis.get(`paperhub:quota:ai_chat_daily:${userId}`);
      if (chatVal) {
        chatUsed = parseInt(chatVal, 10);
      }
      return {
        evalUsed,
        evalLimit: AI_EVAL_DAILY_LIMIT,
        chatUsed,
        chatLimit: AI_CHAT_DAILY_LIMIT,
      };
    } catch (err) {
      console.warn(`[rateLimit] Redis quota usage lookup failed, falling back to in-memory:`, err);
    }
  }

  const evalRecord = ratesStore.get(`ai_eval_daily:${userId}`);
  const chatRecord = ratesStore.get(`ai_chat_daily:${userId}`);

  evalUsed = evalRecord && evalRecord.resetTime > now ? evalRecord.count : 0;
  chatUsed = chatRecord && chatRecord.resetTime > now ? chatRecord.count : 0;

  return {
    evalUsed,
    evalLimit: AI_EVAL_DAILY_LIMIT,
    chatUsed,
    chatLimit: AI_CHAT_DAILY_LIMIT,
  };
}
