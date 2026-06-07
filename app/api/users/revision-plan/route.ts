import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import UserTopicPerformance from '@/models/userTopicPerformance';
import Question from '@/models/question';
import Subject from '@/models/subject';
import { requireAuthorizedUser } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';

export const dynamic = 'force-dynamic';

interface RevisionItem {
  id: string;
  type: 'unit' | 'question' | 'topic';
  title: string;
  subtitle: string;
  actionUrl: string;
  urgency: 'high' | 'medium' | 'low';
}

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthorizedUser(req);
    if (errorResponse) return errorResponse;

    await dbConnect();

    const performances = await UserTopicPerformance.find({ userId: user._id }).lean();
    const activeSubjects = await Subject.find({
      $or: [
        { collegeId: user.profile?.collegeId },
        { code: user.profile?.college || 'MMMUT' }
      ],
      branchId: user.profile?.branchId,
      semester: user.profile?.semester || 1
    }).lean();

    const revisionPlan: RevisionItem[] = [];

    // 1. Check incorrectAttempts to suggest re-solving questions (Previous Mistakes)
    if (user.incorrectAttempts && user.incorrectAttempts.length > 0) {
      const mistakeQs = await Question.find({
        _id: { $in: user.incorrectAttempts.slice(0, 3) }
      }).populate('subjectId').lean();

      mistakeQs.forEach((q: any) => {
        revisionPlan.push({
          id: String(q._id),
          type: 'question',
          title: `Reattempt mistake: ${q.questionText.substring(0, 50)}${q.questionText.length > 50 ? '...' : ''}`,
          subtitle: `${q.subjectId?.name || 'Subject'} • Unit ${q.unit} • ${q.topic}`,
          actionUrl: `/subjects/${q.subjectId?._id || ''}`,
          urgency: 'high'
        });
      });
    }

    // 2. Suggest revising weak units (accuracy <= 55%)
    const subjectMap = new Map(activeSubjects.map((s) => [String(s._id), s.name]));
    
    // Group performances by subject and unit to calculate unit accuracy
    const unitPerformanceMap: Record<string, { totalCorrect: number; totalAttempted: number; subjectId: string }> = {};

    // Get question unit context to match performances to units
    for (const p of performances) {
      const qContext = await Question.findOne({ subjectId: p.subjectId, topic: p.topic }).lean();
      if (qContext) {
        const key = `${p.subjectId}-${qContext.unit}`;
        if (!unitPerformanceMap[key]) {
          unitPerformanceMap[key] = { totalCorrect: 0, totalAttempted: 0, subjectId: String(p.subjectId) };
        }
        unitPerformanceMap[key].totalCorrect += p.correct;
        unitPerformanceMap[key].totalAttempted += p.attempted;
      }
    }

    Object.entries(unitPerformanceMap).forEach(([key, data]) => {
      const [subjectId, unitStr] = key.split('-');
      const unit = parseInt(unitStr, 10);
      const accuracy = data.totalAttempted > 0 ? (data.totalCorrect / data.totalAttempted) * 100 : 100;
      const subjectName = subjectMap.get(subjectId);

      if (accuracy <= 55 && subjectName) {
        revisionPlan.push({
          id: key,
          type: 'unit',
          title: `Revise Unit ${unit} of ${subjectName}`,
          subtitle: `Current Accuracy: ${Math.round(accuracy)}% • Needs sessional practice`,
          actionUrl: `/subjects/${subjectId}`,
          urgency: accuracy <= 40 ? 'high' : 'medium'
        });
      }
    });

    // 3. Fallback: If revision items are few, suggest practicing unattempted units
    if (revisionPlan.length < 4) {
      for (const sub of activeSubjects) {
        const subQs = await Question.find({ subjectId: sub._id, verificationStatus: { $in: ['verified', 'pending'] } }).lean();
        const units = Array.from(new Set(subQs.map((q) => q.unit)));

        for (const unit of units) {
          const key = `${sub._id}-${unit}`;
          if (!unitPerformanceMap[key]) {
            revisionPlan.push({
              id: key,
              type: 'unit',
              title: `Practice Unit ${unit}: ${sub.name}`,
              subtitle: `0 sessional questions attempted yet.`,
              actionUrl: `/subjects/${sub._id}`,
              urgency: 'low'
            });
          }
        }
      }
    }

    // Sort: high urgency first
    const sortedPlan = revisionPlan
      .sort((a, b) => {
        const urgencyWeight = { high: 3, medium: 2, low: 1 };
        return urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
      })
      .slice(0, 6);

    return NextResponse.json({ revisionPlan: sortedPlan });
  } catch (error) {
    console.error('API Error in GET /api/users/revision-plan:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
