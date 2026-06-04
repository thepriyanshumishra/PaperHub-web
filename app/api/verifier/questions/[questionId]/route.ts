import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Question from '@/models/question';
import { getAuthenticatedUser } from '@/lib/verifyAuth';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { questionId: string } }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: User profile mismatch' }, { status: 401 });
    }

    if (user.role !== 'verifier' && user.role !== 'moderator' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    const { questionId } = params;
    const body = await req.json();
    const { 
      verificationStatus, 
      verificationComment, 
      questionText, 
      topic, 
      unit, 
      marks,
      difficulty
    } = body;

    if (!verificationStatus || !['verified', 'flagged', 'pending'].includes(verificationStatus)) {
      return NextResponse.json({ error: 'Invalid verificationStatus value' }, { status: 400 });
    }

    // Require comment when flagging a question
    if (verificationStatus === 'flagged' && (!verificationComment || verificationComment.trim().length === 0)) {
      return NextResponse.json({ error: 'A comment is required when flagging a question for review' }, { status: 400 });
    }

    await dbConnect();

    const question = await Question.findById(questionId);
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Apply inline field edits if present
    if (questionText !== undefined) question.questionText = questionText;
    if (topic !== undefined) question.topic = topic;
    if (unit !== undefined) question.unit = unit;
    if (marks !== undefined) question.marks = marks;
    if (difficulty !== undefined) question.difficulty = difficulty;

    // Apply verification updates
    question.verificationStatus = verificationStatus;
    question.verificationComment = verificationComment !== undefined ? verificationComment : question.verificationComment;
    question.verifiedBy = user._id;

    if (verificationStatus === 'verified') {
      question.humanVerified = true;
    } else if (verificationStatus === 'flagged') {
      question.humanVerified = false;
    }

    await question.save();

    return NextResponse.json({ question });
  } catch (error) {
    console.error(`API Error in PUT /api/verifier/questions/${params.questionId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
