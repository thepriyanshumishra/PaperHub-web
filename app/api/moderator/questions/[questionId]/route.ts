import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Question from '@/models/question';
import AuditLog from '@/models/auditLog';
import { getAuthenticatedUser } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';
import { ROLES, hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { questionId: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: User profile mismatch' }, { status: 401 });
    }

    if (!hasPermission(user.role, ROLES.MODERATOR)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    const { questionId } = params;
    const body = await req.json();
    const { 
      action, // 'approve_flag' (archive), 'reject_flag' (verify), 'restore', 'archive'
      verificationComment,
      questionText, 
      topic, 
      unit, 
      marks,
      difficulty
    } = body;

    if (!action || !['approve_flag', 'reject_flag', 'restore', 'archive'].includes(action)) {
      return NextResponse.json({ error: 'Invalid or missing action parameter' }, { status: 400 });
    }

    await dbConnect();

    const question = await Question.findById(questionId);
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const previousStatus = question.verificationStatus;
    let targetStatus = previousStatus;
    let logAction: 'verify' | 'archive' | 'restore' | 'flag' | 'edit' = 'edit';

    if (action === 'approve_flag') {
      targetStatus = 'archived';
      logAction = 'archive';
    } else if (action === 'reject_flag') {
      targetStatus = 'verified';
      logAction = 'verify';
    } else if (action === 'restore') {
      targetStatus = 'pending';
      logAction = 'restore';
    } else if (action === 'archive') {
      targetStatus = 'archived';
      logAction = 'archive';
    }

    // Check for inline edits
    let isEdited = false;
    const editDetails: string[] = [];

    if (questionText !== undefined && questionText !== question.questionText) {
      question.questionText = questionText;
      isEdited = true;
      editDetails.push('questionText');
    }
    if (topic !== undefined && topic !== question.topic) {
      question.topic = topic;
      isEdited = true;
      editDetails.push('topic');
    }
    if (unit !== undefined && unit !== question.unit) {
      question.unit = unit;
      isEdited = true;
      editDetails.push('unit');
    }
    if (marks !== undefined && marks !== question.marks) {
      question.marks = marks;
      isEdited = true;
      editDetails.push('marks');
    }
    if (difficulty !== undefined && difficulty !== question.difficulty) {
      question.difficulty = difficulty;
      isEdited = true;
      editDetails.push('difficulty');
    }

    if (isEdited) {
      question.verificationCorrectionCount = (question.verificationCorrectionCount || 0) + 1;
    }

    // Update status and references
    question.verificationStatus = targetStatus;
    
    if (verificationComment !== undefined) {
      question.verificationComment = verificationComment;
    }

    if (targetStatus === 'verified') {
      question.humanVerified = true;
      question.verifiedBy = user._id;
      question.verifiedAt = new Date();
    } else if (targetStatus === 'archived') {
      question.humanVerified = false;
    } else if (targetStatus === 'pending') {
      question.humanVerified = false;
      question.verifiedBy = undefined;
      question.verifiedAt = undefined;
    }

    await question.save();

    // Log the audits
    // 1. Log edits if applied
    if (isEdited) {
      await AuditLog.create({
        questionId: question._id,
        userId: user._id,
        action: 'edit',
        targetType: 'question',
        targetId: String(question._id),
        previousState: previousStatus,
        newState: targetStatus,
        details: `Moderator edited fields: ${editDetails.join(', ')}`,
        timestamp: new Date()
      });
    }

    // 2. Log resolution action
    await AuditLog.create({
      questionId: question._id,
      userId: user._id,
      action: logAction,
      targetType: 'question',
      targetId: String(question._id),
      previousState: previousStatus,
      newState: targetStatus,
      details: verificationComment || `Moderator performed action: ${action}`,
      timestamp: new Date()
    });

    return NextResponse.json({ question });
  } catch (error) {
    console.error(`API Error in PATCH /api/moderator/questions/${params.questionId}:`, error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
