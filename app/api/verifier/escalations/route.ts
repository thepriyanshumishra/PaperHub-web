import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/verifyAuth';
import { ROLES, hasPermission } from '@/lib/permissions';
import Session from '@/models/session';
import Question from '@/models/question';
import User from '@/models/user';
import UserTopicPerformance from '@/models/userTopicPerformance';
import EvaluationMetric from '@/models/evaluationMetric';
import AuditLog from '@/models/auditLog';
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

    // Query sessions containing at least one question response detail with needs_review status
    const sessions = await Session.find({
      'evaluationResult.details.status': 'needs_review'
    }).populate('questions');

    const escalations: any[] = [];

    for (const session of sessions) {
      if (session.evaluationResult && session.evaluationResult.details) {
        for (const detail of session.evaluationResult.details) {
          if (detail.status === 'needs_review') {
            const questionInfo = await Question.findById(detail.questionId)
              .select('questionId questionText marks modelAnswer keyPoints evaluationMode');

            escalations.push({
              sessionId: session._id,
              sessionType: session.type,
              userId: session.userId,
              detailId: (detail as any)._id,
              question: questionInfo,
              marksAwarded: detail.marksAwarded,
              feedback: detail.feedback,
              confidence: detail.confidence,
              reasoning: detail.reasoning,
              missingPoints: detail.missingPoints,
              originalAnswer: detail.originalAnswer || '(Image scan solution)',
              createdAt: session.updatedAt
            });
          }
        }
      }
    }

    // Sort by oldest first to process queues sequentially
    escalations.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return NextResponse.json({ escalations });

  } catch (error) {
    console.error('API Error in GET /api/verifier/escalations:', error);
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
    const { sessionId, questionId, adjustedScore, reviewerComment } = body;

    if (!sessionId || !questionId || typeof adjustedScore !== 'number' || adjustedScore < 0) {
      return NextResponse.json({ error: 'Missing or invalid parameters' }, { status: 400 });
    }

    await dbConnect();

    const session = await Session.findById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const question = await Question.findById(questionId);
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    if (!session.evaluationResult || !session.evaluationResult.details) {
      return NextResponse.json({ error: 'No grading details found' }, { status: 400 });
    }

    const detailIdx = session.evaluationResult.details.findIndex(
      d => String(d.questionId) === String(questionId)
    );

    if (detailIdx === -1) {
      return NextResponse.json({ error: 'Question response not found in session details' }, { status: 404 });
    }

    const detail = session.evaluationResult.details[detailIdx];
    const previousScore = detail.marksAwarded || 0;
    detail.marksAwarded = adjustedScore;
    detail.status = 'reviewed';
    detail.reviewerComment = reviewerComment;
    detail.reviewedBy = user._id;
    detail.reviewedAt = new Date();

    const originalObtained = session.evaluationResult.obtainedMarks;
    const totalMarks = session.evaluationResult.totalMarks || 10;
    const newObtained = session.evaluationResult.details.reduce(
      (sum, d) => sum + (d.marksAwarded || 0), 
      0
    );
    session.evaluationResult.obtainedMarks = newObtained;

    // Adjust student XP and topic stats
    const student = await User.findById(session.userId);
    if (student) {
      const maxQuestionMarks = question.marks || 10;
      const prevCorrect = (previousScore / maxQuestionMarks) >= 0.7;
      const nowCorrect = (adjustedScore / maxQuestionMarks) >= 0.7;

      let xpDelta = 0;
      if (session.type === 'practice') {
        if (nowCorrect && !prevCorrect) {
          xpDelta = 15;
        } else if (!nowCorrect && prevCorrect) {
          xpDelta = -15;
        }
      } else if (session.type === 'test') {
        const prevXp = Math.round(100 + (originalObtained / totalMarks) * 100);
        const newXp = Math.round(100 + (newObtained / totalMarks) * 100);
        xpDelta = newXp - prevXp;
      }

      if (xpDelta !== 0) {
        student.engagement.totalXp = Math.max(0, student.engagement.totalXp + xpDelta);
        await student.save();
      }

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
      { isOverridden: true, finalScore: adjustedScore }
    );

    await session.save();

    // Log resolution to audit logs
    await AuditLog.create({
      questionId: question._id,
      userId: user._id,
      action: 'edit',
      targetType: 'question',
      targetId: String(question._id),
      previousState: String(previousScore),
      newState: String(adjustedScore),
      details: `Resolved automatic AI escalation. Comment: ${reviewerComment}`,
      timestamp: new Date()
    });

    return NextResponse.json({
      message: 'Escalation resolved successfully',
      session
    });

  } catch (error) {
    console.error('API Error in PUT /api/verifier/escalations:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
