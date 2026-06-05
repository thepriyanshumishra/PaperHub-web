import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/user';
import Question from '@/models/question';
import Note from '@/models/note';
import { verifyFirebaseIdToken } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';

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

    // Instantly deny access if suspended or banned
    if (user.accountStatus !== 'active') {
      return NextResponse.json({ error: 'Unauthorized: Account is suspended or banned' }, { status: 403 });
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
      // Find all notes for this user
      const userNotes = await Note.find({ userId: user._id });
      const questionIds = userNotes.map(n => n.questionId);
      const questions = await Question.find({ _id: { $in: questionIds } });
      
      const questionsMap = new Map(questions.map(q => [String(q._id), q]));
      
      const notesWithQuestions = userNotes.map(n => ({
        question: questionsMap.get(n.questionId) || null,
        note: n.noteText
      })).filter(item => item.question !== null);

      return NextResponse.json({ notes: notesWithQuestions });
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch (error) {
    console.error('API Error in GET /api/users/notebook:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
