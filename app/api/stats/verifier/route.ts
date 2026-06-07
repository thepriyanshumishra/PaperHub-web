import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/verifyAuth';
import { ROLES, hasPermission } from '@/lib/permissions';
import Question from '@/models/question';
import Appeal from '@/models/appeal';
import Session from '@/models/session';
import { DocumentBatch } from '@/models/uploadedDocument';
import { safeErrorResponse } from '@/lib/promptSafety';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role, ROLES.VERIFIER)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    // 1. Question verification status counts
    const pendingQuestions = await Question.countDocuments({ verificationStatus: 'pending' });
    const flaggedQuestions = await Question.countDocuments({ verificationStatus: 'flagged' });
    const verifiedQuestions = await Question.countDocuments({ verificationStatus: 'verified' });

    // 2. Document Ingestion Batch status
    const processingBatches = await DocumentBatch.countDocuments({ status: { $in: ['pending', 'processing'] } });
    const totalBatches = await DocumentBatch.countDocuments({});

    // 3. Appeals count
    const pendingAppeals = await Appeal.countDocuments({ status: 'pending' });

    // 4. Escalations count
    const pendingEscalations = await Session.countDocuments({
      'evaluationResult.details.status': 'needs_review'
    });

    return NextResponse.json({
      metrics: {
        pendingQuestions,
        flaggedQuestions,
        verifiedQuestions,
        processingBatches,
        totalBatches,
        pendingAppeals,
        pendingEscalations
      }
    });

  } catch (error) {
    console.error('API Error in GET /api/stats/verifier:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
