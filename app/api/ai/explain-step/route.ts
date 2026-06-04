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
    let solutionType = 'stepwise';

    const isMock = !questionId || String(questionId).startsWith('mock') || !mongoose.Types.ObjectId.isValid(questionId);

    if (!isMock) {
      const question = await Question.findById(questionId);
      const subject = await Subject.findById(subjectId || question?.subjectId);
      subjectName = subject?.name || 'this subject';
      questionText = question?.questionText || '';
      if (question?.cachedSolution?.type) {
        solutionType = question.cachedSolution.type;
      }
    } else if (fallbackContext) {
      subjectName = fallbackContext.subjectName || 'this subject';
      questionText = fallbackContext.questionText || '';
      if (fallbackContext.solutionType) {
        solutionType = fallbackContext.solutionType;
      }
    }

    const isTheoretical = solutionType === 'theoretical';

    const prompt = `You are a university mathematics and computer science professor teaching "${subjectName}".
A student is practicing this question:
"${questionText}"

In the generated solution, they are reading the section:
"${stepText}"

Explain this ${isTheoretical ? 'section' : `Step ${stepNumber}`} to the student.

CRITICAL INSTRUCTIONS FOR HIGH LEGIBILITY & READABILITY (MUST BE STICTLY FOLLOWED):
1. NO DENSE PARAGRAPHS: Do NOT write long, dense paragraphs of text. Students find walls of text extremely difficult to read.
2. EXTREMELY HIGH SPACING: Space out your explanation heavily. Precede and follow EVERY mathematical display block, list, and header with double newlines (\\n\\n).
3. BULLETED / STRUCTURED LISTS: Break down your conceptual explanation into a clean, bulleted or numbered list where each point starts with a bold key term (e.g. "**Substitution:** ...", "**Derivative:** ...").
4. MATHEMATICAL DELIMITER RULES:
   - EVERY mathematical variable, symbol, expression, or equation MUST be wrapped in either $ ... $ (inline) or $$ ... $$ (display block).
   - INLINE MATH ($...$): ONLY use for single variables (e.g., $x$, $y$, $m$, $t$) or single constants/terms (e.g., $C_1$, $x^m$, $e^t$). NEVER write equations with equal signs (=), fractions, derivatives, integrals, or multi-term algebraic steps inline inside a sentence!
   - DISPLAY MATH ($$...$$): EVERY equation, derivative calculation, substitution, simplification, or algebraic step MUST be separated on its own line and wrapped in $$ ... $$, preceded and followed by a double newline (\\n\\n).
   - DO NOT inline equations like dy/dx = mx^{m-1} in prose text. Put them in centered $$ ... $$ blocks!

GOLD STANDARD MATH FORMATTING EXAMPLE (REQUIRED FORMAT):
"To find the homogeneous solution, we use the following key concepts:

- **Substitution**: We substitute the assumed power solution:

  $$y = x^m$$

- **First Derivative**: Differentiating with respect to $x$ gives:

  $$\\frac{dy}{dx} = m x^{m-1}$$

- **Second Derivative**: Differentiating again yields:

  $$\\frac{d^2y}{dx^2} = m(m-1)x^{m-2}$$

Now, we substitute these derivatives back into the homogeneous part..."

Keep the explanation short, neat, highly structured, and under 3-4 spaced sections.

Your explanation:`;

    // Explain Step Pass: primary model Llama 3.3 70B for maximum premium formatting and academic accuracy, fallback to 8B on failure.
    let modelToUse = 'llama-3.3-70b-versatile';
    let completion;
    let rawExplanation = '';

    try {
      completion = await groq!.chat.completions.create({
        model: modelToUse,
        messages: [{ role: 'user', content: prompt }]
      });
      rawExplanation = completion.choices[0]?.message?.content || 'Explanation unavailable.';
    } catch (err70b) {
      console.warn('Llama 70B explain-step failed, falling back to Llama 8B:', err70b);
      modelToUse = 'llama-3.1-8b-instant';
      completion = await groq!.chat.completions.create({
        model: modelToUse,
        messages: [{ role: 'user', content: prompt }]
      });
      rawExplanation = completion.choices[0]?.message?.content || 'Explanation unavailable.';
    }

    const explanation = sanitizeAILatex(rawExplanation);
    return NextResponse.json({ explanation });
  } catch (error) {
    console.error('API Error in /api/ai/explain-step:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
