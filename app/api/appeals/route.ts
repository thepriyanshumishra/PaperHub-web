import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/verifyAuth';
import { ROLES, hasPermission } from '@/lib/permissions';
import Appeal from '@/models/appeal';
import Session from '@/models/session';
import AuditLog from '@/models/auditLog';
import { safeErrorResponse, sanitizeText, AI_LIMITS } from '@/lib/promptSafety';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: User profile mismatch' }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId, questionId, reason } = body;

    if (!sessionId || !questionId || !reason) {
      return NextResponse.json({ error: 'Missing required parameters: sessionId, questionId, reason' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(sessionId) || !mongoose.Types.ObjectId.isValid(questionId)) {
      return NextResponse.json({ error: 'Invalid ID formats' }, { status: 400 });
    }

    await dbConnect();

    const session = await Session.findById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Enforce ownership: only session owner can appeal
    if (String(session.userId) !== String(user._id)) {
      return NextResponse.json({ error: 'Forbidden: You do not own this session' }, { status: 403 });
    }

    if (session.status !== 'completed') {
      return NextResponse.json({ error: 'Cannot appeal a session that is still active' }, { status: 400 });
    }

    // Find the question response details in evaluationResult
    if (!session.evaluationResult || !session.evaluationResult.details) {
      return NextResponse.json({ error: 'No grading details available for this session' }, { status: 400 });
    }

    const detail = session.evaluationResult.details.find(
      d => String(d.questionId) === String(questionId)
    );
    if (!detail) {
      return NextResponse.json({ error: 'Question response not found in session grades' }, { status: 404 });
    }

    // Check for existing appeal
    const existing = await Appeal.findOne({ sessionId, questionId });
    if (existing) {
      return NextResponse.json({ error: 'An appeal has already been submitted for this question response.' }, { status: 409 });
    }

    const previousScore = detail.marksAwarded || 0;

    const appeal = await Appeal.create({
      sessionId,
      questionId,
      userId: user._id,
      reason: sanitizeText(reason, AI_LIMITS.chatMessage),
      status: 'pending',
      previousScore
    });

    // Create Audit Log
    await AuditLog.create({
      questionId: new mongoose.Types.ObjectId(questionId),
      userId: user._id,
      action: 'flag',
      targetType: 'question',
      targetId: String(questionId),
      previousState: String(previousScore),
      newState: 'appealed',
      details: `Student appealed score. Reason: ${reason}`,
      timestamp: new Date()
    });

    return NextResponse.json({
      message: 'Appeal submitted successfully',
      appeal
    });

  } catch (error) {
    console.error('API Error in POST /api/appeals:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}

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

    // Find appeals and populate associated schemas
    const appeals = await Appeal.find({ status: 'pending' })
      .populate({
        path: 'questionId',
        select: 'questionId questionText marks modelAnswer keyPoints evaluationMode'
      })
      .sort({ createdAt: -1 });

    return NextResponse.json({ appeals });

  } catch (error) {
    console.error('API Error in GET /api/appeals:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
