import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Question from '@/models/question';
import Subject from '@/models/subject';
import mongoose from 'mongoose';
export const dynamic = 'force-dynamic';

import { getOrSetCache } from '@/lib/redis';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectIdsParam = searchParams.get('subjectIds');
    
    if (!subjectIdsParam) {
      return NextResponse.json({ papers: { majors: [], minors: [] } });
    }

    const sortedIds = subjectIdsParam.split(',').sort().join(',');
    const cacheKey = `paperhub:v1:papers:${sortedIds}`;

    const result = await getOrSetCache(cacheKey, async () => {
      await dbConnect();

      const subjectIds = subjectIdsParam.split(',');

      // Fetch subjects mapping for rich response
      const subjects = await Subject.find({ _id: { $in: subjectIds } }).select('_id name code');
      const subjectMap = new Map();
      subjects.forEach(s => subjectMap.set(s._id.toString(), { id: s._id.toString(), name: s.name, code: s.code }));

      // Run aggregation to fetch only unique papers directly from MongoDB
      const objectIds = subjectIds.map(id => new mongoose.Types.ObjectId(id));
      const aggregatedPapers = await Question.aggregate([
        { 
          $match: { 
            subjectId: { $in: objectIds },
            'sourcePapers.0': { $exists: true }
          } 
        },
        { $unwind: '$sourcePapers' },
        {
          $group: {
            _id: {
              subjectId: '$subjectId',
              examType: '$sourcePapers.examType',
              year: '$sourcePapers.year'
            }
          }
        },
        {
          $project: {
            _id: 0,
            subjectId: '$_id.subjectId',
            examType: '$_id.examType',
            year: '$_id.year'
          }
        }
      ]);

      const populatedPapers: any[] = [];
      aggregatedPapers.forEach(p => {
        const subId = p.subjectId.toString();
        const subject = subjectMap.get(subId);
        if (subject) {
          populatedPapers.push({
            subjectId: subId,
            subjectName: subject.name,
            subjectCode: subject.code,
            examType: p.examType,
            year: p.year
          });
        }
      });

      const majors = populatedPapers.filter(p => p.examType.toLowerCase().includes('major'));
      const minors = populatedPapers.filter(p => !p.examType.toLowerCase().includes('major'));

      // Sort papers (latest year first)
      majors.sort((a, b) => b.year - a.year);
      minors.sort((a, b) => b.year - a.year);

      return { papers: { majors, minors } };
    }, 30 * 24 * 60 * 60); // 30 days long-term cache

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error in GET /api/papers:', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}

