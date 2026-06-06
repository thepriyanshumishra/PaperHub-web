import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Notification from '@/models/notification';
import { requireAuthorizedUser } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';
import { logger } from '@/lib/logger';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthorizedUser(req);
    if (errorResponse) return errorResponse;

    await dbConnect();
    const notifications = await Notification.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('API Error in GET /api/notifications:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthorizedUser(req);
    if (errorResponse) return errorResponse;

    await dbConnect();
    const body = await req.json();
    const { ids } = body;

    let query: any = { userId: user._id };

    if (Array.isArray(ids) && ids.length > 0) {
      const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
      query._id = { $in: validIds };
    }

    const result = await Notification.updateMany(query, { $set: { isRead: true } });
    
    logger.info(`User marked notifications as read`, user._id, { modifiedCount: result.modifiedCount });

    return NextResponse.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error('API Error in PATCH /api/notifications:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
