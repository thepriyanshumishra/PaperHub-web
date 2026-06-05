import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/user';
import Feedback from '@/models/feedback';
import Session from '@/models/session';
import { verifyFirebaseIdToken } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const verifiedUser = await verifyFirebaseIdToken(authHeader.split(' ')[1]);
    if (!verifiedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const admin = await User.findById(verifiedUser.uid);
    if (!admin || !hasPermission(admin.role, 'admin')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const todayStr = now.toISOString().split('T')[0];

    // User statistics
    const [totalUsers, newUsers7d, newUsers30d] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    ]);

    // DAU: users with lastActiveDateStr = today
    const dau = await User.countDocuments({ 'engagement.lastActiveDateStr': todayStr });

    // Users by role
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    // Users by plan
    const usersByPlan = await User.aggregate([
      { $group: { _id: { $ifNull: ['$plan', 'beta_pro'] }, count: { $sum: 1 } } },
    ]);

    // Feedback statistics
    const [totalFeedback, openFeedback, inProgressFeedback, resolvedFeedback] = await Promise.all([
      Feedback.countDocuments(),
      Feedback.countDocuments({ status: 'open' }),
      Feedback.countDocuments({ status: { $in: ['acknowledged', 'in_progress'] } }),
      Feedback.countDocuments({ status: { $in: ['resolved', 'closed'] } }),
    ]);

    // Feedback by category
    const feedbackByCategory = await Feedback.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    // Session statistics
    const totalSessions = await Session.countDocuments();
    const sessionsToday = await Session.countDocuments({ createdAt: { $gte: new Date(todayStr) } });

    // Recent feedback (last 5)
    const recentFeedback = await Feedback.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('userId userEmail category title status priority createdAt');

    return NextResponse.json({
      users: {
        total: totalUsers,
        newLast7Days: newUsers7d,
        newLast30Days: newUsers30d,
        dailyActiveUsers: dau,
        byRole: usersByRole.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
        byPlan: usersByPlan.reduce((acc, p) => ({ ...acc, [p._id]: p.count }), {}),
      },
      feedback: {
        total: totalFeedback,
        open: openFeedback,
        inProgress: inProgressFeedback,
        resolved: resolvedFeedback,
        byCategory: feedbackByCategory.reduce((acc, c) => ({ ...acc, [c._id]: c.count }), {}),
        recent: recentFeedback,
      },
      sessions: {
        total: totalSessions,
        today: sessionsToday,
      },
    });
  } catch (error) {
    console.error('API Error in GET /api/admin/platform-stats:', safeErrorResponse(error));
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
