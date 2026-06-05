import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/verifyAuth';
import { ROLES, hasPermission } from '@/lib/permissions';
import EvaluationMetric from '@/models/evaluationMetric';
import { safeErrorResponse } from '@/lib/promptSafety';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: User profile mismatch' }, { status: 401 });
    }

    if (!hasPermission(user.role, ROLES.VERIFIER)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    await dbConnect();

    // Aggregate metrics summary stats
    const totalGradedCount = await EvaluationMetric.countDocuments();
    const escalatedCount = await EvaluationMetric.countDocuments({ isEscalated: true });
    const overriddenCount = await EvaluationMetric.countDocuments({ isOverridden: true });
    const appealedCount = await EvaluationMetric.countDocuments({ isAppealed: true });

    const confidenceResult = await EvaluationMetric.aggregate([
      {
        $group: {
          _id: null,
          avgConfidence: { $avg: '$confidence' }
        }
      }
    ]);

    const averageConfidence = confidenceResult.length > 0 ? Math.round(confidenceResult[0].avgConfidence) : 100;
    const accuracyRate = totalGradedCount > 0 ? Math.round(((totalGradedCount - overriddenCount) / totalGradedCount) * 100) : 100;

    return NextResponse.json({
      metrics: {
        totalGradedCount,
        escalatedCount,
        overriddenCount,
        appealedCount,
        averageConfidence,
        accuracyRate
      }
    });

  } catch (error) {
    console.error('API Error in GET /api/staff/evaluation-metrics:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
