import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Question from '@/models/question';
import AuditLog from '@/models/auditLog';
import { getAuthenticatedUser } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';
import { ROLES, hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { questionId: string } }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: User profile mismatch' }, { status: 401 });
    }

    if (!hasPermission(user.role, ROLES.VERIFIER)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    await dbConnect();
    const { questionId } = params;
    const question = await Question.findById(questionId);
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    return NextResponse.json({ question });
  } catch (error) {
    console.error(`API Error in GET /api/verifier/questions/${params.questionId}:`, error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}

async function handleWriteRequest(req: NextRequest, questionId: string) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: User profile mismatch' }, { status: 401 });
    }

    if (!hasPermission(user.role, ROLES.VERIFIER)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      verificationStatus, 
      verificationComment, 
      questionText, 
      topic, 
      unit, 
      marks,
      difficulty,
      action
    } = body;

    await dbConnect();

    const question = await Question.findById(questionId);
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Determine target verification status
    // Support either explicit action ('verify' -> 'verified', 'flag' -> 'flagged') or direct verificationStatus
    let targetStatus = question.verificationStatus;
    if (action === 'verify') {
      targetStatus = 'verified';
    } else if (action === 'flag') {
      targetStatus = 'flagged';
    } else if (verificationStatus) {
      targetStatus = verificationStatus;
    }

    // Check if edits are being made
    let isEdited = false;
    const editDetails: string[] = [];
    const verifierChanges: any = {};
    const oldText = question.questionText;

    if (questionText !== undefined && questionText !== question.questionText) {
      verifierChanges.questionText = { old: question.questionText, new: questionText };
      question.questionText = questionText;
      isEdited = true;
      editDetails.push('questionText');
    }
    if (topic !== undefined && topic !== question.topic) {
      verifierChanges.topic = { old: question.topic, new: topic };
      question.topic = topic;
      isEdited = true;
      editDetails.push('topic');
    }
    if (unit !== undefined && unit !== question.unit) {
      verifierChanges.unit = { old: question.unit, new: unit };
      question.unit = unit;
      isEdited = true;
      editDetails.push('unit');
    }
    if (marks !== undefined && marks !== question.marks) {
      verifierChanges.marks = { old: question.marks, new: marks };
      question.marks = marks;
      isEdited = true;
      editDetails.push('marks');
    }
    if (difficulty !== undefined && difficulty !== question.difficulty) {
      verifierChanges.difficulty = { old: question.difficulty, new: difficulty };
      question.difficulty = difficulty;
      isEdited = true;
      editDetails.push('difficulty');
    }

    // Require comment when flagging a question
    if (targetStatus === 'flagged') {
      if (!verificationComment || verificationComment.trim().length === 0) {
        return NextResponse.json({ error: 'A comment is required when flagging a question for review' }, { status: 400 });
      }
    }

    const previousStatus = question.verificationStatus;

    // Apply verification updates
    question.verificationStatus = targetStatus;
    question.verificationComment = verificationComment !== undefined ? verificationComment : question.verificationComment;

    if (targetStatus === 'verified') {
      question.humanVerified = true;
      question.verifiedBy = user._id;
      question.verifiedByName = user.displayName || user.name || user.email;
      question.verifiedAt = new Date();
    } else if (targetStatus === 'flagged') {
      question.humanVerified = false;
      question.flaggedBy = user._id;
      question.flaggedByName = user.displayName || user.name || user.email;
      question.flaggedAt = new Date();
      if (previousStatus !== 'flagged') {
        question.flaggedCount = (question.flaggedCount || 0) + 1;
      }
    }

    if (isEdited) {
      question.verificationCorrectionCount = (question.verificationCorrectionCount || 0) + 1;
      if (!question.originalTextBeforeVerification) {
        question.originalTextBeforeVerification = oldText;
      }
      question.verifierChanges = verifierChanges;
    }

    const oldVersion = question.version || 1;
    question.version = oldVersion + 1;

    // Invalidate cached solutions because question fields or verification status changed
    question.cachedSolution = undefined;

    await question.save();

    // Trigger Redis cache purges asynchronously
    try {
      const { invalidateCache, invalidateCachePattern } = await import('@/lib/redis');
      await invalidateCache(`paperhub:v1:solutions:question:${questionId}:v${oldVersion}`);
      await invalidateCachePattern(`paperhub:v1:solutions:question:${questionId}:*`);
      await invalidateCachePattern(`paperhub:v1:explanations:step:${questionId}:*`);
    } catch (cacheErr) {
      console.warn('[Cache] Redis purge failed on verifier question edit:', cacheErr);
    }

    // Log the audits
    // 1. If edited, write an edit log
    if (isEdited) {
      await AuditLog.create({
        questionId: question._id,
        userId: user._id,
        action: 'edit',
        targetType: 'question',
        targetId: String(question._id),
        previousState: previousStatus,
        newState: targetStatus,
        details: `Edited fields: ${editDetails.join(', ')}`,
        timestamp: new Date()
      });
    }

    // 2. If status transitioned to verified or flagged (or verified/flagged was re-applied)
    if (targetStatus === 'verified' && (previousStatus !== 'verified' || action === 'verify')) {
      await AuditLog.create({
        questionId: question._id,
        userId: user._id,
        action: 'verify',
        targetType: 'question',
        targetId: String(question._id),
        previousState: previousStatus,
        newState: 'verified',
        details: isEdited ? `Verified with edits on: ${editDetails.join(', ')}` : 'Verified question',
        timestamp: new Date()
      });
    } else if (targetStatus === 'flagged' && (previousStatus !== 'flagged' || action === 'flag')) {
      await AuditLog.create({
        questionId: question._id,
        userId: user._id,
        action: 'flag',
        targetType: 'question',
        targetId: String(question._id),
        previousState: previousStatus,
        newState: 'flagged',
        details: verificationComment || 'Flagged question',
        timestamp: new Date()
      });
    }

    return NextResponse.json({ question });
  } catch (error) {
    console.error(`API Error in PUT/PATCH /api/verifier/questions/${questionId}:`, error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { questionId: string } }) {
  return handleWriteRequest(req, params.questionId);
}

export async function PATCH(req: NextRequest, { params }: { params: { questionId: string } }) {
  return handleWriteRequest(req, params.questionId);
}

export async function POST(req: NextRequest, { params }: { params: { questionId: string } }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: User profile mismatch' }, { status: 401 });
    }

    if (!hasPermission(user.role, ROLES.VERIFIER)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    const { questionId } = params; // Source duplicate question candidate
    const { targetQuestionId } = await req.json(); // Canonical question destination

    if (!targetQuestionId) {
      return NextResponse.json({ error: 'Missing targetQuestionId' }, { status: 400 });
    }

    await dbConnect();

    const sourceQuestion = await Question.findById(questionId);
    if (!sourceQuestion) {
      return NextResponse.json({ error: 'Source question not found' }, { status: 404 });
    }

    const targetQuestion = await Question.findOne({
      $or: [
        { _id: targetQuestionId },
        { questionId: targetQuestionId }
      ]
    });
    if (!targetQuestion) {
      return NextResponse.json({ error: 'Target question not found' }, { status: 404 });
    }

    const previousSourceStatus = sourceQuestion.verificationStatus;
    const previousTargetPapers = JSON.stringify(targetQuestion.sourcePapers);

    // Merge sourcePapers from source question into target question
    for (const sourcePaper of sourceQuestion.sourcePapers) {
      const exists = targetQuestion.sourcePapers.some(
        p => p.year === sourcePaper.year && p.examType === sourcePaper.examType
      );
      if (!exists) {
        targetQuestion.sourcePapers.push({
          year: sourcePaper.year,
          examType: sourcePaper.examType
        });
      }
    }

    // Recalculate frequency and latest year
    targetQuestion.repetitionFrequency = targetQuestion.sourcePapers.length;
    const years = targetQuestion.sourcePapers.map((sp) => sp.year);
    targetQuestion.lastAppearedYear = Math.max(...years);

    // Archive the duplicate question candidate
    sourceQuestion.verificationStatus = 'archived';
    sourceQuestion.verificationComment = `Merged as duplicate into canonical question ID: ${targetQuestion.questionId}`;
    sourceQuestion.humanVerified = true;
    sourceQuestion.verifiedBy = user._id;
    sourceQuestion.verifiedAt = new Date();

    const oldSourceVersion = sourceQuestion.version || 1;
    const oldTargetVersion = targetQuestion.version || 1;
    sourceQuestion.version = oldSourceVersion + 1;
    targetQuestion.version = oldTargetVersion + 1;

    // Evict cached solutions
    sourceQuestion.cachedSolution = undefined;

    await targetQuestion.save();
    await sourceQuestion.save();

    // Trigger Redis cache purges asynchronously
    try {
      const { invalidateCache, invalidateCachePattern } = await import('@/lib/redis');
      await invalidateCache(`paperhub:v1:solutions:question:${questionId}:v${oldSourceVersion}`);
      await invalidateCache(`paperhub:v1:solutions:question:${targetQuestion._id}:v${oldTargetVersion}`);
      await invalidateCachePattern(`paperhub:v1:solutions:question:${questionId}:*`);
      await invalidateCachePattern(`paperhub:v1:solutions:question:${targetQuestion._id}:*`);
      await invalidateCachePattern(`paperhub:v1:explanations:step:${questionId}:*`);
      await invalidateCachePattern(`paperhub:v1:explanations:step:${targetQuestion._id}:*`);
      
      // Clear global list caches since new paper coordinates are introduced
      await invalidateCachePattern('paperhub:v1:papers:*');
      await invalidateCachePattern('paperhub:v1:subjects:*');
    } catch (cacheErr) {
      console.warn('[Cache] Redis purge failed on verifier merge duplicate:', cacheErr);
    }

    // Log the audits for both entities
    await AuditLog.create({
      questionId: sourceQuestion._id,
      userId: user._id,
      action: 'archive',
      targetType: 'question',
      targetId: String(sourceQuestion._id),
      previousState: previousSourceStatus,
      newState: 'archived',
      details: `Merged as duplicate into canonical question ${targetQuestion.questionId}`,
      timestamp: new Date()
    });

    await AuditLog.create({
      questionId: targetQuestion._id,
      userId: user._id,
      action: 'edit',
      targetType: 'question',
      targetId: String(targetQuestion._id),
      previousState: previousTargetPapers,
      newState: JSON.stringify(targetQuestion.sourcePapers),
      details: `Merged duplicate question candidate ${sourceQuestion.questionId}. Updated repetition frequency to ${targetQuestion.repetitionFrequency}.`,
      timestamp: new Date()
    });

    return NextResponse.json({
      message: 'Merged duplicate questions successfully',
      sourceQuestion,
      targetQuestion
    });

  } catch (error) {
    console.error('API Error in POST merge duplicate:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { questionId: string } }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: User profile mismatch' }, { status: 401 });
    }

    if (!hasPermission(user.role, ROLES.VERIFIER)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    await dbConnect();
    const { questionId } = params;

    const question = await Question.findById(questionId);
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const previousStatus = question.verificationStatus;

    // Delete the question
    await Question.findByIdAndDelete(questionId);

    // Invalidate Redis caches
    try {
      const { invalidateCachePattern } = await import('@/lib/redis');
      await invalidateCachePattern(`paperhub:v1:solutions:question:${questionId}:*`);
      await invalidateCachePattern(`paperhub:v1:explanations:step:${questionId}:*`);
      await invalidateCachePattern('paperhub:v1:papers:*');
    } catch (cacheErr) {
      console.warn('[Cache] Redis purge failed on verifier delete:', cacheErr);
    }

    // Write audit log
    await AuditLog.create({
      userId: user._id,
      action: 'delete',
      targetType: 'question',
      targetId: questionId,
      previousState: previousStatus,
      newState: 'deleted',
      details: `Deleted question ID ${question.questionId}`,
      timestamp: new Date()
    });

    return NextResponse.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    console.error(`API Error in DELETE /api/verifier/questions/${params.questionId}:`, error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}

