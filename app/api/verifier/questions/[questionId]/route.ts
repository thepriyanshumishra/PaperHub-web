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
      question.verifiedAt = new Date();
    } else if (targetStatus === 'flagged') {
      question.humanVerified = false;
      question.flaggedBy = user._id;
      question.flaggedAt = new Date();
      if (previousStatus !== 'flagged') {
        question.flaggedCount = (question.flaggedCount || 0) + 1;
      }
    }

    if (isEdited) {
      question.verificationCorrectionCount = (question.verificationCorrectionCount || 0) + 1;
    }

    await question.save();

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

    await targetQuestion.save();
    await sourceQuestion.save();

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

