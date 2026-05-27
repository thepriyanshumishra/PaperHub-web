import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Subject from '@/models/subject';
import Question from '@/models/question';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { subjectId: string } }) {
  try {
    await dbConnect();
    const { subjectId } = params;

    if (!subjectId) {
      return NextResponse.json({ error: 'Missing subjectId parameter' }, { status: 400 });
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    // Dynamic stats aggregation based on actual database questions
    let stats = {
      mostImportantUnit: null as number | null,
      importantUnits: [] as number[],
      importantTopics: [] as string[],
      topicStats: {} as Record<string, { totalRepetition: number; count: number; maxMarks: number }>
    };

    if (mongoose.Types.ObjectId.isValid(subjectId)) {
      const questions = await Question.find({ subjectId });

      const topicMap: Record<string, { totalRepetition: number; count: number; maxMarks: number }> = {};
      const unitMap: Record<number, { totalRepetition: number; count: number }> = {};

      questions.forEach((q) => {
        const topicKey = q.topic.trim();
        if (!topicMap[topicKey]) {
          topicMap[topicKey] = { totalRepetition: 0, count: 0, maxMarks: 0 };
        }
        topicMap[topicKey].totalRepetition += q.repetitionFrequency || 1;
        topicMap[topicKey].count += 1;
        if (q.marks > topicMap[topicKey].maxMarks) {
          topicMap[topicKey].maxMarks = q.marks;
        }

        if (!unitMap[q.unit]) {
          unitMap[q.unit] = { totalRepetition: 0, count: 0 };
        }
        unitMap[q.unit].totalRepetition += q.repetitionFrequency || 1;
        unitMap[q.unit].count += 1;
      });

      const unitList = Object.entries(unitMap).map(([unit, data]) => ({
        unit: parseInt(unit, 10),
        totalRepetition: data.totalRepetition,
        count: data.count,
      }));
      unitList.sort((a, b) => b.totalRepetition - a.totalRepetition);
      const mostImportantUnit = unitList.length > 0 ? unitList[0].unit : null;
      const importantUnits = unitList.slice(0, 2).map((u) => u.unit);

      const topicList = Object.entries(topicMap).map(([topic, data]) => ({
        topic,
        totalRepetition: data.totalRepetition,
        count: data.count,
      }));
      topicList.sort((a, b) => b.totalRepetition - a.totalRepetition);
      const importantTopics = topicList
        .filter((t) => t.totalRepetition > 1)
        .slice(0, 5)
        .map((t) => t.topic);

      if (importantTopics.length === 0) {
        importantTopics.push(...topicList.slice(0, 3).map((t) => t.topic));
      }

      stats = {
        mostImportantUnit,
        importantUnits,
        importantTopics,
        topicStats: topicMap
      };
    }

    return NextResponse.json({ subject, stats });
  } catch (error) {
    console.error(`API Error in /api/subjects/${params.subjectId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
