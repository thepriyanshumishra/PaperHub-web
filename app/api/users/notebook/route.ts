import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/user';
import Question from '@/models/question';
import { verifyFirebaseIdToken } from '@/lib/verifyAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const idToken = authHeader.split(' ')[1];
    const verifiedUser = await verifyFirebaseIdToken(idToken);
    if (!verifiedUser) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findById(verifiedUser.uid);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'bookmarks';

    if (type === 'bookmarks') {
      const bookmarkIds = user.bookmarks || [];
      const questions = await Question.find({ _id: { $in: bookmarkIds } });
      return NextResponse.json({ questions });
    } else if (type === 'incorrect') {
      const incorrectIds = user.incorrectAttempts || [];
      const questions = await Question.find({ _id: { $in: incorrectIds } });
      return NextResponse.json({ questions });
    } else if (type === 'notes') {
      const notesMap = user.personalNotes || new Map();
      const questionIds = Array.from(notesMap.keys());
      const questions = await Question.find({ _id: { $in: questionIds } });
      
      const notesWithQuestions = questions.map(q => ({
        question: q,
        note: notesMap.get(String(q._id)) || ''
      }));
      return NextResponse.json({ notes: notesWithQuestions });
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch (error) {
    console.error('API Error in GET /api/users/notebook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
