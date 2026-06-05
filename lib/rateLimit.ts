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
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
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
//
// Limits are enforced per-process (in-memory). In multi-process deployments,
// each process has its own counter — total usage could be N×limit.
// For production at scale, use Redis-backed counters.

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
export function checkAiEvalQuota(userId: string): QuotaCheckResult {
  const now = Date.now();

  // 1. Burst check: max 10 eval requests per minute
  const burstKey = `ai_eval_burst:${userId}`;
  if (isRateLimited(burstKey, AI_BURST_LIMIT_PER_MINUTE, ONE_MINUTE_MS)) {
    const record = ratesStore.get(burstKey)!;
    return {
      allowed: false,
      used: record.count,
      limit: AI_BURST_LIMIT_PER_MINUTE,
      retryAfterMs: Math.max(0, record.resetTime - now),
    };
  }

  // 2. Daily quota check
  const dailyKey = `ai_eval_daily:${userId}`;
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
export function checkAiChatQuota(userId: string): QuotaCheckResult {
  const now = Date.now();

  // 1. Burst check: max 10 chat requests per minute
  const burstKey = `ai_chat_burst:${userId}`;
  if (isRateLimited(burstKey, AI_BURST_LIMIT_PER_MINUTE, ONE_MINUTE_MS)) {
    const record = ratesStore.get(burstKey)!;
    return {
      allowed: false,
      used: record.count,
      limit: AI_BURST_LIMIT_PER_MINUTE,
      retryAfterMs: Math.max(0, record.resetTime - now),
    };
  }

  // 2. Daily quota check
  const dailyKey = `ai_chat_daily:${userId}`;
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
export function getAiQuotaUsage(userId: string): {
  evalUsed: number; evalLimit: number;
  chatUsed: number; chatLimit: number;
} {
  const now = Date.now();

  const evalRecord = ratesStore.get(`ai_eval_daily:${userId}`);
  const chatRecord = ratesStore.get(`ai_chat_daily:${userId}`);

  const evalUsed = evalRecord && evalRecord.resetTime > now ? evalRecord.count : 0;
  const chatUsed = chatRecord && chatRecord.resetTime > now ? chatRecord.count : 0;

  return {
    evalUsed,
    evalLimit: AI_EVAL_DAILY_LIMIT,
    chatUsed,
    chatLimit: AI_CHAT_DAILY_LIMIT,
  };
}

