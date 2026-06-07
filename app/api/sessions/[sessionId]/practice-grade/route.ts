import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Session, { syncSessionTimer } from '@/models/session';
import Question from '@/models/question';
import User from '@/models/user';
import UserTopicPerformance from '@/models/userTopicPerformance';
import Notification from '@/models/notification';
import Activity from '@/models/activity';
import { requireAuthorizedUser } from '@/lib/verifyAuth';
import { sanitizeText, safeErrorResponse } from '@/lib/promptSafety';
import mongoose from 'mongoose';
import { gradeAnswer } from '@/lib/grading';
import EvaluationMetric from '@/models/evaluationMetric';

export const dynamic = 'force-dynamic';

function determineLeague(xp: number): 'beginner' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'elite' {
  if (xp >= 5000) return 'elite';
  if (xp >= 2000) return 'diamond';
  if (xp >= 1000) return 'gold';
  if (xp >= 500) return 'silver';
  if (xp >= 200) return 'bronze';
  return 'beginner';
}

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { user, errorResponse } = await requireAuthorizedUser(req);
    if (errorResponse) return errorResponse;

    const { sessionId } = params;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return NextResponse.json({ error: 'Invalid sessionId format' }, { status: 400 });
    }

    await dbConnect();
    const session = await Session.findById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Enforce ownership
    if (String(session.userId) !== String(user._id)) {
      return NextResponse.json({ error: 'Forbidden: You do not own this session' }, { status: 403 });
    }

    // Server authoritative timer sync
    if (session.isExamMode && session.status === 'active') {
      syncSessionTimer(session);
      if ((session.status as string) === 'completed') {
        await session.save();
        return NextResponse.json({ error: 'Exam time expired. Submissions are closed.', timeExpired: true }, { status: 400 });
      }
    }

    const body = await req.json();
    const { questionId, userAttempt, localDateStr } = body;

    if (!questionId || !userAttempt || typeof userAttempt !== 'string') {
      return NextResponse.json({ error: 'Missing required parameters: questionId, userAttempt' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return NextResponse.json({ error: 'Invalid questionId format' }, { status: 400 });
    }

    // Validate localDateStr (format YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!localDateStr || !dateRegex.test(localDateStr)) {
      return NextResponse.json({ error: 'Missing or invalid parameter: localDateStr must be YYYY-MM-DD' }, { status: 400 });
    }

    // Check that localDateStr is within reasonable bounds of server UTC date (e.g. ±1 day)
    const clientDate = new Date(localDateStr);
    const serverDate = new Date();
    const timeDiff = Math.abs(clientDate.getTime() - serverDate.getTime());
    const dayDiff = timeDiff / (1000 * 60 * 60 * 24);
    if (dayDiff > 2) {
      return NextResponse.json({ error: 'Invalid client date offset. Anti-cheat triggered.' }, { status: 400 });
    }

    const question = await Question.findById(questionId);
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // ─── Step 1: AI Evaluation using specialized rubrics ───────────────────
    const result = await gradeAnswer(question, userAttempt);
    const accuracy = result.score;
    const feedback = result.feedback;
    const isCorrect = accuracy >= 70;

    // Mongoose Transaction with Try-Catch fallback for local environments
    let dbSession = null;
    let isTxActive = false;
    try {
      dbSession = await mongoose.startSession();
      dbSession.startTransaction();
      isTxActive = true;
    } catch (txInitErr) {
      console.warn('[Mongoose Transaction] Inactive replica sets or standalone DB. Falling back to non-transactional atomic updates.');
    }

    try {
      // Log the evaluation metric for staff monitoring
      await EvaluationMetric.create([{
        sessionId: session._id,
        questionId: question._id,
        evaluationMode: question.evaluationMode || 'semantic',
        confidence: result.confidence || 100,
        isEscalated: result.status === 'needs_review',
        originalScore: accuracy,
        finalScore: accuracy,
        isOverridden: false,
        isAppealed: false
      }], { session: dbSession || undefined });

      // Record response details inside session for review queue & student appeal availability
      if (!session.evaluationResult) {
        session.evaluationResult = {
          totalMarks: 0,
          obtainedMarks: 0,
          summaryFeedback: 'Practice sessional evaluation logs',
          details: []
        };
      }

      const existingDetailIdx = session.evaluationResult.details.findIndex(
        (d: any) => String(d.questionId) === String(question._id)
      );

      const gradingDetail = {
        questionId: String(question._id),
        marksAwarded: accuracy,
        feedback: feedback,
        status: result.status,
        confidence: result.confidence,
        reasoning: result.reasoning,
        missingPoints: result.missingPoints,
        originalAnswer: userAttempt
      };

      if (existingDetailIdx !== -1) {
        session.evaluationResult.details[existingDetailIdx] = gradingDetail;
      } else {
        session.evaluationResult.details.push(gradingDetail);
      }

      session.evaluationResult.totalMarks = session.evaluationResult.details.length * 10;
      session.evaluationResult.obtainedMarks = session.evaluationResult.details.reduce(
        (sum: number, d: any) => sum + (d.marksAwarded || 0), 
        0
      );

      if (isTxActive && dbSession) {
        await session.save({ session: dbSession });
      } else {
        await session.save();
      }

      // ─── Step 2: Retrieve and Update User ───────────────────────────────────
      const dbUser = isTxActive && dbSession
        ? await User.findById(user._id).session(dbSession)
        : await User.findById(user._id);
      if (!dbUser) {
        throw new Error('User profile not found');
      }

      if (dbUser.accountStatus !== 'active') {
        throw new Error('Account is suspended or banned');
      }

      const oldLeague = dbUser.engagement.league;
      let xpEarned = 0;
      const lastActive = dbUser.engagement.lastActiveDateStr;
      let streakMilestoneTriggered = false;
      let streak = 0;

      // Check timezone-safe streak and reset daily goals if new day
      if (lastActive !== localDateStr) {
        // New day: Reset daily goal solved count
        dbUser.engagement.dailyGoalSolved = 0;

        if (lastActive) {
          const lastDate = new Date(lastActive);
          const todayDate = new Date(localDateStr);
          const diffTime = todayDate.getTime() - lastDate.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            // Consecutive active learning day
            dbUser.engagement.streakCount += 1;
            streak = dbUser.engagement.streakCount;
            streakMilestoneTriggered = true;
          } else if (diffDays > 1) {
            // Streak broken
            dbUser.engagement.streakCount = 1;
          } else {
            // Client sent an older date or double-click error
            dbUser.engagement.streakCount = Math.max(1, dbUser.engagement.streakCount);
          }
        } else {
          // First activity ever recorded
          dbUser.engagement.streakCount = 1;
        }

        if (dbUser.engagement.streakCount > (dbUser.engagement.longestStreak || 0)) {
          dbUser.engagement.longestStreak = dbUser.engagement.streakCount;
        }

        dbUser.engagement.lastActiveDateStr = localDateStr;
      }

      // Streak milestone notification inside transaction
      if (streakMilestoneTriggered && [3, 7, 14, 30, 50, 100].includes(streak)) {
        if (dbUser.preferences?.streakNotificationsEnabled !== false) {
          await Notification.create([{
            userId: dbUser._id,
            title: 'Streak Milestone! 🔥',
            message: `Incredible consistency! You have maintained an active sessional streak for ${streak} days.`,
            type: 'streak'
          }], { session: dbSession || undefined });
        }
        await Activity.create([{
          userId: dbUser._id,
          type: 'streak_milestone',
          metadata: { streakCount: streak }
        }], { session: dbSession || undefined });
      }

      // Award XP if correct
      if (isCorrect) {
        xpEarned += 15; // 15 XP per correctly solved question

        // Update daily goal count
        if (dbUser.engagement.dailyGoalSolved < dbUser.engagement.dailyGoalTarget) {
          dbUser.engagement.dailyGoalSolved += 1;

          // Daily goal met bonus
          if (dbUser.engagement.dailyGoalSolved === dbUser.engagement.dailyGoalTarget) {
            xpEarned += 30; // +30 XP daily goal completion bonus
            if (!dbUser.engagement.dailyGoalsCompletedDates) {
              dbUser.engagement.dailyGoalsCompletedDates = [];
            }
            if (!dbUser.engagement.dailyGoalsCompletedDates.includes(localDateStr)) {
              dbUser.engagement.dailyGoalsCompletedDates.push(localDateStr);
            }

            // Daily goal met triggers
            if (dbUser.preferences?.goalNotificationsEnabled !== false) {
              await Notification.create([{
                userId: dbUser._id,
                title: 'Daily Goal Completed! 🏁',
                message: `Awesome work! You solved your target of ${dbUser.engagement.dailyGoalTarget} questions today.`,
                type: 'goal'
              }], { session: dbSession || undefined });
            }
            await Activity.create([{
              userId: dbUser._id,
              type: 'daily_goal_achieved',
              metadata: { dailyGoalTarget: dbUser.engagement.dailyGoalTarget }
            }], { session: dbSession || undefined });
          }
        }
      }

      dbUser.engagement.totalXp += xpEarned;
      dbUser.engagement.league = determineLeague(dbUser.engagement.totalXp);

      if (dbUser.engagement.league !== oldLeague) {
        if (dbUser.preferences?.leaderboardNotificationsEnabled !== false) {
          await Notification.create([{
            userId: dbUser._id,
            title: 'League Promotion! 🏆',
            message: `Congratulations! You have been promoted to the ${dbUser.engagement.league} league.`,
            type: 'leaderboard'
          }], { session: dbSession || undefined });
        }
        await Activity.create([{
          userId: dbUser._id,
          type: 'league_promotion',
          metadata: { league: dbUser.engagement.league }
        }], { session: dbSession || undefined });
      }

      if (isTxActive && dbSession) {
        await dbUser.save({ session: dbSession });
      } else {
        await dbUser.save();
      }

      // ─── Step 3: Log Performance (Analytics Foundation) ───────────────────
      await UserTopicPerformance.findOneAndUpdate(
        {
          userId: dbUser._id,
          subjectId: question.subjectId,
          topic: question.topic
        },
        {
          $setOnInsert: { unit: question.unit },
          $inc: {
            attempted: 1,
            correct: isCorrect ? 1 : 0,
            totalScore: accuracy
          }
        },
        { upsert: true, new: true, session: dbSession || undefined }
      );

      if (isTxActive && dbSession) {
        await dbSession.commitTransaction();
        dbSession.endSession();
      }

      return NextResponse.json({
        evaluation: { accuracy, feedback },
        engagement: dbUser.engagement,
        xpEarned
      });
    } catch (txError: any) {
      if (isTxActive && dbSession) {
        await dbSession.abortTransaction();
        dbSession.endSession();
      }
      throw txError;
    }
  } catch (error) {
    console.error('API Error in POST /api/sessions/[sessionId]/practice-grade:', error);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
