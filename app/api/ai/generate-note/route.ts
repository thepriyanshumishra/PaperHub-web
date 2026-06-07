import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Question from '@/models/question';
import { groq, isAiEnabled } from '@/lib/groq';
import { requireAuthorizedUser } from '@/lib/verifyAuth';
import { sanitizeText, safeErrorResponse, AI_LIMITS } from '@/lib/promptSafety';
import { isRateLimited } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';
import mongoose from 'mongoose';
import { getOrSetCache } from '@/lib/redis';

interface PopulatedSubject {
  name: string;
}

export const dynamic = 'force-dynamic';

function buildGenerateNotePrompt(
  subjectName: string,
  questionText: string,
  topic: string
): string {
  return `You are an expert university engineering professor tutoring a student on the subject "${subjectName}".
Generate a concise, high-yield study note (2-3 paragraphs or bullet points) summarizing:
1. The core concept behind this question.
2. The key formulas, theorem definitions, or code patterns required to solve it.
3. A memory tip or common pitfall to avoid.

Syllabus/Question topic: ${topic}

Question text:
${questionText}

Format equations strictly using standard LaTeX: use inline $...$ for equations/variables within text, and display $$...$$ on their own separate lines for major equations.
Return ONLY clean markdown. Do not include markdown code block wrapper (no triple backticks).`;
}

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAuthorizedUser(req);
  if (errorResponse) return errorResponse;

  const userId = user._id;
  // Rate limit: 10 note generations per minute per user
  if (await isRateLimited(`generate-note-get-${userId}`, 10, 60 * 1000)) {
    logger.warn(`User is rate limited on GET generate-note API`, userId, { endpoint: '/api/ai/generate-note' });
    return NextResponse.json({ error: 'Too many requests. Please wait a minute and try again.' }, { status: 429 });
  }

  logger.info(`User requested AI study note for question`, userId);

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get('questionId');

    if (!questionId) {
      return NextResponse.json({ error: 'Missing questionId parameter' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return NextResponse.json({ error: 'Invalid questionId format' }, { status: 400 });
    }

    const questionDoc = await Question.findById(questionId).select('version');
    const currentVersion = questionDoc ? (questionDoc.version || 1) : 1;
    const cacheKey = `paperhub:v1:notes:question:${questionId}:v${currentVersion}`;

    const cacheResult = await getOrSetCache(cacheKey, async () => {
      const question = await Question.findById(questionId).populate('subjectId');
      if (!question) {
        throw new Error('Question not found');
      }

      const subject = question.subjectId as unknown as PopulatedSubject;

      // 1. Return cached note immediately if present in MongoDB
      if (question.cachedNote && question.cachedNote.trim().length > 0) {
        return { noteText: question.cachedNote };
      }

      // 2. Fallback Mock Note if Groq is not configured
      if (!isAiEnabled()) {
        const safeQText = sanitizeText(question.questionText, AI_LIMITS.questionText);
        const safeTopic = sanitizeText(question.topic, AI_LIMITS.topic);
        const safeSubjectName = sanitizeText(subject?.name, AI_LIMITS.subjectName) || 'the subject';

        const mockNote = `### Core Concept: ${safeTopic}
This question evaluates your understanding of ${safeTopic} within the context of ${safeSubjectName}. 

### Key Formulas & Methods:
For this topic, remember the fundamental relation:
$$y(x) = \\int f(x) \\, dx$$

Make sure to apply initial boundary conditions carefully:
- If boundary integration is required, identify $C$ first.
- Double check intermediate algebraic steps.

### Exam Tip:
Ensure that you structure your explanation steps clearly. University examiners look for step-by-step logic in partial grading schemes.`;

        question.cachedNote = mockNote;
        await question.save();

        return { noteText: mockNote };
      }

      // 3. Generate note using Groq
      const subjectName = sanitizeText(subject?.name, AI_LIMITS.subjectName) || 'the subject';
      const safeQuestionText = sanitizeText(question.questionText, AI_LIMITS.questionText);
      const safeTopic = sanitizeText(question.topic, AI_LIMITS.topic);

      const prompt = buildGenerateNotePrompt(subjectName, safeQuestionText, safeTopic);

      let modelToUse = 'llama-3.3-70b-versatile';
      let completion;
      let responseText = '';

      try {
        completion = await groq!.chat.completions.create({
          model: modelToUse,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1500,
        });
        responseText = completion.choices[0]?.message?.content || '';
      } catch (err70b) {
        console.warn('Llama 70B generate note failed, falling back to Llama 8B:', err70b);
        modelToUse = 'llama-3.1-8b-instant';
        completion = await groq!.chat.completions.create({
          model: modelToUse,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1500,
        });
        responseText = completion.choices[0]?.message?.content || '';
      }

      // Save generated note to MongoDB
      question.cachedNote = responseText.trim();
      await question.save();

      return { noteText: question.cachedNote };
    }, 30 * 24 * 60 * 60); // 30 days TTL

    return NextResponse.json(cacheResult);
  } catch (error: any) {
    if (error.message === 'Question not found') {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }
    console.error('API Error in GET /api/ai/generate-note:', safeErrorResponse(error));
    return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }
}
