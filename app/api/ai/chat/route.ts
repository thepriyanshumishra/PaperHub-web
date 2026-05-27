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
      model: 'llama-3.3-70b-versatile',
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
