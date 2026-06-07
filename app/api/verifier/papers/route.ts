import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Question from '@/models/question';
import { getAuthenticatedUser } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';

import { ROLES, hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: User profile mismatch' }, { status: 401 });
    }

    if (!hasPermission(user.role, ROLES.VERIFIER)) {
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
        $lookup: {
          from: "branches",
          localField: "subject.branchIds",
          foreignField: "_id",
          as: "branch"
        }
      },
      { $unwind: { path: "$branch", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          subjectId: "$_id.subjectId",
          subjectName: "$subject.name",
          subjectCode: {
            $cond: [
              { $ifNull: ["$branch.code", false] },
              { $concat: ["$subject.code", " (", "$branch.code", ")"] },
              "$subject.code"
            ]
          },
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
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
