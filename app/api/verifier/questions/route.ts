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

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get('subjectId');
    const yearStr = searchParams.get('year');
    const examType = searchParams.get('examType');
    const status = searchParams.get('status');

    if (!subjectId || !yearStr || !examType) {
      return NextResponse.json({ error: 'Missing required parameters: subjectId, year, examType' }, { status: 400 });
    }

    const year = parseInt(yearStr, 10);
    if (isNaN(year)) {
      return NextResponse.json({ error: 'Invalid year format' }, { status: 400 });
    }

    await dbConnect();

    // Query questions matching paper metadata
    const query: any = {
      subjectId,
      sourcePapers: {
        $elemMatch: { year, examType }
      }
    };

    // If role is Moderator, filter exclusively for flagged questions
    if (user.role === 'moderator') {
      query.verificationStatus = 'flagged';
    } else if (status && ['pending', 'verified', 'flagged'].includes(status)) {
      query.verificationStatus = status;
    }

    const questions = await Question.find(query).sort({ unit: 1, topic: 1 });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('API Error in GET /api/verifier/questions:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
