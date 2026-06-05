import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Question from '@/models/question';
import AuditLog from '@/models/auditLog';
import { getAuthenticatedUser } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';
import { ROLES, hasPermission } from '@/lib/permissions';

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

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Run parallel aggregates to avoid bottlenecks
    const [
      pendingQuestions,
      verifiedQuestions,
      flaggedQuestions,
      archivedQuestions,
      verifiedPastWeek,
      flaggedPastWeek,
      editedPastWeek,
      archivedPastWeek
    ] = await Promise.all([
      Question.countDocuments({ verificationStatus: 'pending' }),
      Question.countDocuments({ verificationStatus: 'verified' }),
      Question.countDocuments({ verificationStatus: 'flagged' }),
      Question.countDocuments({ verificationStatus: 'archived' }),
      AuditLog.countDocuments({ action: 'verify', timestamp: { $gte: sevenDaysAgo } }),
      AuditLog.countDocuments({ action: 'flag', timestamp: { $gte: sevenDaysAgo } }),
      AuditLog.countDocuments({ action: 'edit', timestamp: { $gte: sevenDaysAgo } }),
      AuditLog.countDocuments({ action: 'archive', timestamp: { $gte: sevenDaysAgo } })
    ]);

    return NextResponse.json({
      metrics: {
        pendingQuestions,
        verifiedQuestions,
        flaggedQuestions,
        archivedQuestions,
        weeklyThroughput: {
          verifications: verifiedPastWeek,
          flags: flaggedPastWeek,
          edits: editedPastWeek,
          archives: archivedPastWeek,
          totalActions: verifiedPastWeek + flaggedPastWeek + editedPastWeek + archivedPastWeek
        }
      }
    });
  } catch (error) {
    console.error('API Error in GET /api/staff/metrics:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
