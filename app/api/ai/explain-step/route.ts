import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Question from '@/models/question';
import Subject from '@/models/subject';
import { groq, isAiEnabled } from '@/lib/groq';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { questionId, stepNumber, stepText, subjectId, fallbackContext } = body;

    if ((!questionId && !fallbackContext) || !stepNumber || !stepText) {
      return NextResponse.json({ error: 'Missing required parameters: questionId/fallbackContext, stepNumber, stepText' }, { status: 400 });
    }

    // Fallback if Groq API is not active
    if (!isAiEnabled()) {
      return NextResponse.json({
        explanation: `**Concept Explanation (Local Mock):**\nThis step resolves the calculation of Step ${stepNumber}.\n\nIt applies standard mathematical substitutions matching your university syllabus. Ensure to review the formulas for this unit.`
      });
    }

    let subjectName = 'this subject';
    let questionText = '';

    const isMock = !questionId || String(questionId).startsWith('mock') || !mongoose.Types.ObjectId.isValid(questionId);

    if (!isMock) {
      const question = await Question.findById(questionId);
      const subject = await Subject.findById(subjectId || question?.subjectId);
      subjectName = subject?.name || 'this subject';
      questionText = question?.questionText || '';
    } else if (fallbackContext) {
      subjectName = fallbackContext.subjectName || 'this subject';
      questionText = fallbackContext.questionText || '';
    }

    const prompt = `You are a helpful university professor teaching "${subjectName}".
A student is practicing this question:
"${questionText}"

In the generated step-by-step solution, they are confused about Step ${stepNumber}:
"${stepText}"

Explain this step to the student.
1. Provide a brief, simplified description of the conceptual transition, reasoning, or theorem application.
2. If applicable, write down the mini derivation or mathematical formulas used. Format with LaTeX enclosed in $$ for equations.
3. Keep the explanation under 3-4 concise paragraphs. Make it easy to read in a small popover overlay.

Your explanation:`;

    const completion = await groq!.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }]
    });

    const explanation = completion.choices[0]?.message?.content || 'Explanation unavailable.';
    return NextResponse.json({ explanation });
  } catch (error) {
    console.error('API Error in /api/ai/explain-step:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
