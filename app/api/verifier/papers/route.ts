import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Question from '@/models/question';
import { getAuthenticatedUser } from '@/lib/verifyAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: User profile mismatch' }, { status: 401 });
    }

    if (user.role !== 'verifier' && user.role !== 'moderator' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    await dbConnect();

    // Aggregate questions by sourcePaper parameter grouping
    const papers = await Question.aggregate([
      { $unwind: "$sourcePapers" },
      {
        $group: {
          _id: {
            subjectId: "$subjectId",
            year: "$sourcePapers.year",
            examType: "$sourcePapers.examType"
          },
          questionsCount: { $sum: 1 },
          verifiedCount: {
            $sum: { $cond: [{ $eq: ["$verificationStatus", "verified"] }, 1, 0] }
          },
          flaggedCount: {
            $sum: { $cond: [{ $eq: ["$verificationStatus", "flagged"] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: "subjects",
          localField: "_id.subjectId",
          foreignField: "_id",
          as: "subject"
        }
      },
      { $unwind: "$subject" },
      {
        $project: {
          _id: 0,
          subjectId: "$_id.subjectId",
          subjectName: "$subject.name",
          subjectCode: "$subject.code",
          year: "$_id.year",
          examType: "$_id.examType",
          questionsCount: 1,
          verifiedCount: 1,
          flaggedCount: 1
        }
      },
      { $sort: { subjectName: 1, year: -1 } }
    ]);

    return NextResponse.json({ papers });
  } catch (error) {
    console.error('API Error in GET /api/verifier/papers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
