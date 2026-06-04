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

    const subjectName = subject?.name || 'the subject';
    const syllabus = subject?.syllabus || [];
    const topic = question.topic;

    const prompt = `You are a university mathematics and computer science professor teaching "${subjectName}".
Generate a clear, highly structured, syllabus-aligned solution for the following university exam question:
"${question.questionText}"

The question is from Unit ${question.unit}, Topic: "${topic}".
Syllabus detail: ${JSON.stringify(syllabus)}

CRITICAL: You MUST classify the question into exactly ONE of the following four categories and format your JSON response to match that category's keys.

--- PATHWAY A: "coding" (If the question asks to write a programming solution, C code, function, or algorithm)
JSON structure required:
{
  "type": "coding",
  "content": "Introductory paragraph explaining the algorithm, program logic, approach, and implementation details in plain text.",
  "code": "The complete, pristine, ready-to-run programming code in the target language (usually C). Use proper comments and formatting. Do NOT include markdown code blocks inside the string (no triple backticks). Just raw code.",
  "explanation": "Detailed line-by-line or conceptual description of the code segments, key variables, and operations, written in clean markdown.",
  "complexity": {
    "time": "Time complexity analysis (e.g. O(N)) with short justification.",
    "space": "Space complexity analysis (e.g. O(1)) with short justification."
  },
  "inputOutput": "Sample Input and matching Sample Output showing how the program runs."
}

--- PATHWAY B: "flowchart" (If the question explicitly asks to draw or construct a flowchart, or says "Draw a flowchart...")
JSON structure required:
{
  "type": "flowchart",
  "content": "Introductory paragraph describing the logic and structure of the flow control.",
  "mermaid": "The raw Mermaid.js graph definition. Start with 'graph TD' or 'graph LR'. You MUST strictly adhere to these visual and logical rules: 1) ACADEMIC GRAPH LOGIC (CRITICAL): Flowcharts must represent mathematically and structurally correct program logic, including realistic loops, conditional statements, and binary forks. They must NOT be simple linear chains of boxes. All control paths must eventually converge correctly. 2) BINARY BRANCHING: Every decision diamond (e.g. D{Condition}) MUST branch into exactly two paths: a positive branch and a negative branch, cleanly labeled using transitions like -->|Yes| and -->|No| or -->|True| and -->|False| leading to different nodes. 3) CYCLIC ITERATIVE LOOPS: For loops or conditional repetition (e.g., printing a series up to n, counting, finding prime numbers), you must loop back. The process/update node at the end of the loop MUST point an arrow backwards to the original decision/condition check node (e.g., UpdateNode --> ConditionCheck). Do NOT display repetitive steps vertically in a straight linear sequence. 4) SHAPE STANDARDS & ESCAPED QUOTED LABELS (CRITICAL): You MUST strictly use standard flowchart shapes and ALWAYS wrap every label in double quotes. In your JSON response, you MUST escape these double quotes as \\\" to keep the JSON valid. Use Rounded Ovals for Terminators like Start([\\\"Start\\\"]) or End([\\\"End\\\"]), Parallelograms for Input/Output (I/O) like ReadInput[/\\\"Read N\\\"/] or PrintOutput[/\\\"Print Result\\\"/], Rectangles for Processes/Operations like ProcessNode[\\\"Initialize i=1, sum=0\\\"] or Add[\\\"sum = sum + i\\\"], and Diamonds for Decisions like Decision{\\\"Is i <= N?\\\"}. DO NOT write labels without double quotes if they contain brackets, parentheses, or operators (e.g. do NOT write Init[Initialize i=1, F[i]=1] as it breaks the parser; instead write Init[\\\"Initialize i=1, F[i]=1\\\"]). 5) NO MARKDOWN CODE BLOCKS: Do NOT wrap the mermaid definition inside triple backticks. Provide only the raw mermaid code. Example correct Mermaid loop graph: graph TD\\n    Start([\\\"Start\\\"]) --> ReadInput[/\\\"Read N\\\"/]\\n    ReadInput --> CheckInput{\\\"Is N > 0?\\\"}\\n    CheckInput -->|No| Invalid[/\\\"Print Error\\\"/]\\n    Invalid --> End([\\\"End\\\"])\\n    CheckInput -->|Yes| Init[\\\"Initialize i = 1, sum = 0\\\"]\\n    Init --> LoopCheck{\\\"i <= N\\\"}\\n    LoopCheck -->|No| PrintSum[/\\\"Print sum\\\"/]\\n    PrintSum --> End\\n    LoopCheck -->|Yes| Add[\\\"sum = sum + i\\\"]\\n    Add --> Inc[\\\"i = i + 1\\\"]\\n    Inc --> LoopCheck",
  "explanation": "Step-by-step description of the flow control and logic paths in clean markdown."
}

--- PATHWAY C: "maths" (If the question involves mathematical derivations, proofs, equations, calculations, or matrices)
JSON structure required:
{
  "type": "maths",
  "content": "Introductory plain-text paragraph describing the analytical approach.",
  "steps": [
    {
      "stepNumber": 1,
      "heading": "Step title (e.g. Differentiate Both Sides)",
      "content": "Full explanation and mathematical equations for this step. Use proper LaTeX delimiters ($...$ inline and $$...$$ display blocks on their own lines)."
    }
  ]
}

--- PATHWAY D: "theory" (If the question is theoretical, explanatory, definitions, differences, e.g. 'Differentiate compiler and assembler')
JSON structure required:
{
  "type": "theory",
  "content": "Introductory paragraph stating the core concept.",
  "explanation": "A complete, beautifully formatted, textbook-style conceptual breakdown in clean markdown using headers (###), bold key terms, and bulleted or structured lists."
}

MATH FORMATTING RULES (Apply to all markdown/text prose fields except 'code' and 'mermaid'):
1. ALWAYS wrap single mathematical variables/constants in inline $...$ (e.g. $x$, $y_1$, $O(N)$).
2. EVERY equation, formula, derivative, or multi-term expression MUST be wrapped in display $$...$$ on its own line, preceded and followed by a blank line (\\n\\n in JSON).
3. ABSOLUTELY FORBIDDEN: Writing math inside regular parentheses or raw LaTeX commands outside delimiters.

STRICT JSON FORMATTING AND ESCAPING RULES:
1. Every string value in your JSON output must be a perfectly valid, standard JSON string.
2. Absolutely DO NOT include raw, literal unescaped newlines inside any string values. If you want a line break, represent it strictly as the escaped character sequence "\\n".
3. Escape all double quotes inside string values (e.g. use \\\" for quotes in strings like printf(\\\"Hello\\\");).
4. Output ONLY valid JSON. Nothing else. Do not wrap the JSON block in triple backticks.`;

    // Solve Pass: primary model Llama 3.3 70B for maximum premium formatting and academic accuracy, fallback to 8B on failure.
    let modelToUse = 'llama-3.3-70b-versatile';
    let completion;
    let responseText = '{}';

    try {
      completion = await groq!.chat.completions.create({
        model: modelToUse,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
        response_format: { type: 'json_object' }
      });
      responseText = completion.choices[0]?.message?.content || '{}';
    } catch (err70b) {
      console.warn('Llama 70B solve failed, falling back to Llama 8B:', err70b);
      modelToUse = 'llama-3.1-8b-instant';
      completion = await groq!.chat.completions.create({
        model: modelToUse,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
        response_format: { type: 'json_object' }
      });
      responseText = completion.choices[0]?.message?.content || '{}';
    }

    const parsedSolution = JSON.parse(responseText);
    const sanitizedSolution = sanitizeSolutionObject(parsedSolution);

    question.cachedSolution = {
      content: sanitizedSolution.content || 'Generated Solution:',
      steps: sanitizedSolution.steps || [],
      type: sanitizedSolution.type || 'maths',
      code: sanitizedSolution.code,
      explanation: sanitizedSolution.explanation,
      complexity: sanitizedSolution.complexity,
      inputOutput: sanitizedSolution.inputOutput,
      mermaid: sanitizedSolution.mermaid,
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
Generate a clear, highly structured, syllabus-aligned solution for the following university exam question:
"${questionText}"

The question is from Unit ${unit || 1}, Topic: "${topic || 'General'}".
Syllabus detail: ${JSON.stringify(syllabus || [])}

CRITICAL: You MUST classify the question into exactly ONE of the following four categories and format your JSON response to match that category's keys.

--- PATHWAY A: "coding" (If the question asks to write a programming solution, C code, function, or algorithm)
JSON structure required:
{
  "type": "coding",
  "content": "Introductory paragraph explaining the algorithm, program logic, approach, and implementation details in plain text.",
  "code": "The complete, pristine, ready-to-run programming code in the target language (usually C). Use proper comments and formatting. Do NOT include markdown code blocks inside the string (no triple backticks). Just raw code.",
  "explanation": "Detailed line-by-line or conceptual description of the code segments, key variables, and operations, written in clean markdown.",
  "complexity": {
    "time": "Time complexity analysis (e.g. O(N)) with short justification.",
    "space": "Space complexity analysis (e.g. O(1)) with short justification."
  },
  "inputOutput": "Sample Input and matching Sample Output showing how the program runs."
}

--- PATHWAY B: "flowchart" (If the question explicitly asks to draw or construct a flowchart, or says "Draw a flowchart...")
JSON structure required:
{
  "type": "flowchart",
  "content": "Introductory paragraph describing the logic and structure of the flow control.",
  "mermaid": "The raw Mermaid.js graph definition. Start with 'graph TD' or 'graph LR'. You MUST strictly adhere to these visual and logical rules: 1) ACADEMIC GRAPH LOGIC (CRITICAL): Flowcharts must represent mathematically and structurally correct program logic, including realistic loops, conditional statements, and binary forks. They must NOT be simple linear chains of boxes. All control paths must eventually converge correctly. 2) BINARY BRANCHING: Every decision diamond (e.g. D{Condition}) MUST branch into exactly two paths: a positive branch and a negative branch, cleanly labeled using transitions like -->|Yes| and -->|No| or -->|True| and -->|False| leading to different nodes. 3) CYCLIC ITERATIVE LOOPS: For loops or conditional repetition (e.g., printing a series up to n, counting, finding prime numbers), you must loop back. The process/update node at the end of the loop MUST point an arrow backwards to the original decision/condition check node (e.g., UpdateNode --> ConditionCheck). Do NOT display repetitive steps vertically in a straight linear sequence. 4) SHAPE STANDARDS & ESCAPED QUOTED LABELS (CRITICAL): You MUST strictly use standard flowchart shapes and ALWAYS wrap every label in double quotes. In your JSON response, you MUST escape these double quotes as \\\" to keep the JSON valid. Use Rounded Ovals for Terminators like Start([\\\"Start\\\"]) or End([\\\"End\\\"]), Parallelograms for Input/Output (I/O) like ReadInput[/\\\"Read N\\\"/] or PrintOutput[/\\\"Print Result\\\"/], Rectangles for Processes/Operations like ProcessNode[\\\"Initialize i=1, sum=0\\\"] or Add[\\\"sum = sum + i\\\"], and Diamonds for Decisions like Decision{\\\"Is i <= N?\\\"}. DO NOT write labels without double quotes if they contain brackets, parentheses, or operators (e.g. do NOT write Init[Initialize i=1, F[i]=1] as it breaks the parser; instead write Init[\\\"Initialize i=1, F[i]=1\\\"]). 5) NO MARKDOWN CODE BLOCKS: Do NOT wrap the mermaid definition inside triple backticks. Provide only the raw mermaid code. Example correct Mermaid loop graph: graph TD\\n    Start([\\\"Start\\\"]) --> ReadInput[/\\\"Read N\\\"/]\\n    ReadInput --> CheckInput{\\\"Is N > 0?\\\"}\\n    CheckInput -->|No| Invalid[/\\\"Print Error\\\"/]\\n    Invalid --> End([\\\"End\\\"])\\n    CheckInput -->|Yes| Init[\\\"Initialize i = 1, sum = 0\\\"]\\n    Init --> LoopCheck{\\\"i <= N\\\"}\\n    LoopCheck -->|No| PrintSum[/\\\"Print sum\\\"/]\\n    PrintSum --> End\\n    LoopCheck -->|Yes| Add[\\\"sum = sum + i\\\"]\\n    Add --> Inc[\\\"i = i + 1\\\"]\\n    Inc --> LoopCheck",
  "explanation": "Step-by-step description of the flow control and logic paths in clean markdown."
}

--- PATHWAY C: "maths" (If the question involves mathematical derivations, proofs, equations, calculations, or matrices)
JSON structure required:
{
  "type": "maths",
  "content": "Introductory plain-text paragraph describing the analytical approach.",
  "steps": [
    {
      "stepNumber": 1,
      "heading": "Step title (e.g. Differentiate Both Sides)",
      "content": "Full explanation and mathematical equations for this step. Use proper LaTeX delimiters ($...$ inline and $$...$$ display blocks on their own lines)."
    }
  ]
}

--- PATHWAY D: "theory" (If the question is theoretical, explanatory, definitions, differences, e.g. 'Differentiate compiler and assembler')
JSON structure required:
{
  "type": "theory",
  "content": "Introductory paragraph stating the core concept.",
  "explanation": "A complete, beautifully formatted, textbook-style conceptual breakdown in clean markdown using headers (###), bold key terms, and bulleted or structured lists."
}

MATH FORMATTING RULES (Apply to all markdown/text prose fields except 'code' and 'mermaid'):
1. ALWAYS wrap single mathematical variables/constants in inline $...$ (e.g. $x$, $y_1$, $O(N)$).
2. EVERY equation, formula, derivative, or multi-term expression MUST be wrapped in display $$...$$ on its own line, preceded and followed by a blank line (\\n\\n in JSON).
3. ABSOLUTELY FORBIDDEN: Writing math inside regular parentheses or raw LaTeX commands outside delimiters.

STRICT JSON FORMATTING AND ESCAPING RULES:
1. Every string value in your JSON output must be a perfectly valid, standard JSON string.
2. Absolutely DO NOT include raw, literal unescaped newlines inside any string values. If you want a line break, represent it strictly as the escaped character sequence "\\n".
3. Escape all double quotes inside string values (e.g. use \\\" for quotes in strings like printf(\\\"Hello\\\");).
4. Output ONLY valid JSON. Nothing else. Do not wrap the JSON block in triple backticks.`;

    // Solve Pass: primary model Llama 3.3 70B for maximum premium formatting and academic accuracy, fallback to 8B on failure.
    let modelToUse = 'llama-3.3-70b-versatile';
    let completion;
    let responseText = '{}';

    try {
      completion = await groq!.chat.completions.create({
        model: modelToUse,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
        response_format: { type: 'json_object' }
      });
      responseText = completion.choices[0]?.message?.content || '{}';
    } catch (err70b) {
      console.warn('Llama 70B solve failed in POST, falling back to Llama 8B:', err70b);
      modelToUse = 'llama-3.1-8b-instant';
      completion = await groq!.chat.completions.create({
        model: modelToUse,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
        response_format: { type: 'json_object' }
      });
      responseText = completion.choices[0]?.message?.content || '{}';
    }

    const parsedSolution = JSON.parse(responseText);
    const sanitizedSolution = sanitizeSolutionObject(parsedSolution);

    return NextResponse.json({
      solution: {
        content: sanitizedSolution.content || 'Generated Solution:',
        steps: sanitizedSolution.steps || [],
        type: sanitizedSolution.type || 'maths',
        code: sanitizedSolution.code,
        explanation: sanitizedSolution.explanation,
        complexity: sanitizedSolution.complexity,
        inputOutput: sanitizedSolution.inputOutput,
        mermaid: sanitizedSolution.mermaid,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('API Error in POST /api/ai/solve:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
