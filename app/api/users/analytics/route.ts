import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/user';
import UserTopicPerformance from '@/models/userTopicPerformance';
import Session from '@/models/session';
import Subject from '@/models/subject';
import { verifyFirebaseIdToken } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing Authorization Bearer token' }, { status: 401 });
    }

    const idToken = authHeader.split(' ')[1];
    const verifiedUser = await verifyFirebaseIdToken(idToken);
    if (!verifiedUser) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findById(verifiedUser.uid);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.accountStatus !== 'active') {
      return NextResponse.json({ error: 'Unauthorized: Account is suspended or banned' }, { status: 403 });
    }

    const performanceRecords = await UserTopicPerformance.find({ userId: user._id })
      .populate({ path: 'subjectId', select: 'name code' })
      .lean();

    const strongTopics: any[] = [];
    const weakTopics: any[] = [];
    const needsImprovement: any[] = [];
    
    let totalAttempted = 0;
    let totalCorrect = 0;

    for (const record of performanceRecords) {
      const { topic, attempted, correct, subjectId, unit } = record;
      if (attempted <= 0) continue;

      totalAttempted += attempted;
      totalCorrect += correct;

      const accuracy = (correct / attempted) * 100;
      const recordData = {
        topic,
        unit,
        attempted,
        correct,
        accuracy: Math.round(accuracy),
        subjectName: (subjectId as any)?.name || 'Unknown Subject',
        subjectCode: (subjectId as any)?.code || ''
      };

      if (accuracy >= 80) {
        strongTopics.push(recordData);
      } else if (accuracy <= 50) {
        weakTopics.push(recordData);
      } else {
        needsImprovement.push(recordData);
      }
    }

    // Sort by attempts desc to find most practiced
    const mostPracticed = [...performanceRecords]
      .sort((a, b) => b.attempted - a.attempted)
      .slice(0, 5)
      .map(record => ({
        topic: record.topic,
        attempted: record.attempted,
        correct: record.correct,
        accuracy: record.attempted > 0 ? Math.round((record.correct / record.attempted) * 100) : 0,
        subjectName: (record.subjectId as any)?.name || 'Unknown Subject'
      }));

    // Sessions metrics
    const totalPracticeSessions = await Session.countDocuments({ userId: user._id, type: 'practice' });
    const totalTestSessions = await Session.countDocuments({ userId: user._id, type: 'test' });
    const testsCompleted = await Session.countDocuments({ userId: user._id, type: 'test', status: 'completed' });
    const overallAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

    // Compute real 7-day streak week (Mon–Sun of current week)
    const todayDate = new Date();
    const dayOfWeek = todayDate.getDay(); // 0=Sun, 1=Mon...6=Sat
    // Build Mon-Sun window for the current week
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(todayDate);
      d.setDate(todayDate.getDate() + mondayOffset + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    });
    const completedDatesSet = new Set<string>(user.engagement.dailyGoalsCompletedDates || []);
    const streakDays = weekDays.map((dateStr, idx) => ({
      label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][idx],
      active: completedDatesSet.has(dateStr)
    }));


    return NextResponse.json({
      metrics: {
        questionsSolved: totalCorrect,
        questionsAttempted: totalAttempted,
        overallAccuracy,
        totalPracticeSessions,
        totalTestSessions,
        testsCompleted,
        streakCount: user.engagement.streakCount,
        longestStreak: user.engagement.longestStreak || user.engagement.streakCount || 0,
        totalXp: user.engagement.totalXp,
        dailyGoalSolved: user.engagement.dailyGoalSolved,
        dailyGoalTarget: user.engagement.dailyGoalTarget,
        league: user.engagement.league,
        streakDays
      },

      strongTopics,
      weakTopics,
      needsImprovement,
      mostPracticed
    });
  } catch (error) {
    console.error('API Error in GET /api/users/analytics:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
