import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Session from '@/models/session';
import Question from '@/models/question';
import User from '@/models/user';
import { verifyFirebaseIdToken } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';
import { checkUsageLimit } from '@/lib/featureGate';
import { getMonthlyUsage, incrementMonthlyUsage, incrementLifetimeUsage } from '@/lib/usageTracker';

export async function POST(req: NextRequest) {
  try {
    // Authenticate the caller before creating a session
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing Authorization Bearer token' }, { status: 401 });
    }

    const idToken = authHeader.split(' ')[1];
    const verifiedUser = await verifyFirebaseIdToken(idToken);
    if (!verifiedUser) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const { subjectId, type, subType, config, evaluationMethod } = body;

    // Always use the authenticated user's uid — never trust userId from the body
    const userId = verifiedUser.uid;

    if (!subjectId || !type || !subType || !config) {
      return NextResponse.json({ error: 'Missing required parameters: subjectId, type, subType, config' }, { status: 400 });
    }

    // Check usage limits for mock tests
    if (type === 'test') {
      const userDoc = await User.findById(userId).select('plan');
      const userPlan = userDoc?.plan || 'beta_pro';
      const monthlyUsage = await getMonthlyUsage(userId, 'mockTests');
      const limitCheck = checkUsageLimit(userPlan, 'mockTestsPerMonth', monthlyUsage);
      if (!limitCheck.allowed) {
        return NextResponse.json({
          error: 'Monthly mock test limit reached. Upgrade to Pro/Institution to create unlimited mock tests.'
        }, { status: 403 });
      }
    }

    const { units, topics, questionCount, difficulty, selections } = config;

    let primarySubjectId = subjectId;
    let allSubjectIds: string[] = [];
    if (Array.isArray(subjectId)) {
      primarySubjectId = subjectId[0];
      allSubjectIds = subjectId;
    } else if (typeof subjectId === 'string') {
      primarySubjectId = subjectId;
      allSubjectIds = [subjectId];
    } else if (selections && Array.isArray(selections) && selections.length > 0) {
      primarySubjectId = selections[0].subjectId;
      allSubjectIds = selections.map((s: any) => s.subjectId);
    }

    let allUnits: number[] = [];
    let allTopics: string[] = [];
    let orConditions: any[] = [];

    if (selections && Array.isArray(selections) && selections.length > 0) {
      allUnits = selections.flatMap((s: any) => s.units || []);
      allTopics = selections.flatMap((s: any) => s.topics || []);
      for (const sel of selections) {
        const cond: any = { subjectId: sel.subjectId };
        if (sel.units && sel.units.length > 0) {
          cond.unit = { $in: sel.units };
        }
        if (sel.topics && sel.topics.length > 0) {
          cond.topic = { $in: sel.topics };
        }
        orConditions.push(cond);
      }
    } else {
      allUnits = units || [];
      allTopics = topics || [];
      const cond: any = { subjectId: { $in: allSubjectIds } };
      if (units && units.length > 0) {
        cond.unit = { $in: units };
      }
      if (topics && topics.length > 0) {
        cond.topic = { $in: topics };
      }
      orConditions.push(cond);
    }

    const query: any = {
      $or: orConditions
    };

    if (difficulty && difficulty !== 'all' && difficulty !== 'All Levels') {
      query.difficulty = difficulty.toLowerCase();
    }

    // Pull candidate questions
    const candidates = await Question.find(query);
    if (candidates.length === 0) {
      return NextResponse.json({ error: 'No questions found matching configuration' }, { status: 404 });
    }

    // Shuffle and slice
    let shuffled = candidates.sort(() => 0.5 - Math.random());
    const limit = type === 'practice' ? shuffled.length : (questionCount || 5);
    let selectedQuestions = shuffled.slice(0, limit).map((q) => q._id);

    if (config.startQuestionId) {
      const startIdStr = config.startQuestionId.toString();
      const foundIdx = selectedQuestions.findIndex((qId) => qId.toString() === startIdStr);
      if (foundIdx !== -1) {
        const [qId] = selectedQuestions.splice(foundIdx, 1);
        selectedQuestions = [qId, ...selectedQuestions];
      } else {
        const candidateQ = candidates.find((c) => c._id.toString() === startIdStr);
        if (candidateQ) {
          selectedQuestions = [candidateQ._id, ...selectedQuestions.slice(0, limit - 1)];
        }
      }
    }

    const isExam = type === 'test';
    const durationMins = body.duration || config.duration || 60; // in minutes
    const durationSeconds = durationMins * 60;

    const session = await Session.create({
      userId,
      subjectId: primarySubjectId,
      type,
      subType,
      config: {
        ...config,
        units: allUnits,
        topics: allTopics,
        questionCount: limit,
        subjectIds: allSubjectIds,
        selections: selections || []
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
      evaluationMethod: evaluationMethod || 'self',
      testResponses: selectedQuestions.map((qId) => ({
        questionId: qId,
        selfScore: undefined,
        score: undefined,
        notes: ''
      })),
      status: 'active',
      isExamMode: isExam,
      examDuration: isExam ? durationSeconds : undefined,
      timeRemaining: isExam ? durationSeconds : undefined,
      timerLastSyncedAt: isExam ? new Date() : undefined
    });

    // Track usage
    if (type === 'test') {
      await incrementMonthlyUsage(userId, 'mockTests');
      await incrementLifetimeUsage(userId, 'totalMockTests');
    } else {
      await incrementLifetimeUsage(userId, 'totalSessions');
    }

    return NextResponse.json({ session });
  } catch (error) {
    // V4: Never expose internal error details to clients in production
    console.error('API Error in POST /api/sessions:', safeErrorResponse(error));
    return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }
}
