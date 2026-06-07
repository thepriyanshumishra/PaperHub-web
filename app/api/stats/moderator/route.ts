import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/verifyAuth';
import { ROLES, hasPermission } from '@/lib/permissions';
import Question from '@/models/question';
import Appeal from '@/models/appeal';
import Feedback from '@/models/feedback';
import { safeErrorResponse } from '@/lib/promptSafety';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role, ROLES.MODERATOR)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();

    // 1. Flagged and Archived questions (moderator focuses on flagged questions/reports)
    const flaggedQuestions = await Question.countDocuments({ verificationStatus: 'flagged' });
    const archivedQuestions = await Question.countDocuments({ verificationStatus: 'archived' });
    const verifiedQuestions = await Question.countDocuments({ verificationStatus: 'verified' });

    // 2. Pending and Resolved Appeals
    const pendingAppeals = await Appeal.countDocuments({ status: 'pending' });
    const resolvedAppeals = await Appeal.countDocuments({ status: { $in: ['resolved', 'rejected'] } });

    // 3. User Feedbacks
    const openFeedback = await Feedback.countDocuments({ status: { $in: ['open', 'acknowledged', 'in_progress'] } });
    const resolvedFeedback = await Feedback.countDocuments({ status: { $in: ['resolved', 'closed'] } });

    return NextResponse.json({
      metrics: {
        flaggedQuestions,
        archivedQuestions,
        verifiedQuestions,
        pendingAppeals,
        resolvedAppeals,
        openFeedback,
        resolvedFeedback
      }
    });

  } catch (error) {
    console.error('API Error in GET /api/stats/moderator:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
