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

    if (!hasPermission(user.role, ROLES.MODERATOR)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'flagged'; // default to flagged queue
    const subjectId = searchParams.get('subjectId');
    const unitStr = searchParams.get('unit');

    await dbConnect();

    const query: any = {};

    if (subjectId) {
      query.subjectId = subjectId;
    }

    if (unitStr) {
      const unit = parseInt(unitStr, 10);
      if (!isNaN(unit)) {
        query.unit = unit;
      }
    }

    let sortOption: any = { updatedAt: -1 };

    if (status === 'flagged') {
      query.verificationStatus = 'flagged';
      sortOption = { flaggedAt: -1, updatedAt: -1 };
    } else if (status === 'verified') {
      query.verificationStatus = 'verified';
      sortOption = { verifiedAt: -1, updatedAt: -1 };
    } else if (status === 'archived') {
      query.verificationStatus = 'archived';
      sortOption = { updatedAt: -1 };
    } else if (status === 'edited') {
      query.verificationCorrectionCount = { $gt: 0 };
      sortOption = { updatedAt: -1 };
    } else if (status === 'pending') {
      query.verificationStatus = 'pending';
      sortOption = { createdAt: 1 }; // older pending questions first
    }

    // Populate subject metadata for displaying details in the queue table
    const questions = await Question.find(query)
      .populate({ path: 'subjectId', select: 'name code' })
      .sort(sortOption)
      .limit(100); // safety cap

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('API Error in GET /api/moderator/questions:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
