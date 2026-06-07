import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import QuestionReport from '@/models/questionReport';
import { requireAuthorizedUser } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { questionId: string } }
) {
  try {
    const { user, errorResponse } = await requireAuthorizedUser(req);
    if (errorResponse) return errorResponse;

    const { questionId } = params;
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return NextResponse.json({ error: 'Invalid questionId format' }, { status: 400 });
    }

    const { reasons, comment } = await req.json();

    if (!reasons || !Array.isArray(reasons) || reasons.length === 0) {
      return NextResponse.json({ error: 'At least one reason is required' }, { status: 400 });
    }

    await dbConnect();

    const report = await QuestionReport.create({
      questionId: new mongoose.Types.ObjectId(questionId),
      studentId: user._id,
      studentName: user.profile?.name || user.email || 'Student',
      reasons,
      comment: comment || '',
      status: 'pending'
    });

    return NextResponse.json({
      message: 'Question reported successfully',
      report
    });
  } catch (error) {
    console.error('API Error in POST /api/questions/[questionId]/report:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
