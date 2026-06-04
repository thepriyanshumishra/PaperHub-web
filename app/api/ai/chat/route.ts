import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Question from '@/models/question';
import Chat from '@/models/chat';
import { groq, isAiEnabled } from '@/lib/groq';
import Groq from 'groq-sdk';
import mongoose from 'mongoose';

interface PopulatedSubject {
  name: string;
  syllabus: { unit: number; title: string; topics: string[] }[];
}

interface ChatMessageInput {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { userId, questionId, message, history, fallbackContext } = body;

    if (!userId || typeof userId !== 'string' || !message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Missing or invalid parameters: userId, message' }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'message parameter is too long (max 2000 characters)' }, { status: 400 });
    }

    if (questionId && !String(questionId).startsWith('mock') && !mongoose.Types.ObjectId.isValid(questionId)) {
      return NextResponse.json({ error: 'Invalid questionId format' }, { status: 400 });
    }

    // Fallback if Groq API is not active
    if (!isAiEnabled()) {
      return NextResponse.json({
        reply: `This is a mock assistant reply. (Running in local preview mode without Groq API key). I'm preloaded with your question context: **${questionId || 'fallback'}**.`
      });
    }

    let systemPrompt = '';
    let dbChatLogAllowed = false;

    const isMockQuestion = !questionId || String(questionId).startsWith('mock') || !mongoose.Types.ObjectId.isValid(questionId);

    if (!isMockQuestion) {
      const question = await Question.findById(questionId).populate('subjectId');
      if (question) {
        const subject = question.subjectId as unknown as PopulatedSubject;
        const subjectName = subject?.name || 'the subject';
        const syllabus = subject?.syllabus || [];

        systemPrompt = `You are a helpful, syllabus-aware university exam assistant for "${subjectName}". 
The student is currently practicing this question:
"${question.questionText}"

Their syllabus constraints for this subject:
${JSON.stringify(syllabus)}

You have access to the cached solution for reference:
${JSON.stringify(question.cachedSolution || 'No solution cached yet.')}

Instructions:
1. Help the student clarify doubts, understand concepts, or guide them through their solving approach.
2. If they ask for hints, do NOT give the full answer immediately. Guide them step-by-step.
3. Keep all answers aligned with standard university syllabus methods.
4. Formatting and Layout Guidelines:
   - For Mathematics and Math-related subjects (calculus, matrices, algebra, vector fields, Laplace transforms, Fourier series, differential equations, etc.):
     * CRITICAL MATH DELIMITERS RULES (MUST BE STRICTLY FOLLOWED):
       1. EVERY SINGLE mathematical variable, symbol, expression, or equation MUST be wrapped in either inline ($ ... $) or block ($$ ... $$) math delimiters. NEVER output raw LaTeX (like \\frac, \\int, \\mathcal, \\tau, etc.) or mathematical equations/variables without delimiters directly in prose text!
       2. INLINE MATH ($...$): ONLY use inline math for single variables (e.g., $x$, $y$, $t$, $m$, $\\tau$), single numbers/constants (e.g., $2$, $a$, $C_1$), or extremely simple terms (e.g., $x^2$, $e^{-st}$). NEVER write equations with equal signs (=), fractions, derivatives, integrals, or multi-term algebraic steps inline inside a sentence!
       3. DISPLAY MATH ($$...$$): EVERY equation, derivative, integral, matrix, system of equations, substitution, algebraic calculation, simplification, or final result MUST be written on its own separate line wrapped in double dollar signs $$ ... $$.
       4. EXPLANATION TEXT SPACING: You MUST precede and follow every double dollar sign block ($$ ... $$) with a double newline (\\n\\n) in your response. Keep explanations short, clear, and highly spaced out.
       5. PROOFS AND DERIVATIONS: Explain a transition in 1-2 lines of text, write the equation as a display math block on its own separate line, explain the next step in 1-2 lines of text, and then write the next equation on its own separate line.
       6. GOLD STANDARD MATH FORMATTING EXAMPLE (MUST BE FOLLOWED FOR EVERY MATH CONTENT GENERATED):
          Instead of writing a sentence with inline equations or algebraic operations like this (BAD / STRICTLY FORBIDDEN):
          "The given partial differential equation can be written as $x^2 \\\\frac{\\\\partial^2 z}{\\\\partial x^2} - x = 0$. We need to find..."
          
          You MUST split the sentence and place the equation/derivation on its own separate line wrapped in double dollar signs preceded and followed by double newlines inside the JSON text, like this (GOOD / REQUIRED):
          "The given partial differential equation can be written as:
          
          $$x^2 \\\\frac{\\\\partial^2 z}{\\\\partial x^2} - x = 0$$
          
          We need to find..."
   - For all other subjects (Computer Science, Web Development, Electronics, etc.):
     * Make explanations highly structured, readable, and neat.
     * Use bold text (**term**) to highlight key terminology, variable names, and core concepts.
     * Use bullet points or numbered lists to break down explanations, features, parameters, or steps instead of writing them in messy, dense paragraphs.
5. For any programming code (C, C++, etc.), you MUST format it inside standard Markdown fenced code blocks using triple backticks and the language (e.g. \`\`\`c ... \`\`\`) with normal newlines and indentation. Do NOT use inline code blocks (\`...\`), and do NOT use LaTeX spacing commands (like \\quad, \\qquad) or literal 'quad' inside code blocks.`;
        dbChatLogAllowed = true;
      }
    }

    if (!systemPrompt && fallbackContext) {
      const { questionText, subjectName, syllabus, cachedSolution } = fallbackContext;
      systemPrompt = `You are a helpful, syllabus-aware university exam assistant for "${subjectName || 'the subject'}". 
      The student is currently practicing this question:
      "${questionText || 'this question'}"

      Their syllabus constraints for this subject:
      ${JSON.stringify(syllabus || [])}

      You have access to the cached solution for reference:
      ${JSON.stringify(cachedSolution || 'No solution cached yet.')}

      Instructions:
      1. Help the student clarify doubts, understand concepts, or guide them through their solving approach.
      2. If they ask for hints, do NOT give the full answer immediately. Guide them step-by-step.
      3. Keep all answers aligned with standard university syllabus methods.
      4. Formatting and Layout Guidelines:
         - For Mathematics and Math-related subjects (calculus, matrices, algebra, vector fields, Laplace transforms, Fourier series, differential equations, etc.):
           * CRITICAL MATH DELIMITERS RULES (MUST BE STRICTLY FOLLOWED):
             1. EVERY SINGLE mathematical variable, symbol, expression, or equation MUST be wrapped in either inline ($ ... $) or block ($$ ... $$) math delimiters. NEVER output raw LaTeX (like \\frac, \\int, \\mathcal, \\tau, etc.) or mathematical equations/variables without delimiters directly in prose text!
             2. INLINE MATH ($...$): ONLY use inline math for single variables (e.g., $x$, $y$, $t$, $m$, $\\tau$), single numbers/constants (e.g., $2$, $a$, $C_1$), or extremely simple terms (e.g., $x^2$, $e^{-st}$). NEVER write equations with equal signs (=), fractions, derivatives, integrals, or multi-term algebraic steps inline inside a sentence!
             3. DISPLAY MATH ($$...$$): EVERY equation, derivative, integral, matrix, system of equations, substitution, algebraic calculation, simplification, or final result MUST be written on its own separate line wrapped in double dollar signs $$ ... $$.
             4. EXPLANATION TEXT SPACING: You MUST precede and follow every double dollar sign block ($$ ... $$) with a double newline (\\n\\n) in your response. Keep explanations short, clear, and highly spaced out.
             5. PROOFS AND DERIVATIONS: Explain a transition in 1-2 lines of text, write the equation as a display math block on its own separate line, explain the next step in 1-2 lines of text, and then write the next equation on its own separate line.
             6. GOLD STANDARD MATH FORMATTING EXAMPLE (MUST BE FOLLOWED FOR EVERY MATH CONTENT GENERATED):
                Instead of writing a sentence with inline equations or algebraic operations like this (BAD / STRICTLY FORBIDDEN):
                "The given partial differential equation can be written as $x^2 \\\\frac{\\\\partial^2 z}{\\\\partial x^2} - x = 0$. We need to find..."
                
                You MUST split the sentence and place the equation/derivation on its own separate line wrapped in double dollar signs preceded and followed by double newlines inside the JSON text, like this (GOOD / REQUIRED):
                "The given partial differential equation can be written as:
                
                $$x^2 \\\\frac{\\\\partial^2 z}{\\\\partial x^2} - x = 0$$
                
                We need to find..."
         - For all other subjects (Computer Science, Web Development, Electronics, etc.):
           * Make explanations highly structured, readable, and neat.
           * Use bold text (**term**) to highlight key terminology, variable names, and core concepts.
           * Use bullet points or numbered lists to break down explanations, features, parameters, or steps instead of writing them in messy, dense paragraphs.
      5. For any programming code (C, C++, etc.), you MUST format it inside standard Markdown fenced code blocks using triple backticks and the language (e.g. \`\`\`c ... \`\`\`) with normal newlines and indentation. Do NOT use inline code blocks (\`...\`), and do NOT use LaTeX spacing commands (like \\quad, \\qquad) or literal 'quad' inside code blocks.`;
    }

    if (!systemPrompt) {
      return NextResponse.json({ error: 'Question context could not be resolved' }, { status: 400 });
    }

    const historyList = (history || []) as ChatMessageInput[];

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...historyList.map((m: ChatMessageInput) => ({ role: m.role, content: m.content } as Groq.Chat.ChatCompletionMessageParam)),
      { role: 'user', content: message }
    ];

    const completion = await groq!.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages
    });

    const reply = completion.choices[0]?.message?.content || 'I am sorry, I could not formulate a response.';

    // Log chat to Database only if it is a real DB-backed question
    if (dbChatLogAllowed) {
      const chat = await Chat.findOne({ userId, questionId });
      const formattedMessages: { role: 'user' | 'assistant'; content: string; timestamp: Date }[] = [
        ...historyList.map((m: ChatMessageInput) => ({ role: m.role, content: m.content, timestamp: new Date() })),
        { role: 'user', content: message, timestamp: new Date() },
        { role: 'assistant', content: reply, timestamp: new Date() }
      ];

      if (chat) {
        chat.messages = formattedMessages;
        await chat.save();
      } else {
        await Chat.create({
          userId,
          questionId,
          messages: formattedMessages
        });
      }
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('API Error in /api/ai/chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
