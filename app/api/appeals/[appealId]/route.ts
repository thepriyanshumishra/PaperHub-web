import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/verifyAuth';
import { ROLES, hasPermission } from '@/lib/permissions';
import Appeal from '@/models/appeal';
import Session from '@/models/session';
import User from '@/models/user';
import Question from '@/models/question';
import UserTopicPerformance from '@/models/userTopicPerformance';
import EvaluationMetric from '@/models/evaluationMetric';
import AuditLog from '@/models/auditLog';
import { safeErrorResponse, sanitizeText, AI_LIMITS } from '@/lib/promptSafety';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: { appealId: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: User profile mismatch' }, { status: 401 });
    }

    if (!hasPermission(user.role, ROLES.VERIFIER)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    const { appealId } = params;
    const body = await req.json();
    const { status, adjustedScore, resolutionComment } = body;

    if (!status || !['resolved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid or missing status parameter' }, { status: 400 });
    }

    if (status === 'resolved' && (typeof adjustedScore !== 'number' || adjustedScore < 0)) {
      return NextResponse.json({ error: 'Adjusted score must be a positive number' }, { status: 400 });
    }

    await dbConnect();

    const appeal = await Appeal.findById(appealId);
    if (!appeal) {
      return NextResponse.json({ error: 'Appeal not found' }, { status: 404 });
    }

    if (appeal.status !== 'pending') {
      return NextResponse.json({ error: 'Appeal has already been processed' }, { status: 400 });
    }

    const session = await Session.findById(appeal.sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Associated session not found' }, { status: 404 });
    }

    const question = await Question.findById(appeal.questionId);
    if (!question) {
      return NextResponse.json({ error: 'Associated question not found' }, { status: 404 });
    }

    // Apply resolution updates
    appeal.status = status;
    appeal.resolutionComment = sanitizeText(resolutionComment || '', AI_LIMITS.chatMessage);
    appeal.resolvedBy = user._id;

    if (status === 'resolved') {
      appeal.adjustedScore = adjustedScore;

      // Update Session details array
      if (session.evaluationResult && session.evaluationResult.details) {
        const detailIdx = session.evaluationResult.details.findIndex(
          d => String(d.questionId) === String(appeal.questionId)
        );

        if (detailIdx !== -1) {
          const detail = session.evaluationResult.details[detailIdx];
          const previousScore = detail.marksAwarded || 0;
          detail.marksAwarded = adjustedScore;
          detail.status = 'reviewed';
          detail.reviewerComment = resolutionComment;
          detail.reviewedBy = user._id;
          detail.reviewedAt = new Date();

          // Recalculate session obtained marks
          const originalObtained = session.evaluationResult.obtainedMarks;
          const totalMarks = session.evaluationResult.totalMarks || 10;
          const newObtained = session.evaluationResult.details.reduce(
            (sum, d) => sum + (d.marksAwarded || 0), 
            0
          );
          session.evaluationResult.obtainedMarks = newObtained;

          // Adjust Student XP and Topics analytics
          const student = await User.findById(appeal.userId);
          if (student) {
            // For Practice completes: Check if it transitioned from incorrect to correct
            const maxQuestionMarks = question.marks || 10;
            const prevCorrect = (previousScore / maxQuestionMarks) >= 0.7;
            const nowCorrect = (adjustedScore / maxQuestionMarks) >= 0.7;

            let xpDelta = 0;
            if (session.type === 'practice') {
              if (nowCorrect && !prevCorrect) {
                xpDelta = 15; // Student gets standard solve XP
              } else if (!nowCorrect && prevCorrect) {
                xpDelta = -15; // Deduct if downgraded
              }
            } else if (session.type === 'test') {
              // Recalculate test XP difference
              const prevXp = Math.round(100 + (originalObtained / totalMarks) * 100);
              const newXp = Math.round(100 + (newObtained / totalMarks) * 100);
              xpDelta = newXp - prevXp;
            }

            if (xpDelta !== 0) {
              student.engagement.totalXp = Math.max(0, student.engagement.totalXp + xpDelta);
              await student.save();
            }

            // Update user topic analytics
            await UserTopicPerformance.findOneAndUpdate(
              {
                userId: student._id,
                subjectId: question.subjectId,
                topic: question.topic
              },
              {
                $inc: {
                  correct: (nowCorrect && !prevCorrect) ? 1 : ((!nowCorrect && prevCorrect) ? -1 : 0),
                  totalScore: (adjustedScore / maxQuestionMarks * 100) - (previousScore / maxQuestionMarks * 100)
                }
              }
            );
          }

          // Mark EvaluationMetric as overridden
          await EvaluationMetric.findOneAndUpdate(
            { sessionId: session._id, questionId: question._id },
            { isOverridden: true, isAppealed: true, finalScore: adjustedScore }
          );
        }
      }
    } else {
      // Rejected appeal
      if (session.evaluationResult && session.evaluationResult.details) {
        const detail = session.evaluationResult.details.find(
          d => String(d.questionId) === String(appeal.questionId)
        );
        if (detail) {
          detail.status = 'reviewed';
          detail.reviewerComment = `Appeal rejected: ${resolutionComment}`;
          detail.reviewedBy = user._id;
          detail.reviewedAt = new Date();
        }
      }

      await EvaluationMetric.findOneAndUpdate(
        { sessionId: session._id, questionId: question._id },
        { isAppealed: true }
      );
    }

    await session.save();
    await appeal.save();

    // Log resolution to audit logs
    await AuditLog.create({
      questionId: question._id,
      userId: user._id,
      action: status === 'resolved' ? 'edit' : 'archive',
      targetType: 'question',
      targetId: String(question._id),
      previousState: String(appeal.previousScore),
      newState: String(status === 'resolved' ? adjustedScore : appeal.previousScore),
      details: `Resolved student appeal. status: ${status}. Comment: ${resolutionComment}`,
      timestamp: new Date()
    });

    return NextResponse.json({
      message: 'Appeal resolved successfully',
      appeal,
      session
    });

  } catch (error) {
    console.error('API Error in PUT /api/appeals/[appealId]:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
