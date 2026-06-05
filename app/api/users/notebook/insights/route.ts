import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/user';
import Note from '@/models/note';
import Question from '@/models/question';
import Subject from '@/models/subject';
import { verifyFirebaseIdToken } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
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
    const user = await User.findById(verifiedUser.uid);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.accountStatus !== 'active') {
      return NextResponse.json({ error: 'Unauthorized: Account is suspended or banned' }, { status: 403 });
    }

    // 1. Fetch all notes for the user
    const notes = await Note.find({ userId: user._id }).sort({ updatedAt: -1 }).lean();
    if (notes.length === 0) {
      return NextResponse.json({
        totalNotes: 0,
        recentlyStudiedSubjects: [],
        frequentlyRevisedTopics: [],
        mostReferencedNotes: []
      });
    }

    // 2. Fetch corresponding questions
    const questionIds = notes.map(n => n.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } })
      .populate({ path: 'subjectId', select: 'name code' })
      .lean();

    const questionsMap = new Map(questions.map(q => [String(q._id), q]));

    // 3. Map notes to populated question details
    const notesWithDetail = notes.map(n => {
      const q = questionsMap.get(String(n.questionId));
      return {
        noteText: n.noteText,
        updatedAt: n.updatedAt,
        question: q || null
      };
    }).filter(n => n.question !== null);

    // 4. Calculate Recently Studied Subjects
    // Unique list of subjects sorted by note's updatedAt desc (max 3)
    const recentlyStudiedMap = new Map<string, any>();
    for (const n of notesWithDetail) {
      const subject = (n.question as any).subjectId;
      if (subject && !recentlyStudiedMap.has(String(subject._id))) {
        recentlyStudiedMap.set(String(subject._id), {
          name: subject.name,
          code: subject.code,
          lastStudiedAt: n.updatedAt
        });
      }
      if (recentlyStudiedMap.size >= 3) break;
    }
    const recentlyStudiedSubjects = Array.from(recentlyStudiedMap.values());

    // 5. Calculate Frequently Revised Topics
    // Count occurrences of notes in different topics/subjects
    const topicFrequencyMap = new Map<string, { topic: string; subjectName: string; count: number }>();
    for (const n of notesWithDetail) {
      const q = n.question;
      if (!q) continue;
      const key = `${q.subjectId?._id || 'unknown'}-${q.topic}`;
      const existing = topicFrequencyMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        topicFrequencyMap.set(key, {
          topic: q.topic,
          subjectName: (q as any).subjectId?.name || 'Unknown Subject',
          count: 1
        });
      }
    }
    const frequentlyRevisedTopics = Array.from(topicFrequencyMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 6. Calculate Most Referenced Notes
    // Highly repeated sessional questions (sorted by repetitionFrequency desc, max 5)
    const mostReferencedNotes = [...notesWithDetail]
      .filter(n => n.question && (n.question.repetitionFrequency || 1) >= 1)
      .sort((a, b) => (b.question?.repetitionFrequency || 1) - (a.question?.repetitionFrequency || 1))
      .slice(0, 5)
      .map(n => ({
        noteText: n.noteText,
        topic: n.question?.topic,
        unit: n.question?.unit,
        subjectName: (n.question as any).subjectId?.name || 'Unknown Subject',
        repetitionFrequency: n.question?.repetitionFrequency || 1,
        questionId: n.question?._id
      }));

    return NextResponse.json({
      totalNotes: notes.length,
      recentlyStudiedSubjects,
      frequentlyRevisedTopics,
      mostReferencedNotes
    });
  } catch (error) {
    console.error('API Error in GET /api/users/notebook/insights:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
