import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/user';
import { requireAuthorizedUser } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';
import { ttlCache, CACHE_TTL } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user: currentUser, errorResponse } = await requireAuthorizedUser(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope') || 'university'; // university, college, course, branch

    // Build a stable cache key based on scope and the relevant group ID
    const scopeGroupId =
      scope === 'branch'      ? String(currentUser.profile?.branchId || 'all') :
      scope === 'course'      ? String(currentUser.profile?.courseId || 'all') :
      scope === 'college'     ? String(currentUser.profile?.collegeId || 'all') :
      /* university */          String(currentUser.profile?.universityId || 'all');
    const cacheKey = `leaderboard:${scope}:${scopeGroupId}`;

    const { leaderboard: rankedUsers, userRank } = await ttlCache.getOrSet(
      cacheKey,
      async () => {
        const query: any = { onboardingCompleted: true, accountStatus: 'active' };

        // Apply scoping filters
        if (currentUser.profile) {
          if (scope === 'branch' && currentUser.profile.branchId) {
            query['profile.branchId'] = currentUser.profile.branchId;
          } else if (scope === 'course' && currentUser.profile.courseId) {
            query['profile.courseId'] = currentUser.profile.courseId;
          } else if (scope === 'college' && currentUser.profile.collegeId) {
            query['profile.collegeId'] = currentUser.profile.collegeId;
          } else if (scope === 'university' && currentUser.profile.universityId) {
            query['profile.universityId'] = currentUser.profile.universityId;
          }
        }

        // Fetch ranked leaderboard
        const ranked = await User.find(query)
          .select('displayName photoURL engagement.totalXp engagement.streakCount engagement.league profile.name')
          .sort({ 'engagement.totalXp': -1 })
          .limit(50)
          .lean();

        // Calculate absolute rank of the current user
        const userXp = currentUser.engagement?.totalXp || 0;
        const usersWithHigherXp = await User.countDocuments({
          ...query,
          'engagement.totalXp': { $gt: userXp }
        });
        const rank = usersWithHigherXp + 1;

        return { leaderboard: ranked, userRank: rank };
      },
      CACHE_TTL.LEADERBOARD_MS
    );

    return NextResponse.json({
      leaderboard: rankedUsers,
      userRank,
      scope
    });
  } catch (error) {
    console.error('API Error in GET /api/leaderboard:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
