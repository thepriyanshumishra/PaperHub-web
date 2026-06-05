import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import User from '@/models/user';
import UserTopicPerformance from '@/models/userTopicPerformance';
import Question from '@/models/question';
import Session from '@/models/session';
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
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findById(verifiedUser.uid);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 1. Commonly failed topics (accuracy <= 50%)
    const performances = await UserTopicPerformance.find({ userId: user._id }).lean();
    const failedTopics = performances
      .filter((p) => p.attempted > 0 && (p.correct / p.attempted) <= 0.5)
      .map((p) => {
        const accuracy = (p.correct / p.attempted) * 100;
        return {
          subjectId: p.subjectId,
          topic: p.topic,
          attempted: p.attempted,
          correct: p.correct,
          accuracy: Math.round(accuracy)
        };
      });

    // 2. Repeated mistakes (questions in incorrectAttempts)
    let repeatedMistakes: any[] = [];
    if (user.incorrectAttempts && user.incorrectAttempts.length > 0) {
      repeatedMistakes = await Question.find({
        _id: { $in: user.incorrectAttempts }
      }).populate('subjectId').lean();
    }

    // 3. Frequently abandoned/struggled questions (sessions history where they viewed solution or had high AI queries count)
    const sessions = await Session.find({ userId: user._id }).lean();
    
    // Aggregate questions where they viewed solutions or queried AI multiple times
    const struggleQuestionsMap = new Map<string, { count: number; viewedSolution: boolean; aiQueriesCount: number }>();
    
    sessions.forEach((s) => {
      if (s.history) {
        s.history.forEach((h: any) => {
          const qIdStr = String(h.questionId);
          if (h.viewedSolution || h.aiQueriesCount > 1) {
            const current = struggleQuestionsMap.get(qIdStr) || { count: 0, viewedSolution: false, aiQueriesCount: 0 };
            struggleQuestionsMap.set(qIdStr, {
              count: current.count + 1,
              viewedSolution: current.viewedSolution || h.viewedSolution,
              aiQueriesCount: current.aiQueriesCount + h.aiQueriesCount
            });
          }
        });
      }
    });

    const struggleQuestionIds = Array.from(struggleQuestionsMap.keys());
    let abandonedQuestions: any[] = [];
    if (struggleQuestionIds.length > 0) {
      const dbQuestions = await Question.find({
        _id: { $in: struggleQuestionIds }
      }).populate('subjectId').lean();

      abandonedQuestions = dbQuestions.map((q) => {
        const stats = struggleQuestionsMap.get(String(q._id));
        return {
          ...q,
          abandonedCount: stats?.count || 1,
          viewedSolution: stats?.viewedSolution || false,
          aiQueriesCount: stats?.aiQueriesCount || 0
        };
      });
    }

    return NextResponse.json({
      failedTopics,
      repeatedMistakes,
      abandonedQuestions
    });
  } catch (error) {
    console.error('API Error in GET /api/users/mistakes:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
