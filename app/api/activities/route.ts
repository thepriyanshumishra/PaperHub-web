import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Activity from '@/models/activity';
import { requireAuthorizedUser } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthorizedUser(req);
    if (errorResponse) return errorResponse;

    await dbConnect();
    const activities = await Activity.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('API Error in GET /api/activities:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
