import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Question from '@/models/question';
import Subject from '@/models/subject';
import { groq, isAiEnabled } from '@/lib/groq';
import mongoose from 'mongoose';
import { sanitizeAILatex } from '@/lib/sanitizeLaTeX';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { questionId, stepNumber, stepText, subjectId, fallbackContext } = body;

    if ((!questionId && !fallbackContext) || stepNumber === undefined || !stepText) {
      return NextResponse.json({ error: 'Missing required parameters: questionId/fallbackContext, stepNumber, stepText' }, { status: 400 });
    }

    if (questionId && !String(questionId).startsWith('mock') && !mongoose.Types.ObjectId.isValid(questionId)) {
      return NextResponse.json({ error: 'Invalid questionId format' }, { status: 400 });
    }

    if (subjectId && !mongoose.Types.ObjectId.isValid(subjectId)) {
      return NextResponse.json({ error: 'Invalid subjectId format' }, { status: 400 });
    }

    const parsedStep = parseInt(String(stepNumber), 10);
    if (isNaN(parsedStep) || parsedStep <= 0) {
      return NextResponse.json({ error: 'stepNumber must be a positive integer' }, { status: 400 });
    }

    if (typeof stepText !== 'string' || stepText.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid or empty stepText' }, { status: 400 });
    }

    if (stepText.length > 3000) {
      return NextResponse.json({ error: 'stepText parameter is too long (max 3000 characters)' }, { status: 400 });
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
2. Formatting and Layout Guidelines for Explanation:
   - For Mathematics and Math-related subjects (calculus, matrices, algebra, vector fields, etc.):
     * VERY IMPORTANT: Visually separate all mathematical derivations from your text. Do NOT merge them into one giant paragraph.
     * EVERY formula, equation, substitution, or calculation MUST be on its own separate line as a display block wrapped in $$ ... $$.
     * Use inline math (enclosed in $ ... $) ONLY for single variables (like $x$) or very short references (like $f(x)$). NEVER use inline math for actual equations or steps.
     * Example of BAD formatting: "Using the formula $ \\nabla \\times \\vec{F} = 0 $, we substitute $ F_x $..."
     * Example of GOOD formatting: "Using the formula:\n\n$$ \\nabla \\times \\vec{F} = 0 $$\n\nWe substitute the values:"
     * Use bullet points to list properties or assumptions clearly.
   - For all other subjects (Computer Science, Web Development, Electronics, etc.):
     * Make explanations highly structured, readable, and neat.
     * Use bold text (\`**term**\`) to highlight key terminology, variable names, and core concepts.
     * Use bullet points or numbered lists to break down explanations, features, parameters, or steps instead of writing them in messy, dense paragraphs.
3. Keep the explanation under 3-4 concise paragraphs/sections. Make it easy to read in a small popover overlay.

Your explanation:`;

    const completion = await groq!.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }]
    });

    const rawExplanation = completion.choices[0]?.message?.content || 'Explanation unavailable.';
    const explanation = sanitizeAILatex(rawExplanation);
    return NextResponse.json({ explanation });
  } catch (error) {
    console.error('API Error in /api/ai/explain-step:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
