import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Question from '@/models/question';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { subjectId: string } }) {
  try {
    await dbConnect();
    const { subjectId } = params;

    if (!subjectId || !mongoose.Types.ObjectId.isValid(subjectId)) {
      return NextResponse.json({ count: 0 }, { status: 200 });
    }

    const { searchParams } = new URL(req.url);
    const unitsParam = searchParams.get('units');
    const topicsParam = searchParams.get('topics');

    const query: {
      subjectId: string;
      verificationStatus: any;
      unit?: { $in: number[] };
      topic?: { $in: string[] };
    } = { subjectId, verificationStatus: { $in: ['verified', 'pending'] } };

    if (unitsParam && unitsParam.trim() !== '') {
      const units = unitsParam.split(',').map(Number).filter((n) => !isNaN(n) && n > 0);
      if (units.length > 0) query.unit = { $in: units };
    }

    if (topicsParam && topicsParam.trim() !== '') {
      const topics = topicsParam.split(',').map((t) => t.trim()).filter(Boolean);
      if (topics.length > 0) query.topic = { $in: topics };
    }

    const count = await Question.countDocuments(query);
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error in question-count API:', error);
    return NextResponse.json({ count: 0 }, { status: 200 });
  }
}
