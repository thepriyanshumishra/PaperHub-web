import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Question from '@/models/question';
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

    // Fetch all verified questions for this subject
    const questions = await Question.find({ subjectId, verificationStatus: 'verified' }).lean();

    if (questions.length === 0) {
      return NextResponse.json({
        repeatedQuestions: [],
        repeatedTopics: [],
        highValueUnits: [],
        lowValueUnits: []
      });
    }

    // Frequently repeated questions (top 15, sorted by repetitionFrequency desc)
    const repeatedQuestions = [...questions]
      .filter((q) => (q.repetitionFrequency || 1) > 1)
      .sort((a, b) => (b.repetitionFrequency || 1) - (a.repetitionFrequency || 1))
      .slice(0, 15);

    // Frequently repeated topics (group by topic and sum repetitionFrequency)
    const topicStatsMap: Record<string, { topic: string; totalRepetition: number; count: number; averageMarks: number; totalMarks: number }> = {};
    const unitStatsMap: Record<number, { unit: number; totalRepetition: number; count: number; totalMarks: number }> = {};

    questions.forEach((q) => {
      const topicName = q.topic.trim();
      const rep = q.repetitionFrequency || 1;

      // Group by topic
      if (!topicStatsMap[topicName]) {
        topicStatsMap[topicName] = { topic: topicName, totalRepetition: 0, count: 0, averageMarks: 0, totalMarks: 0 };
      }
      topicStatsMap[topicName].totalRepetition += rep;
      topicStatsMap[topicName].count += 1;
      topicStatsMap[topicName].totalMarks += q.marks;

      // Group by unit
      if (!unitStatsMap[q.unit]) {
        unitStatsMap[q.unit] = { unit: q.unit, totalRepetition: 0, count: 0, totalMarks: 0 };
      }
      unitStatsMap[q.unit].totalRepetition += rep;
      unitStatsMap[q.unit].count += 1;
      unitStatsMap[q.unit].totalMarks += q.marks;
    });

    const repeatedTopics = Object.values(topicStatsMap)
      .map((t) => ({
        ...t,
        averageMarks: Math.round((t.totalMarks / t.count) * 10) / 10
      }))
      .sort((a, b) => b.totalRepetition - a.totalRepetition)
      .slice(0, 10);

    // Units statistics (high-value and low-value based on total repetition frequency + marks)
    const unitStats = Object.values(unitStatsMap).map((u) => {
      // Score value based on: (totalRepetition * 10) + totalMarks
      const importanceScore = (u.totalRepetition * 10) + u.totalMarks;
      return {
        ...u,
        importanceScore
      };
    });

    // High value units (importanceScore descending)
    const highValueUnits = [...unitStats]
      .sort((a, b) => b.importanceScore - a.importanceScore)
      .map((u) => ({
        unit: u.unit,
        totalRepetition: u.totalRepetition,
        questionCount: u.count,
        totalMarks: u.totalMarks,
        importanceScore: u.importanceScore
      }));

    // Low value units (importanceScore ascending)
    const lowValueUnits = [...unitStats]
      .sort((a, b) => a.importanceScore - b.importanceScore)
      .map((u) => ({
        unit: u.unit,
        totalRepetition: u.totalRepetition,
        questionCount: u.count,
        totalMarks: u.totalMarks,
        importanceScore: u.importanceScore
      }));

    return NextResponse.json({
      repeatedQuestions,
      repeatedTopics,
      highValueUnits,
      lowValueUnits
    });
  } catch (error) {
    console.error('API Error in GET /api/subjects/[subjectId]/pyqs:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
