// Plan types
export type PlanId = 'free' | 'plus' | 'pro' | 'institution' | 'beta_pro';

export interface PlanFeatures {
  solutionsAccess: 'limited' | 'full' | 'unlimited';
  dailyHints: number;         // -1 = unlimited
  dailyAiChats: number;       // -1 = unlimited
  dailyEvaluations: number;   // -1 = unlimited
  mockTestsPerMonth: number;  // -1 = unlimited
  questionBankAccess: 'limited' | 'full';
  studyRecommendations: boolean;
  exportReports: boolean;
  prioritySupport: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  price: number;  // INR per month, 0 = free, -1 = contact us
  features: PlanFeatures;
  badge?: string;
  highlighted?: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Get started with essential PYQ practice tools',
    price: 0,
    features: {
      solutionsAccess: 'unlimited',
      dailyHints: 5,
      dailyAiChats: 10,
      dailyEvaluations: 0,
      mockTestsPerMonth: 2,
      questionBankAccess: 'limited',
      studyRecommendations: false,
      exportReports: false,
      prioritySupport: false,
    },
    badge: '',
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    description: 'Enhanced limits and basic AI evaluation for your handwritten papers',
    price: 99,
    features: {
      solutionsAccess: 'unlimited',
      dailyHints: 25,
      dailyAiChats: 30,
      dailyEvaluations: 5,
      mockTestsPerMonth: 10,
      questionBankAccess: 'full',
      studyRecommendations: true,
      exportReports: false,
      prioritySupport: false,
    },
    badge: '',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Unlock the full PaperHub experience for serious exam preparation',
    price: 499,
    features: {
      solutionsAccess: 'unlimited',
      dailyHints: -1,
      dailyAiChats: -1,
      dailyEvaluations: 25,
      mockTestsPerMonth: -1,
      questionBankAccess: 'full',
      studyRecommendations: true,
      exportReports: true,
      prioritySupport: false,
    },
    badge: '',
    highlighted: true,
  },
  institution: {
    id: 'institution',
    name: 'Institution',
    description: 'Custom deployment for universities and coaching centers',
    price: -1,
    features: {
      solutionsAccess: 'unlimited',
      dailyHints: -1,
      dailyAiChats: -1,
      dailyEvaluations: -1,
      mockTestsPerMonth: -1,
      questionBankAccess: 'full',
      studyRecommendations: true,
      exportReports: true,
      prioritySupport: true,
    },
    badge: '',
  },
  beta_pro: {
    id: 'beta_pro',
    name: 'Beta Pro',
    description: 'Full Pro access during the beta period — completely free',
    price: 0,
    features: {
      solutionsAccess: 'unlimited',
      dailyHints: -1,
      dailyAiChats: -1,
      dailyEvaluations: 25,
      mockTestsPerMonth: -1,
      questionBankAccess: 'full',
      studyRecommendations: true,
      exportReports: true,
      prioritySupport: false,
    },
    badge: '',
  },
};

export const PLAN_ORDER: PlanId[] = ['free', 'plus', 'pro', 'institution'];

export function getPlan(planId: PlanId): Plan {
  return PLANS[planId] || PLANS.beta_pro;
}

export function getPlanLimit(planId: PlanId, featureKey: keyof PlanFeatures): number | boolean | string {
  const plan = getPlan(planId);
  return plan.features[featureKey];
}

export function isUnlimited(value: number): boolean {
  return value === -1;
}

// Feature display labels for the pricing page
export const FEATURE_LABELS: { key: keyof PlanFeatures; label: string; format: 'number' | 'boolean' | 'text' }[] = [
  { key: 'solutionsAccess', label: 'Verified Solutions', format: 'text' },
  { key: 'dailyHints', label: 'AI Hints / Day', format: 'number' },
  { key: 'dailyAiChats', label: 'Ask AI Messages / Day', format: 'number' },
  { key: 'dailyEvaluations', label: 'AI Copy Evaluations', format: 'number' },
  { key: 'mockTestsPerMonth', label: 'Mock Tests / Month', format: 'number' },
  { key: 'questionBankAccess', label: 'Question Bank Access', format: 'text' },
  { key: 'studyRecommendations', label: 'AI Study Recommendations', format: 'boolean' },
  { key: 'exportReports', label: 'Export Reports (PDF)', format: 'boolean' },
];

export function formatFeatureValue(value: number | boolean | string): string {
  if (typeof value === 'boolean') return value ? '✓' : '—';
  if (typeof value === 'string') {
    if (value === 'unlimited') return 'Unlimited';
    if (value === 'limited') return 'Last 2 Years';
    if (value === 'full') return 'All Years';
    return value;
  }
  if (value === -1) return 'Unlimited';
  return String(value);
}

// Dynamic importance calculator (from Phase F requirements)
export function getQuestionImportance(question: {
  repetitionFrequency?: number;
  lastAppearedYear?: number;
  sourcePaperCount?: number;
}): 'high' | 'medium' | 'low' {
  const freq = question.repetitionFrequency || 0;
  const lastYear = question.lastAppearedYear || 0;
  const currentYear = new Date().getFullYear();
  const yearsSinceLast = currentYear - lastYear;

  // High: freq >= 3 OR (appeared in last 2 years AND freq >= 2)
  if (freq >= 3) return 'high';
  if (yearsSinceLast <= 2 && freq >= 2) return 'high';

  // Medium: freq == 2
  if (freq === 2) return 'medium';

  // Low: everything else
  return 'low';
}
