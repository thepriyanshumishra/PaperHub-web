import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import TestBlueprint from '@/models/testBlueprint';
import { requireAuthorizedUser } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthorizedUser(req);
    if (errorResponse) return errorResponse;

    const searchParams = req.nextUrl.searchParams;
    const subjectId = searchParams.get('subjectId');
    if (!subjectId || !mongoose.Types.ObjectId.isValid(subjectId)) {
      return NextResponse.json({ error: 'Missing or invalid subjectId parameter' }, { status: 400 });
    }

    await dbConnect();

    // Query official blueprints (no userId) + user-created custom blueprints
    let blueprints = await TestBlueprint.find({
      subjectId: new mongoose.Types.ObjectId(subjectId),
      $or: [
        { userId: { $exists: false } },
        { userId: null },
        { userId: user._id }
      ]
    }).lean();

    // Auto-seed default blueprints if none exist for this subject
    if (blueprints.length === 0) {
      const defaultBlueprints = [
        {
          subjectId: new mongoose.Types.ObjectId(subjectId),
          examType: 'minor',
          duration: 60, // 1 hour
          questionDistribution: [
            { unit: 1, difficulty: 'easy', marks: 10, count: 2 },
            { unit: 2, difficulty: 'medium', marks: 10, count: 2 },
            { unit: 3, difficulty: 'hard', marks: 10, count: 1 }
          ],
          marksPattern: {
            totalMarks: 50,
            sections: [
              { name: 'Section A (Part I)', count: 2, marks: 10 },
              { name: 'Section B (Part II)', count: 2, marks: 10 },
              { name: 'Section C (Part III)', count: 1, marks: 10 }
            ]
          }
        },
        {
          subjectId: new mongoose.Types.ObjectId(subjectId),
          examType: 'major',
          duration: 180, // 3 hours
          questionDistribution: [
            { unit: 1, difficulty: 'easy', marks: 10, count: 2 },
            { unit: 2, difficulty: 'medium', marks: 10, count: 2 },
            { unit: 3, difficulty: 'medium', marks: 10, count: 2 },
            { unit: 4, difficulty: 'hard', marks: 10, count: 2 },
            { unit: 5, difficulty: 'hard', marks: 10, count: 2 }
          ],
          marksPattern: {
            totalMarks: 100,
            sections: [
              { name: 'Part A', count: 4, marks: 10 },
              { name: 'Part B', count: 4, marks: 10 },
              { name: 'Part C', count: 2, marks: 10 }
            ]
          }
        }
      ];

      const seeded = await TestBlueprint.insertMany(defaultBlueprints);
      blueprints = seeded.map(doc => doc.toObject() as any);
    }

    return NextResponse.json({ blueprints });
  } catch (error) {
    console.error('API Error in GET /api/blueprints:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthorizedUser(req);
    if (errorResponse) return errorResponse;

    await dbConnect();
    const body = await req.json();
    const { subjectId, examType, duration, questionDistribution, marksPattern } = body;

    if (!subjectId || !mongoose.Types.ObjectId.isValid(subjectId) || !duration || !questionDistribution) {
      return NextResponse.json({ error: 'Missing required parameters: subjectId, duration, questionDistribution' }, { status: 400 });
    }

    // Force user custom assignment
    const blueprint = await TestBlueprint.create({
      subjectId: new mongoose.Types.ObjectId(subjectId),
      examType: examType === 'major' || examType === 'minor' ? examType : 'custom',
      duration: parseInt(duration, 10),
      questionDistribution,
      marksPattern,
      userId: user._id
    });

    return NextResponse.json({ blueprint });
  } catch (error) {
    console.error('API Error in POST /api/blueprints:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
