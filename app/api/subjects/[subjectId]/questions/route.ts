import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Question from '@/models/question';
import { safeErrorResponse } from '@/lib/promptSafety';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { subjectId: string } }
) {
  try {
    const { subjectId } = params;
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return NextResponse.json({ error: 'Invalid subjectId' }, { status: 400 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const unit    = searchParams.get('unit')   ? Number(searchParams.get('unit'))   : undefined;
    const marks   = searchParams.get('marks')  ? Number(searchParams.get('marks'))  : undefined;
    const year    = searchParams.get('year')   ? Number(searchParams.get('year'))   : undefined;
    const sort    = searchParams.get('sort')   || 'newest';   // 'newest' | 'oldest' | 'repeated'
    const page    = Math.max(1, Number(searchParams.get('page')  || 1));
    const limit   = Math.min(20, Math.max(1, Number(searchParams.get('limit') || 8)));
    const topicFilter = searchParams.get('topic') || '';

    // Build query
    const query: Record<string, unknown> = { subjectId };
    if (unit !== undefined)  query.unit  = unit;
    if (marks !== undefined) query.marks = marks;
    if (year !== undefined)  query['sourcePapers.year'] = year;
    if (topicFilter)         query.topic = { $regex: topicFilter, $options: 'i' };

    // Sort direction
    let sortObj: Record<string, 1 | -1> = { lastAppearedYear: -1 };
    if (sort === 'oldest')   sortObj = { lastAppearedYear: 1 };
    if (sort === 'repeated') sortObj = { repetitionFrequency: -1, lastAppearedYear: -1 };

    const [questions, total] = await Promise.all([
      Question.find(query)
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .select('_id questionText marks difficulty sourcePapers lastAppearedYear topic unit repetitionFrequency')
        .lean(),
      Question.countDocuments(query),
    ]);

    // Topic breakdown for the right sidebar — scoped to the unit
    const topicQuery: Record<string, unknown> = { subjectId };
    if (unit !== undefined) topicQuery.unit = unit;

    const topicAgg = await Question.aggregate([
      { $match: topicQuery },
      { $group: { _id: '$topic', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, topic: '$_id', count: 1 } }
    ]);

    // Available years for the year dropdown
    const yearAgg = await Question.aggregate([
      { $match: { subjectId: new mongoose.Types.ObjectId(subjectId), ...(unit !== undefined ? { unit } : {}) } },
      { $unwind: '$sourcePapers' },
      { $group: { _id: '$sourcePapers.year' } },
      { $sort: { _id: -1 } },
      { $project: { _id: 0, year: '$_id' } }
    ]);

    return NextResponse.json({
      questions,
      total,
      page,
      pages: Math.ceil(total / limit),
      topics: topicAgg,
      years: yearAgg.map((y) => y.year).filter(Boolean),
    });
  } catch (error) {
    console.error('API Error in GET /api/subjects/[subjectId]/questions:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
