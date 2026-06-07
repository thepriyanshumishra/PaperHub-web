import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Session from '@/models/session';
import Question from '@/models/question';
import TestBlueprint from '@/models/testBlueprint';
import { requireAuthorizedUser } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';

export const dynamic = 'force-dynamic';

// Seed-based random number generators for reproducible mock test generation
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
    const { blueprintId } = body;

    if (!blueprintId || !mongoose.Types.ObjectId.isValid(blueprintId)) {
      return NextResponse.json({ error: 'Missing or invalid blueprintId parameter' }, { status: 400 });
    }

    const blueprint = await TestBlueprint.findById(blueprintId);
    if (!blueprint) {
      return NextResponse.json({ error: 'Blueprint not found' }, { status: 404 });
    }

    // Load user's solved questions history to prioritize unattempted questions (prevent repetition)
    const userSessions = await Session.find({ userId }).lean();
    const solvedQuestionIds = new Set<string>();
    userSessions.forEach((s) => {
      if (s.questions) {
        s.questions.forEach((qId) => solvedQuestionIds.add(String(qId)));
      }
    });

    const seed = Math.floor(Math.random() * 1000000) + 1;
    const selectedQuestions: mongoose.Types.ObjectId[] = [];

    // Select questions group-by-group from distribution
    for (const group of blueprint.questionDistribution) {
      // 1. Direct query: match unit, difficulty, and marks
      let candidates = await Question.find({
        subjectId: blueprint.subjectId,
        unit: group.unit,
        difficulty: group.difficulty,
        marks: group.marks,
        verificationStatus: { $in: ['verified', 'pending'] }
      }).lean();

      // Fallback 1: relax difficulty
      if (candidates.length < group.count) {
        candidates = await Question.find({
          subjectId: blueprint.subjectId,
          unit: group.unit,
          marks: group.marks,
          verificationStatus: { $in: ['verified', 'pending'] }
        }).lean();
      }

      // Fallback 2: relax difficulty and marks (any marks in that unit)
      if (candidates.length < group.count) {
        candidates = await Question.find({
          subjectId: blueprint.subjectId,
          unit: group.unit,
          verificationStatus: { $in: ['verified', 'pending'] }
        }).lean();
      }

      // Fallback 3: relax unit too (any verified/pending question for subject)
      if (candidates.length < group.count) {
        candidates = await Question.find({
          subjectId: blueprint.subjectId,
          verificationStatus: { $in: ['verified', 'pending'] }
        }).lean();
      }

      if (candidates.length === 0) {
        return NextResponse.json({ error: 'Incomplete question database: unable to generate sessional paper.' }, { status: 400 });
      }

      // Prioritize fresh questions: Sort unattempted questions before attempted ones
      const freshCandidates = candidates.filter(q => !solvedQuestionIds.has(String(q._id)));
      const attemptedCandidates = candidates.filter(q => solvedQuestionIds.has(String(q._id)));

      const shuffledFresh = seededShuffle(freshCandidates, seed);
      const shuffledAttempted = seededShuffle(attemptedCandidates, seed);

      // Combine both lists, keeping fresh ones first
      const orderedCandidates = [...shuffledFresh, ...shuffledAttempted];

      // Select and avoid duplicates in the same exam paper
      let selectedFromGroupCount = 0;
      for (const qObj of orderedCandidates) {
        const qObjId = qObj._id as mongoose.Types.ObjectId;
        if (selectedFromGroupCount < group.count && !selectedQuestions.some(id => String(id) === String(qObjId))) {
          selectedQuestions.push(qObjId);
          selectedFromGroupCount += 1;
        }
      }

      // Backup selector if distinct constraint is too tight
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

    const session = await Session.create({
      userId,
      subjectId: blueprint.subjectId,
      type: 'test',
      subType: blueprint.examType,
      config: {
        units: Array.from(new Set(blueprint.questionDistribution.map(g => g.unit))),
        topics: [],
        questionCount: selectedQuestions.length
      },
      questions: selectedQuestions,
      currentQuestionIndex: 0,
      history: selectedQuestions.map((qId) => ({
        questionId: qId,
        viewedSolution: false,
        aiQueriesCount: 0
      })),
      testAnalytics: {
        tabSwitches: 0,
        focusLosses: 0,
        fullscreenExits: 0
      },
      evaluationMethod: 'self', // Default to self assessment, user can toggle photo
      testResponses: selectedQuestions.map((qId) => ({
        questionId: qId,
        selfScore: undefined,
        score: undefined,
        notes: ''
      })),
      status: 'active',
      blueprintId: blueprint._id,
      isExamMode: true,
      examDuration: durationSeconds,
      timeRemaining: durationSeconds,
      timerLastSyncedAt: new Date(),
      seed: seed
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error('API Error in POST /api/sessions/generate-test:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
