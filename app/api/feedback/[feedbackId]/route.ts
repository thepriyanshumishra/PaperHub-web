import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Feedback from '@/models/feedback';
import { requireAuthorizedUser } from '@/lib/verifyAuth';
import { sanitizeText, safeErrorResponse } from '@/lib/promptSafety';
import { logger } from '@/lib/logger';
import mongoose from 'mongoose';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ feedbackId: string }> }
) {
  try {
    const { user, errorResponse } = await requireAuthorizedUser(req, { allowedRoles: ['admin'] });
    if (errorResponse) return errorResponse;

    await dbConnect();

    const { feedbackId } = await params;
    if (!mongoose.Types.ObjectId.isValid(feedbackId)) {
      return NextResponse.json({ error: 'Invalid feedback ID' }, { status: 400 });
    }

    const body = await req.json();
    const { status, priority, adminNotes } = body;

    const updateData: Record<string, any> = {};
    if (status) {
      const validStatuses = ['open', 'acknowledged', 'in_progress', 'resolved', 'closed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updateData.status = status;
      if (status === 'resolved' || status === 'closed') {
        updateData.resolvedBy = user._id;
        updateData.resolvedAt = new Date();
      }
    }
    if (priority) {
      const validPriorities = ['low', 'medium', 'high', 'critical'];
      if (!validPriorities.includes(priority)) {
        return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
      }
      updateData.priority = priority;
    }
    if (adminNotes !== undefined) {
      updateData.adminNotes = sanitizeText(adminNotes, 2000);
    }

    const feedback = await Feedback.findByIdAndUpdate(feedbackId, updateData, { new: true });
    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    logger.info('Admin updated feedback', user._id, { feedbackId, updates: Object.keys(updateData) });

    return NextResponse.json({ feedback, message: 'Feedback updated successfully.' });
  } catch (error) {
    console.error('API Error in PUT /api/feedback/[feedbackId]:', safeErrorResponse(error));
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
