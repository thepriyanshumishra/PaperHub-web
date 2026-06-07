import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Session from '@/models/session';
import Question from '@/models/question';
import TestBlueprint from '@/models/testBlueprint';
import { requireAuthorizedUser } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';

export const dynamic = 'force-dynamic';

function seedRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function seededShuffle<T>(array: T[], seed: number): T[] {
  const arr = [...array];
  let m = arr.length, t, i;
  let currentSeed = seed;
  while (m) {
    const rand = seedRandom(currentSeed++);
    i = Math.floor(rand * m--);
    t = arr[m];
    arr[m] = arr[i];
    arr[i] = t;
  }
  return arr;
}

export async function POST(req: NextRequest) {
  try {
  // ─── Step 1: Authentication & Authorization ───────────────────────────────
  const { user, errorResponse } = await requireAuthorizedUser(req);
  if (errorResponse) return errorResponse;

  const userId = user._id;

    await dbConnect();
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return NextResponse.json({ error: 'Missing or invalid sessionId parameter' }, { status: 400 });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify ownership
    if (String(session.userId) !== String(userId)) {
      return NextResponse.json({ error: 'Forbidden: You do not own this session' }, { status: 403 });
    }

    // Must be an active sessional exam mode test to allow regeneration
    if (!session.isExamMode || !session.blueprintId) {
      return NextResponse.json({ error: 'Cannot regenerate: session is not an exam simulation' }, { status: 400 });
    }

    const blueprint = await TestBlueprint.findById(session.blueprintId);
    if (!blueprint) {
      return NextResponse.json({ error: 'Associated test blueprint not found' }, { status: 404 });
    }

    // Load user's solved questions history to prioritize unattempted questions
    const userSessions = await Session.find({ userId }).lean();
    const solvedQuestionIds = new Set<string>();
    userSessions.forEach((s) => {
      if (s.questions) {
        s.questions.forEach((qId) => {
          if (String(s._id) !== String(sessionId)) {
            solvedQuestionIds.add(String(qId));
          }
        });
      }
    });

    const seed = Math.floor(Math.random() * 1000000) + 1;
    const selectedQuestions: mongoose.Types.ObjectId[] = [];

    // Select questions group-by-group from distribution
    for (const group of blueprint.questionDistribution) {
      let candidates = await Question.find({
        subjectId: blueprint.subjectId,
        unit: group.unit,
        difficulty: group.difficulty,
        marks: group.marks,
        verificationStatus: 'verified'
      }).lean();

      // Fallbacks
      if (candidates.length < group.count) {
        candidates = await Question.find({
          subjectId: blueprint.subjectId,
          unit: group.unit,
          marks: group.marks,
          verificationStatus: 'verified'
        }).lean();
      }

      if (candidates.length < group.count) {
        candidates = await Question.find({
          subjectId: blueprint.subjectId,
          unit: group.unit,
          verificationStatus: 'verified'
        }).lean();
      }

      if (candidates.length < group.count) {
        candidates = await Question.find({
          subjectId: blueprint.subjectId,
          verificationStatus: 'verified'
        }).lean();
      }

      if (candidates.length === 0) {
        return NextResponse.json({ error: 'Incomplete question database: unable to generate sessional paper.' }, { status: 400 });
      }

      const freshCandidates = candidates.filter(q => !solvedQuestionIds.has(String(q._id)));
      const attemptedCandidates = candidates.filter(q => solvedQuestionIds.has(String(q._id)));

      const shuffledFresh = seededShuffle(freshCandidates, seed);
      const shuffledAttempted = seededShuffle(attemptedCandidates, seed);
      const orderedCandidates = [...shuffledFresh, ...shuffledAttempted];

      let selectedFromGroupCount = 0;
      for (const qObj of orderedCandidates) {
        const qObjId = qObj._id as mongoose.Types.ObjectId;
        if (selectedFromGroupCount < group.count && !selectedQuestions.some(id => String(id) === String(qObjId))) {
          selectedQuestions.push(qObjId);
          selectedFromGroupCount += 1;
        }
      }

      if (selectedFromGroupCount < group.count) {
        for (const qObj of orderedCandidates) {
          const qObjId = qObj._id as mongoose.Types.ObjectId;
          if (selectedFromGroupCount < group.count) {
            selectedQuestions.push(qObjId);
            selectedFromGroupCount += 1;
          }
        }
      }
    }

    const durationSeconds = blueprint.duration * 60;

    // Reset session fields for new test attempt
    session.questions = selectedQuestions;
    session.currentQuestionIndex = 0;
    session.history = selectedQuestions.map((qId) => ({
      questionId: qId,
      viewedSolution: false,
      aiQueriesCount: 0
    }));
    session.testResponses = selectedQuestions.map((qId) => ({
      questionId: qId,
      selfScore: undefined,
      score: undefined,
      notes: ''
    }));
    session.testAnalytics = {
      tabSwitches: 0,
      focusLosses: 0,
      fullscreenExits: 0
    };
    session.status = 'active';
    session.examDuration = durationSeconds;
    session.timeRemaining = durationSeconds;
    session.timerLastSyncedAt = new Date();
    session.startedAt = new Date();
    session.endedAt = undefined;
    session.seed = seed;
    session.uploadedImages = [];
    session.evaluationResult = undefined;

    await session.save();

    return NextResponse.json({ session });
  } catch (error) {
    console.error('API Error in POST /api/sessions/regenerate-test:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
