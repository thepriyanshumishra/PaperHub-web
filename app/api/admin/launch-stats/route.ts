import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/user';
import Session from '@/models/session';
import Feedback from '@/models/feedback';
import AuditLog from '@/models/auditLog';
import { requireAuthorizedUser } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { errorResponse } = await requireAuthorizedUser(req, { allowedRoles: ['admin'] });
    if (errorResponse) return errorResponse;

    await dbConnect();

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayStart = new Date(todayStr + 'T00:00:00.000Z');
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // ── User funnel metrics ───────────────────────────────────────────────────
    const [
      totalRegistrations,
      verifiedUsers,
      onboardedUsers,
      suspendedUsers,
      bannedUsers,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ emailVerified: true }),
      User.countDocuments({ emailVerified: true, onboardingCompleted: true, role: 'student' }),
      User.countDocuments({ accountStatus: 'suspended' }),
      User.countDocuments({ accountStatus: 'banned' }),
    ]);

    // Daily Active Users (students who were active today)
    const dau = await User.countDocuments({ 'engagement.lastActiveDateStr': todayStr });

    // New signups today
    const signupsToday = await User.countDocuments({ createdAt: { $gte: todayStart } });

    // ── Session / AI metrics ──────────────────────────────────────────────────
    const [
      sessionsToday,
      failedSessions,
      activeSessions,
    ] = await Promise.all([
      Session.countDocuments({ createdAt: { $gte: todayStart } }),
      Session.countDocuments({ status: 'failed_eval' }),
      Session.countDocuments({ status: 'active' }),
    ]);

    // AI requests: sessions with aiQueriesCount > 0 created today (proxy metric)
    const aiRequestsToday = await Session.countDocuments({
      createdAt: { $gte: todayStart },
      'history.aiQueriesCount': { $gt: 0 },
    });

    // ── Feedback ──────────────────────────────────────────────────────────────
    const [totalFeedback, openFeedback, feedbackToday] = await Promise.all([
      Feedback.countDocuments({}),
      Feedback.countDocuments({ status: 'open' }),
      Feedback.countDocuments({ createdAt: { $gte: todayStart } }),
    ]);

    // ── Audit / Error health ──────────────────────────────────────────────────
    const recentErrors = await AuditLog.countDocuments({
      action: { $in: ['upload_failed', 'eval_failed', 'auth_error'] },
      timestamp: { $gte: last24h },
    });

    // ── Smoke test status flags ───────────────────────────────────────────────
    // These are derived metrics that act as a launch readiness signal
    const verificationRate = totalRegistrations > 0
      ? Math.round((verifiedUsers / totalRegistrations) * 100)
      : 0;
    const onboardingRate = verifiedUsers > 0
      ? Math.round((onboardedUsers / verifiedUsers) * 100)
      : 0;

    return NextResponse.json({
      users: {
        totalRegistrations,
        verifiedUsers,
        onboardedUsers,
        suspendedUsers,
        bannedUsers,
        dau,
        signupsToday,
        verificationRate,
        onboardingRate,
      },
      sessions: {
        sessionsToday,
        activeSessions,
        failedSessions,
        aiRequestsToday,
      },
      feedback: {
        total: totalFeedback,
        open: openFeedback,
        today: feedbackToday,
      },
      health: {
        recentErrors,
        status: recentErrors === 0 && failedSessions < 10 ? 'green' : recentErrors < 5 ? 'amber' : 'red',
      },
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('API Error in GET /api/admin/launch-stats:', safeErrorResponse(error));
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
