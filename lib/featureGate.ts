import { PlanId, getPlan, PlanFeatures } from './pricing';

// Master switch: set to false when monetization goes live
export const BETA_MODE = true;

export interface FeatureAccessResult {
  allowed: boolean;
  reason?: string;
}

export interface UsageLimitResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

/**
 * Check if a user has access to a specific feature based on their plan.
 * During beta mode, all features are unlocked.
 */
export function checkFeatureAccess(
  userPlan: PlanId | undefined,
  feature: keyof PlanFeatures
): FeatureAccessResult {
  // During beta, everything is allowed
  if (BETA_MODE) {
    return { allowed: true };
  }

  const plan = getPlan(userPlan || 'free');
  const featureValue = plan.features[feature];

  if (typeof featureValue === 'boolean') {
    return featureValue
      ? { allowed: true }
      : { allowed: false, reason: `Upgrade to ${plan.name} or higher to access this feature.` };
  }

  // For numeric/string features, access is always allowed (limits checked separately)
  return { allowed: true };
}

/**
 * Check if a user is within their usage limits for a given metric.
 * During beta, uses beta_pro limits but still tracks usage.
 */
export function checkUsageLimit(
  userPlan: PlanId | undefined,
  limitKey: 'dailyAiChats' | 'dailyEvaluations' | 'mockTestsPerMonth',
  currentUsage: number
): UsageLimitResult {
  const effectivePlan = BETA_MODE ? 'beta_pro' : (userPlan || 'free');
  const plan = getPlan(effectivePlan);
  const limit = plan.features[limitKey] as number;

  // Unlimited
  if (limit === -1) {
    return { allowed: true, used: currentUsage, limit: -1, remaining: -1 };
  }

  const remaining = Math.max(0, limit - currentUsage);
  return {
    allowed: currentUsage < limit,
    used: currentUsage,
    limit,
    remaining,
  };
}

/**
 * Get the display label for the user's current plan status.
 */
export function getPlanStatusLabel(userPlan: PlanId | undefined): string {
  if (BETA_MODE) return 'Beta Pro — Free';
  const plan = getPlan(userPlan || 'free');
  return plan.name;
}

/**
 * Check if user is on a beta plan.
 */
export function isBetaUser(userPlan: PlanId | undefined): boolean {
  return BETA_MODE || userPlan === 'beta_pro';
}
