import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/user';
import Session from '@/models/session';
import Question from '@/models/question';
import AuditLog from '@/models/auditLog';
import UserTopicPerformance from '@/models/userTopicPerformance';
import { requireAuthorizedUser } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { errorResponse } = await requireAuthorizedUser(req, { allowedRoles: ['admin'] });
    if (errorResponse) return errorResponse;

    await dbConnect();

    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 1. Total, Active, New Users
    const totalUsers = await User.countDocuments({});
    const newUsers = await User.countDocuments({ createdAt: { $gte: last7Days } });
    
    // Active users: users with sessional activity or updated in the last 7 days
    const activeUsers = await User.countDocuments({ updatedAt: { $gte: last7Days } });

    // 2. Sessional metrics
    const sessionsCompleted = await Session.countDocuments({ status: 'completed' });
    const sessionsActive = await Session.countDocuments({ status: 'active' });

    // 3. Questions solved
    const solvedAggregate = await UserTopicPerformance.aggregate([
      { $group: { _id: null, totalCorrect: { $sum: '$correct' }, totalAttempted: { $sum: '$attempted' } } }
    ]);
    const questionsSolved = solvedAggregate[0]?.totalCorrect || 0;
    const questionsAttempted = solvedAggregate[0]?.totalAttempted || 0;

    // 4. AI usage (sum of sessional queries + chat logs)
    const chatRoomsCount = await Session.countDocuments({ 'history.aiQueriesCount': { $gt: 0 } });
    
    // 5. Verification & Moderation throughputs
    const verificationThroughput = await Question.countDocuments({
      verificationStatus: 'verified',
      verifiedAt: { $gte: last7Days }
    });

    const moderationThroughput = await AuditLog.countDocuments({
      action: { $in: ['verify', 'flag', 'edit', 'archive', 'restore'] },
      timestamp: { $gte: last7Days }
    });

    return NextResponse.json({
      metrics: {
        totalUsers,
        activeUsers,
        newUsers,
        sessionsCompleted,
        sessionsActive,
        questionsSolved,
        questionsAttempted,
        chatRoomsCount,
        verificationThroughput,
        moderationThroughput
      }
    });
  } catch (error) {
    console.error('API Error in GET /api/admin/monitoring:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
