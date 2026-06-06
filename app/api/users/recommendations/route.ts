import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import UserTopicPerformance from '@/models/userTopicPerformance';
import Question, { getQuestionImportance } from '@/models/question';
import Subject from '@/models/subject';
import Session from '@/models/session';
import { requireAuthorizedUser } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';
import { ttlCache, CACHE_TTL } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthorizedUser(req);
    if (errorResponse) return errorResponse;

    await dbConnect();

    // Cache recommendations per user for 5 minutes — recommendations change slowly
    const cacheKey = `recommendations:${String(user._id)}`;

    const result = await ttlCache.getOrSet(
      cacheKey,
      async () => {
        // Fetch user topic performance
        const performances = await UserTopicPerformance.find({ userId: user._id }).lean();

        // Identify weak topics (accuracy <= 50%)
        const weakTopicsList = performances
          .filter((p) => p.attempted > 0 && (p.correct / p.attempted) <= 0.5)
          .map((p) => p.topic);

        // Fetch user's active university/college/course subjects to scope recommendations
        const college = user.profile?.college;
        const branch = user.profile?.branch;
        const semester = user.profile?.semester || 1;

        let activeSubjects: any[] = [];
        if (college && branch) {
          activeSubjects = await Subject.find({
            $or: [
              { collegeId: user.profile?.collegeId },
              { code: college }
            ],
            branchIds: user.profile?.branchId,
            semester
          }).lean();

          if (activeSubjects.length === 0) {
            activeSubjects = await Subject.find({ semester }).lean();
          }
        } else {
          activeSubjects = await Subject.find({ semester }).lean();
        }

        const activeSubjectIds = activeSubjects.map((s) => s._id);

        // Gather history of solved questions to prevent recommendation loops
        const userSessions = await Session.find({ userId: user._id }).lean();
        const solvedQuestionIds = new Set<string>();
        userSessions.forEach((s) => {
          if (s.questions) {
            s.questions.forEach((qId) => solvedQuestionIds.add(String(qId)));
          }
        });

        // 2. Recommend Questions
        let recommendedQuestions: any[] = [];

        // Prioritize weak topics first
        if (weakTopicsList.length > 0) {
          const weakQs = await Question.find({
            subjectId: { $in: activeSubjectIds },
            topic: { $in: weakTopicsList },
            verificationStatus: 'verified'
          }).limit(15).lean();

          const freshWeakQs = weakQs.filter((q) => {
            const qIdStr = String(q._id);
            const isIncorrect = user.incorrectAttempts?.includes(qIdStr);
            return !solvedQuestionIds.has(qIdStr) || isIncorrect;
          });

          recommendedQuestions.push(
            ...freshWeakQs.slice(0, 5).map((q) => ({
              ...q,
              importance: getQuestionImportance(q),
              reason: 'Strengthen weak topic'
            }))
          );
        }

        // Next, recommend from bookmarks
        if (user.bookmarks && user.bookmarks.length > 0 && recommendedQuestions.length < 8) {
          const bookmarkedQs = await Question.find({
            _id: { $in: user.bookmarks },
            verificationStatus: 'verified'
          }).limit(10).lean();

          bookmarkedQs.forEach((q) => {
            if (!recommendedQuestions.some((rq) => String(rq._id) === String(q._id))) {
              recommendedQuestions.push({
                ...q,
                importance: getQuestionImportance(q),
                reason: 'Revision bookmark'
              });
            }
          });
        }

        // Fallback: Recommend high-frequency PYQs for active subjects that are unsolved
        if (recommendedQuestions.length < 8) {
          const repeatedQs = await Question.find({
            subjectId: { $in: activeSubjectIds },
            verificationStatus: 'verified'
          })
          .sort({ repetitionFrequency: -1 })
          .limit(30)
          .lean();

          const filteredRepeatedQs = repeatedQs.filter((q) => {
            const qIdStr = String(q._id);
            const isIncorrect = user.incorrectAttempts?.includes(qIdStr);
            return !solvedQuestionIds.has(qIdStr) || isIncorrect;
          });

          filteredRepeatedQs.forEach((q) => {
            if (
              recommendedQuestions.length < 8 &&
              !recommendedQuestions.some((rq) => String(rq._id) === String(q._id))
            ) {
              recommendedQuestions.push({
                ...q,
                importance: getQuestionImportance(q),
                reason: 'High-frequency PYQ'
              });
            }
          });
        }

        recommendedQuestions = recommendedQuestions.slice(0, 8);

        // 3. Recommend Units
        const recommendedUnits: { subjectId: string; subjectName: string; unit: number; reason: string }[] = [];

        for (const sub of activeSubjects) {
          const subQs = await Question.find({ subjectId: sub._id, verificationStatus: 'verified' }).lean();
          const distinctUnits = Array.from(new Set(subQs.map((q) => q.unit)));

          for (const unit of distinctUnits) {
            const unitQs = subQs.filter((q) => q.unit === unit);
            const unitTopics = Array.from(new Set(unitQs.map((q) => q.topic)));

            const hasWeakTopic = unitTopics.some((t) => weakTopicsList.includes(t));
            const hasAttempts = performances.some((p) => String(p.subjectId) === String(sub._id) && unitTopics.includes(p.topic));

            const unitPerfList = performances.filter((p) => String(p.subjectId) === String(sub._id) && unitTopics.includes(p.topic));
            const attemptedCount = unitPerfList.reduce((acc, p) => acc + p.attempted, 0);
            const correctCount = unitPerfList.reduce((acc, p) => acc + p.correct, 0);
            const unitAccuracy = attemptedCount > 0 ? (correctCount / attemptedCount) * 100 : null;

            if (unitAccuracy !== null && unitAccuracy >= 80) continue;

            if (hasWeakTopic) {
              recommendedUnits.push({
                subjectId: String(sub._id),
                subjectName: sub.name,
                unit,
                reason: `Strengthen unit (Accuracy: ${Math.round(unitAccuracy || 0)}%)`
              });
            } else if (!hasAttempts) {
              recommendedUnits.push({
                subjectId: String(sub._id),
                subjectName: sub.name,
                unit,
                reason: 'Unattempted unit'
              });
            }
          }
        }

        const finalUnits = recommendedUnits.slice(0, 5);

        // 4. Recommend Subjects (based on accuracy, lowest first)
        const subjectScores: Record<string, { subjectId: string; name: string; correct: number; attempted: number }> = {};
        activeSubjects.forEach((s) => {
          subjectScores[String(s._id)] = { subjectId: String(s._id), name: s.name, correct: 0, attempted: 0 };
        });

        performances.forEach((p) => {
          const subIdStr = String(p.subjectId);
          if (subjectScores[subIdStr]) {
            subjectScores[subIdStr].correct += p.correct;
            subjectScores[subIdStr].attempted += p.attempted;
          }
        });

        const recommendedSubjects = Object.values(subjectScores)
          .map((s) => {
            const accuracy = s.attempted > 0 ? (s.correct / s.attempted) * 100 : 100;
            return {
              ...s,
              accuracy,
              reason: s.attempted === 0 ? 'No practice sessions yet' : `Current accuracy: ${Math.round(accuracy)}%`
            };
          })
          .filter((s) => s.attempted === 0 || s.accuracy < 80)
          .sort((a, b) => {
            if (a.attempted === 0 && b.attempted > 0) return -1;
            if (b.attempted === 0 && a.attempted > 0) return 1;
            return a.accuracy - b.accuracy;
          })
          .slice(0, 3);

        return { recommendedQuestions, recommendedUnits: finalUnits, recommendedSubjects };
      },
      CACHE_TTL.RECOMMENDATIONS_MS
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error in GET /api/users/recommendations:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
