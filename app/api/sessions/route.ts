import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Session from '@/models/session';
import Question from '@/models/question';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { userId, subjectId, type, subType, config, evaluationMethod } = body;

    if (!userId || !subjectId || !type || !subType || !config) {
      return NextResponse.json({ error: 'Missing required parameters: userId, subjectId, type, subType, config' }, { status: 400 });
    }

    const { units, topics, questionCount } = config;

    const query: {
      subjectId: string;
      unit?: { $in: number[] };
      topic?: { $in: string[] };
    } = { subjectId };
    
    if (units && units.length > 0) {
      query.unit = { $in: units };
    }
    
    if (topics && topics.length > 0) {
      query.topic = { $in: topics };
    }

    // Pull candidate questions
    const candidates = await Question.find(query);
    if (candidates.length === 0) {
      return NextResponse.json({ error: 'No questions found matching configuration' }, { status: 404 });
    }

    // Shuffle and slice
    const shuffled = candidates.sort(() => 0.5 - Math.random());
    const limit = type === 'practice' ? shuffled.length : (questionCount || 5);
    const selectedQuestions = shuffled.slice(0, limit).map((q) => q._id);

    const session = await Session.create({
      userId,
      subjectId,
      type,
      subType,
      config: {
        ...config,
        questionCount: limit
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
      status: 'active'
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error('API Error in POST /api/sessions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
