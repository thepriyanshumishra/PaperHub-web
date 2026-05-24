import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Question from '@/models/question';
import { groq, isAiEnabled } from '@/lib/groq';

interface PopulatedSubject {
  name: string;
  syllabus: { unit: number; title: string; topics: string[] }[];
}

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const questionId = searchParams.get('questionId');

    if (!questionId) {
      return NextResponse.json({ error: 'Missing questionId parameter' }, { status: 400 });
    }

    const question = await Question.findById(questionId).populate('subjectId');
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const subject = question.subjectId as unknown as PopulatedSubject;

    // Return cached solution immediately if present
    if (question.cachedSolution && question.cachedSolution.steps && question.cachedSolution.steps.length > 0) {
      return NextResponse.json({ solution: question.cachedSolution });
    }

    // Fallback Mock Solution if Groq is not configured
    if (!isAiEnabled()) {
      const mockSolution = {
        content: `Step-by-step resolution for: ${question.questionText} (Running in local preview mode without Groq API key).`,
        steps: [
          {
            stepNumber: 1,
            heading: "Initialize Mathematical Model",
            content: `For target topic **${question.topic}**, we set up the initial boundary conditions:\n\n$$y(x) = f(x)$$\n\nIdentify the parameters from the syllabus context of **${subject?.name || 'the subject'}**.`
          },
          {
            stepNumber: 2,
            heading: "Perform Core Steps",
            content: "Applying the appropriate mathematical theorem or algorithm step-by-step:\n\n$$D^n [ f(x) ] = u_{n}v + n u_{n-1}v_1 + \\dots$$\n\nSubstitute the parameters and simplify the terms."
          },
          {
            stepNumber: 3,
            heading: "Obtain Final Result",
            content: "Solve the remaining equations to prove the relation:\n\n$$Q.E.D.$$\n\nThis yields the final simplified relation as expected in the university examinations."
          }
        ],
        generatedAt: new Date()
      };

      question.cachedSolution = mockSolution;
      await question.save();

      return NextResponse.json({ solution: mockSolution });
    }

    // Call Groq Llama 3 API for dynamic solution generation
    const subjectName = subject?.name || 'the subject';
    const syllabus = subject?.syllabus || [];
    const topic = question.topic;

    const prompt = `You are a university mathematics and computer science professor teaching "${subjectName}". 
Generate a clear, step-by-step solution for the following university exam question:
"${question.questionText}"

The question is from Unit ${question.unit}, Topic: "${topic}".
Syllabus detail: ${JSON.stringify(syllabus)}

Instructions:
1. Provide the response as a JSON object containing:
   - "content": A brief introductory paragraph about the problem approach.
   - "steps": A list of steps. Each step must have:
     - "stepNumber": integer starting from 1
     - "heading": brief 2-5 word title of what the step does (e.g. "Differentiate Both Sides")
     - "content": detailed mathematical/algorithmic text explaining the derivation. Use standard LaTeX enclosed in $$ for equations.
2. The explanation must resemble a university exam answer. Use clear, step-by-step reasoning. Do NOT use olympiad shortcuts or off-syllabus tricks. Focus on step-oriented grading points.
3. Keep all LaTeX equations mathematically sound.

Output must be ONLY valid JSON matching this schema:
{
  "content": "string",
  "steps": [
    { "stepNumber": number, "heading": "string", "content": "string" }
  ]
}`;

    const completion = await groq!.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    const parsedSolution = JSON.parse(responseText);

    question.cachedSolution = {
      content: parsedSolution.content || 'Generated Solution:',
      steps: parsedSolution.steps || [],
      generatedAt: new Date()
    };
    await question.save();

    return NextResponse.json({ solution: question.cachedSolution });
  } catch (error) {
    console.error('API Error in /api/ai/solve:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
