import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Session from '@/models/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    await dbConnect();
    const { sessionId } = params;

    const session = await Session.findById(sessionId).populate('questions');
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error(`API Error in GET /api/sessions/${params.sessionId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    await dbConnect();
    const { sessionId } = params;
    const body = await req.json();

    const session = await Session.findById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { currentQuestionIndex, history, testAnalytics, status } = body;

    if (currentQuestionIndex !== undefined) {
      session.currentQuestionIndex = currentQuestionIndex;
    }
    
    if (history !== undefined) {
      session.history = history;
    }
    
    if (testAnalytics !== undefined) {
      session.testAnalytics = {
        tabSwitches: testAnalytics.tabSwitches !== undefined ? testAnalytics.tabSwitches : session.testAnalytics.tabSwitches,
        focusLosses: testAnalytics.focusLosses !== undefined ? testAnalytics.focusLosses : session.testAnalytics.focusLosses,
        fullscreenExits: testAnalytics.fullscreenExits !== undefined ? testAnalytics.fullscreenExits : session.testAnalytics.fullscreenExits
      };
    }
    
    if (status !== undefined) {
      session.status = status;
      if (status === 'completed') {
        session.endedAt = new Date();
      }
    }

    await session.save();

    return NextResponse.json({ session });
  } catch (error) {
    console.error(`API Error in PUT /api/sessions/${params.sessionId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
