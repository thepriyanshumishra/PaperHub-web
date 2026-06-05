import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Activity from '@/models/activity';
import { verifyFirebaseIdToken } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing Authorization Bearer token' }, { status: 401 });
    }

    const idToken = authHeader.split(' ')[1];
    const verifiedUser = await verifyFirebaseIdToken(idToken);
    if (!verifiedUser) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 });
    }

    await dbConnect();
    const activities = await Activity.find({ userId: verifiedUser.uid })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('API Error in GET /api/activities:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
