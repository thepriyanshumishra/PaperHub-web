import User from '@/models/user';
import { logger } from '@/lib/logger';

type DailyUsageKey = 'aiChats' | 'evaluations';
type MonthlyUsageKey = 'mockTests';
type LifetimeUsageKey = 'totalSessions' | 'totalQuestionsSolved' | 'totalMockTests' | 'totalAiChats' | 'totalFeedbackSubmitted';

/**
 * Get today's date string in YYYY-MM-DD format.
 */
function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get current month string in YYYY-MM format.
 */
function getCurrentMonthStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Increment a daily usage counter for a user.
 * Automatically resets the counter if the date has changed.
 */
export async function incrementDailyUsage(
  userId: string,
  key: DailyUsageKey
): Promise<{ used: number }> {
  const todayStr = getTodayStr();

  // Use atomic findOneAndUpdate to handle race conditions
  // First, check if we need to reset (different date)
  const user = await User.findById(userId).select('usageMetrics');
  if (!user) {
    logger.warn('Cannot increment usage: user not found', userId);
    return { used: 0 };
  }

  const currentDate = user.usageMetrics?.daily?.date;
  if (currentDate !== todayStr) {
    // Reset daily counters for a new day
    await User.findByIdAndUpdate(userId, {
      $set: {
        'usageMetrics.daily.date': todayStr,
        'usageMetrics.daily.aiChats': key === 'aiChats' ? 1 : 0,
        'usageMetrics.daily.evaluations': key === 'evaluations' ? 1 : 0,
      },
    });
    return { used: 1 };
  }

  // Same day — increment atomically
  const updated = await User.findByIdAndUpdate(
    userId,
    { $inc: { [`usageMetrics.daily.${key}`]: 1 } },
    { new: true, select: 'usageMetrics.daily' }
  );

  return { used: updated?.usageMetrics?.daily?.[key] || 1 };
}

/**
 * Increment a monthly usage counter for a user.
 * Automatically resets the counter if the month has changed.
 */
export async function incrementMonthlyUsage(
  userId: string,
  key: MonthlyUsageKey
): Promise<{ used: number }> {
  const monthStr = getCurrentMonthStr();

  const user = await User.findById(userId).select('usageMetrics');
  if (!user) {
    logger.warn('Cannot increment monthly usage: user not found', userId);
    return { used: 0 };
  }

  const currentMonth = user.usageMetrics?.monthly?.month;
  if (currentMonth !== monthStr) {
    // Reset monthly counters
    await User.findByIdAndUpdate(userId, {
      $set: {
        'usageMetrics.monthly.month': monthStr,
        'usageMetrics.monthly.mockTests': key === 'mockTests' ? 1 : 0,
      },
    });
    return { used: 1 };
  }

  const updated = await User.findByIdAndUpdate(
    userId,
    { $inc: { [`usageMetrics.monthly.${key}`]: 1 } },
    { new: true, select: 'usageMetrics.monthly' }
  );

  return { used: updated?.usageMetrics?.monthly?.[key] || 1 };
}

/**
 * Increment a lifetime usage counter for a user.
 */
export async function incrementLifetimeUsage(
  userId: string,
  key: LifetimeUsageKey
): Promise<void> {
  await User.findByIdAndUpdate(userId, {
    $inc: { [`usageMetrics.lifetime.${key}`]: 1 },
  });
}

/**
 * Get current daily usage for a specific key.
 * Returns 0 if date has rolled over.
 */
export async function getDailyUsage(
  userId: string,
  key: DailyUsageKey
): Promise<number> {
  const user = await User.findById(userId).select('usageMetrics.daily');
  if (!user?.usageMetrics?.daily) return 0;
  if (user.usageMetrics.daily.date !== getTodayStr()) return 0;
  return user.usageMetrics.daily[key] || 0;
}

/**
 * Get current monthly usage for a specific key.
 * Returns 0 if month has rolled over.
 */
export async function getMonthlyUsage(
  userId: string,
  key: MonthlyUsageKey
): Promise<number> {
  const user = await User.findById(userId).select('usageMetrics.monthly');
  if (!user?.usageMetrics?.monthly) return 0;
  if (user.usageMetrics.monthly.month !== getCurrentMonthStr()) return 0;
  return user.usageMetrics.monthly[key] || 0;
}

/**
 * Get a full usage summary for a user (daily, monthly, lifetime).
 */
export async function getUserUsageSummary(userId: string) {
  const user = await User.findById(userId).select('usageMetrics plan');
  if (!user) return null;

  const todayStr = getTodayStr();
  const monthStr = getCurrentMonthStr();

  const daily = user.usageMetrics?.daily?.date === todayStr
    ? {
        aiChats: user.usageMetrics.daily.aiChats || 0,
        evaluations: user.usageMetrics.daily.evaluations || 0,
        date: todayStr,
      }
    : { aiChats: 0, evaluations: 0, date: todayStr };

  const monthly = user.usageMetrics?.monthly?.month === monthStr
    ? {
        mockTests: user.usageMetrics.monthly.mockTests || 0,
        month: monthStr,
      }
    : { mockTests: 0, month: monthStr };

  const lifetime = user.usageMetrics?.lifetime || {
    totalSessions: 0,
    totalQuestionsSolved: 0,
    totalMockTests: 0,
    totalAiChats: 0,
    totalFeedbackSubmitted: 0,
  };

  return { daily, monthly, lifetime, plan: user.plan || 'beta_pro' };
}
