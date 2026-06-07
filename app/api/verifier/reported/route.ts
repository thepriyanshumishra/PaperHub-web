import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/verifyAuth';
import { ROLES, hasPermission } from '@/lib/permissions';
import QuestionReport from '@/models/questionReport';
import Question from '@/models/question';
import { safeErrorResponse } from '@/lib/promptSafety';

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

    // Query pending reports and populate associated question details
    const reports = await QuestionReport.find({ status: 'pending' })
      .populate({
        path: 'questionId',
        model: Question
      })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('API Error in GET /api/verifier/reported:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: User profile mismatch' }, { status: 401 });
    }

    if (!hasPermission(user.role, ROLES.VERIFIER)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    const body = await req.json();
    const { reportId } = body;

    if (!reportId) {
      return NextResponse.json({ error: 'Missing reportId parameter' }, { status: 400 });
    }

    await dbConnect();

    const report = await QuestionReport.findById(reportId);
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    report.status = 'resolved';
    report.resolvedBy = user._id;
    report.resolvedAt = new Date();
    await report.save();

    return NextResponse.json({
      message: 'Report resolved successfully',
      report
    });
  } catch (error) {
    console.error('API Error in PUT /api/verifier/reported:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
