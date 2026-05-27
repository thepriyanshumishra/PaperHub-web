import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Question from '@/models/question';
import { groq, isAiEnabled } from '@/lib/groq';
import { sanitizeSolutionObject } from '@/lib/sanitizeLaTeX';
import mongoose from 'mongoose';

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

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return NextResponse.json({ error: 'Invalid questionId format' }, { status: 400 });
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
     - "content": detailed mathematical/algorithmic text explaining the derivation.
2. Formatting and Layout Guidelines for Content:
   - For Mathematics and Math-related subjects (calculus, matrices, algebra, vector fields, etc.):
     * VERY IMPORTANT: Visually separate all mathematical derivations from your text. Do NOT merge them into one giant paragraph.
     * EVERY formula, equation, substitution, or calculation MUST be on its own separate line as a display block wrapped in double dollar signs (example: $$ y = mx + c $$).
     * Use inline math ONLY for single variables or very short references, wrapped in single dollar signs (example: $x$ or $f(x)$). NEVER use inline math for actual equations or steps.
     * Example of BAD formatting: "Using the formula $ \\nabla \\times \\vec{F} = 0 $, we substitute $ F_x $..."
     * Example of GOOD formatting: "Using the formula:\n\n$$ \\nabla \\times \\vec{F} = 0 $$\n\nWe substitute the values:"
     * Use bullet points to list properties or assumptions clearly.
   - For all other subjects (Computer Science, Web Development, Electronics, etc.):
     * Make explanations highly structured, readable, and neat.
     * Use bold text (\`**term**\`) to highlight key terminology, variable names, and core concepts.
     * Use bullet points or numbered lists to break down explanations, features, parameters, or steps instead of writing them in messy, dense paragraphs.
3. The explanation must resemble a university exam model answer. Use clear, step-by-step reasoning. Do NOT use olympiad shortcuts or off-syllabus tricks. Focus on step-oriented grading points.
4. Keep all LaTeX equations mathematically sound.
5. LaTeX delimiters and JSON escaping rules:
   - YOU MUST EXCLUSIVELY USE $$ ... $$ for block math and $ ... $ for inline math.
   - Never use other delimiters like parentheses, brackets, or \\( ... \\) for math.
   - Because you are returning JSON, you MUST double-escape all backslashes in LaTeX commands. For example, write \\\\begin{bmatrix} instead of \\begin{bmatrix}, \\\\frac instead of \\frac, \\\\lambda instead of \\lambda, and \\\\rightarrow instead of \\rightarrow.
   - Row separators in matrices must be written as \\\\\\\\ (four backslashes in JSON) so that they parse to \\\\ (two backslashes) in standard LaTeX.
   - Do NOT wrap matrices inside literal brackets like [ \\\\begin{bmatrix} ... \\\\end{bmatrix} ]. Use $$ \\\\begin{bmatrix} ... \\\\end{bmatrix} $$ instead.
6. For any programming code (C, C++, etc.), you MUST format it inside standard Markdown fenced code blocks using triple backticks and the language (e.g. \`\`\`c ... \`\`\`) with normal newlines and indentation. Do NOT use inline code blocks (\`...\`), and do NOT use LaTeX spacing commands (like \\quad, \\qquad) or literal 'quad' inside code blocks.

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
    // Sanitize LaTeX in AI output BEFORE caching so the client always gets clean standard LaTeX
    const sanitizedSolution = sanitizeSolutionObject(parsedSolution);

    question.cachedSolution = {
      content: sanitizedSolution.content || 'Generated Solution:',
      steps: sanitizedSolution.steps || [],
      generatedAt: new Date()
    };
    await question.save();

    return NextResponse.json({ solution: question.cachedSolution });
  } catch (error) {
    console.error('API Error in /api/ai/solve:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json({ error: errorMessage, stack: errorStack }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { questionText, topic, unit, subjectName, syllabus } = body;

    if (!questionText || typeof questionText !== 'string' || questionText.trim().length === 0) {
      return NextResponse.json({ error: 'Missing or invalid questionText parameter' }, { status: 400 });
    }

    if (questionText.length > 5000) {
      return NextResponse.json({ error: 'questionText too long (max 5000 chars)' }, { status: 400 });
    }

    if (unit !== undefined && (!Number.isInteger(unit) || unit <= 0)) {
      return NextResponse.json({ error: 'unit must be a positive integer' }, { status: 400 });
    }

    if (subjectName !== undefined && (typeof subjectName !== 'string' || subjectName.trim().length === 0)) {
      return NextResponse.json({ error: 'Invalid subjectName format' }, { status: 400 });
    }

    // Fallback if Groq API is not active
    if (!isAiEnabled()) {
      return NextResponse.json({
        solution: {
          content: `Step-by-step resolution for: ${questionText} (Running in local preview mode without Groq API key).`,
          steps: [
            {
              stepNumber: 1,
              heading: "Initialize Mathematical Model",
              content: `For target topic **${topic || 'General'}**, we set up the initial boundary conditions:\n\n$$y(x) = f(x)$$\n\nIdentify the parameters from the syllabus context of **${subjectName || 'the subject'}**.`
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
          ]
        }
      });
    }

    const prompt = `You are a university mathematics and computer science professor teaching "${subjectName || 'the subject'}". 
Generate a clear, step-by-step solution for the following university exam question:
"${questionText}"

The question is from Unit ${unit || 1}, Topic: "${topic || 'General'}".
Syllabus detail: ${JSON.stringify(syllabus || [])}

Instructions:
1. Provide the response as a JSON object containing:
   - "content": A brief introductory paragraph about the problem approach.
   - "steps": A list of steps. Each step must have:
     - "stepNumber": integer starting from 1
     - "heading": brief 2-5 word title of what the step does (e.g. "Differentiate Both Sides")
     - "content": detailed mathematical/algorithmic text explaining the derivation.
2. Formatting and Layout Guidelines for Content:
   - For Mathematics and Math-related subjects (calculus, matrices, algebra, vector fields, etc.):
     * VERY IMPORTANT: Visually separate all mathematical derivations from your text. Do NOT merge them into one giant paragraph.
     * EVERY formula, equation, substitution, or calculation MUST be on its own separate line as a display block wrapped in double dollar signs (example: $$ y = mx + c $$).
     * Use inline math ONLY for single variables or very short references, wrapped in single dollar signs (example: $x$ or $f(x)$). NEVER use inline math for actual equations or steps.
     * Example of BAD formatting: "Using the formula $ \\nabla \\times \\vec{F} = 0 $, we substitute $ F_x $..."
     * Example of GOOD formatting: "Using the formula:\n\n$$ \\nabla \\times \\vec{F} = 0 $$\n\nWe substitute the values:"
     * Use bullet points to list properties or assumptions clearly.
   - For all other subjects (Computer Science, Web Development, Electronics, etc.):
     * Make explanations highly structured, readable, and neat.
     * Use bold text (\`**term**\`) to highlight key terminology, variable names, and core concepts.
     * Use bullet points or numbered lists to break down explanations, features, parameters, or steps instead of writing them in messy, dense paragraphs.
3. The explanation must resemble a university exam model answer. Use clear, step-by-step reasoning. Do NOT use olympiad shortcuts or off-syllabus tricks. Focus on step-oriented grading points.
4. Keep all LaTeX equations mathematically sound.
5. LaTeX delimiters and JSON escaping rules:
   - YOU MUST EXCLUSIVELY USE $$ ... $$ for block math and $ ... $ for inline math.
   - Never use other delimiters like parentheses, brackets, or \\( ... \\) for math.
   - Because you are returning JSON, you MUST double-escape all backslashes in LaTeX commands. For example, write \\\\begin{bmatrix} instead of \\begin{bmatrix}, \\\\frac instead of \\frac, \\\\lambda instead of \\lambda, and \\\\rightarrow instead of \\rightarrow.
   - Row separators in matrices must be written as \\\\\\\\ (four backslashes in JSON) so that they parse to \\\\ (two backslashes) in standard LaTeX.
   - Do NOT wrap matrices inside literal brackets like [ \\\\begin{bmatrix} ... \\\\end{bmatrix} ]. Use $$ \\\\begin{bmatrix} ... \\\\end{bmatrix} $$ instead.
6. For any programming code (C, C++, etc.), you MUST format it inside standard Markdown fenced code blocks using triple backticks and the language (e.g. \`\`\`c ... \`\`\`) with normal newlines and indentation. Do NOT use inline code blocks (\`...\`), and do NOT use LaTeX spacing commands (like \\quad, \\qquad) or literal 'quad' inside code blocks.

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
    // Sanitize LaTeX before sending to client
    const sanitizedSolution = sanitizeSolutionObject(parsedSolution);

    return NextResponse.json({
      solution: {
        content: sanitizedSolution.content || 'Generated Solution:',
        steps: sanitizedSolution.steps || [],
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('API Error in POST /api/ai/solve:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
