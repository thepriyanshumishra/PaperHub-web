import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Question from '@/models/question';
import Chat from '@/models/chat';
import { groq, isAiEnabled } from '@/lib/groq';
import Groq from 'groq-sdk';

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
    const { userId, questionId, message, history } = body;

    if (!userId || !questionId || !message) {
      return NextResponse.json({ error: 'Missing required parameters: userId, questionId, message' }, { status: 400 });
    }

    // Fallback if Groq API is not active
    if (!isAiEnabled()) {
      return NextResponse.json({
        reply: `This is a mock assistant reply. (Running in local preview mode without Groq API key). I'm preloaded with your question context: **${questionId}**.`
      });
    }

    const question = await Question.findById(questionId).populate('subjectId');
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const historyList = (history || []) as ChatMessageInput[];
    const subject = question.subjectId as unknown as PopulatedSubject;
    const subjectName = subject?.name || 'the subject';
    const syllabus = subject?.syllabus || [];

    const systemPrompt = `You are a helpful, syllabus-aware university exam assistant for "${subjectName}". 
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
4. Format math formulas using LaTeX enclosed in $$ for block and $ for inline.`;

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

    // Log chat to Database
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

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('API Error in /api/ai/chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
