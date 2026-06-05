import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Question from '@/models/question';
import UserTopicPerformance from '@/models/userTopicPerformance';
import { verifyFirebaseIdToken } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { subjectId: string } }
) {
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

    const { subjectId } = params;
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return NextResponse.json({ error: 'Invalid subjectId format' }, { status: 400 });
    }

    await dbConnect();

    // Fetch all verified questions for the subject
    const questions = await Question.find({ subjectId: new mongoose.Types.ObjectId(subjectId), verificationStatus: 'verified' }).lean();

    if (questions.length === 0) {
      return NextResponse.json({ heatmap: [] });
    }

    // Fetch user topic performance for this subject
    const performances = await UserTopicPerformance.find({
      userId: verifiedUser.uid,
      subjectId
    }).lean();

    const performanceMap = new Map(performances.map((p) => [p.topic.trim().toLowerCase(), p]));

    // Group by unit and topic
    const topicAggMap = new Map<string, { unit: number; topic: string; totalQuestions: number }>();
    questions.forEach((q) => {
      const topicName = q.topic.trim();
      const key = `${q.unit}-${topicName.toLowerCase()}`;
      const existing = topicAggMap.get(key) || { unit: q.unit, topic: topicName, totalQuestions: 0 };
      topicAggMap.set(key, {
        ...existing,
        totalQuestions: existing.totalQuestions + 1
      });
    });

    const heatmapData = Array.from(topicAggMap.values()).map((t) => {
      const perf = performanceMap.get(t.topic.toLowerCase());
      const attempted = perf?.attempted || 0;
      const correct = perf?.correct || 0;
      const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;

      let status: 'strong' | 'weak' | 'needs_improvement' | 'unattempted' = 'unattempted';
      if (attempted > 0) {
        if (accuracy >= 80) {
          status = 'strong';
        } else if (accuracy <= 50) {
          status = 'weak';
        } else {
          status = 'needs_improvement';
        }
      }

      return {
        unit: t.unit,
        topic: t.topic,
        totalQuestions: t.totalQuestions,
        practiceDensity: attempted,
        correctCount: correct,
        mastery: Math.round(accuracy),
        status
      };
    });

    // Sort by unit first, then topic name
    heatmapData.sort((a, b) => {
      if (a.unit !== b.unit) {
        return a.unit - b.unit;
      }
      return a.topic.localeCompare(b.topic);
    });

    return NextResponse.json({ heatmap: heatmapData });
  } catch (error) {
    console.error('API Error in GET /api/subjects/[subjectId]/heatmap:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
