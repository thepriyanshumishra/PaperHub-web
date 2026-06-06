import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { requireAuthorizedUser } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';
import { getUserUsageSummary } from '@/lib/usageTracker';
import { checkUsageLimit } from '@/lib/featureGate';
import { PlanId } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthorizedUser(req);
    if (errorResponse) return errorResponse;

    await dbConnect();

    const summary = await getUserUsageSummary(user._id);
    if (!summary) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Add limit checks
    const plan = summary.plan as PlanId;
    const aiChatsLimit = checkUsageLimit(plan, 'dailyAiChats', summary.daily.aiChats);
    const evaluationsLimit = checkUsageLimit(plan, 'dailyEvaluations', summary.daily.evaluations);
    const mockTestsLimit = checkUsageLimit(plan, 'mockTestsPerMonth', summary.monthly.mockTests);

    return NextResponse.json({
      usage: summary,
      limits: {
        dailyAiChats: aiChatsLimit,
        dailyEvaluations: evaluationsLimit,
        mockTestsPerMonth: mockTestsLimit,
      },
    });
  } catch (error) {
    console.error('API Error in GET /api/usage:', safeErrorResponse(error));
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
