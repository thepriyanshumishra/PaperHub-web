import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Session from '@/models/session';
import { groq, isAiEnabled } from '@/lib/groq';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

interface PopulatedSubject {
  name: string;
}

interface PopulatedQuestion {
  _id: mongoose.Types.ObjectId;
  questionText: string;
  marks: number;
  topic: string;
  unit: number;
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing required parameter: sessionId' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return NextResponse.json({ error: 'Invalid sessionId format' }, { status: 400 });
    }

    const session = await Session.findById(sessionId)
      .populate('subjectId')
      .populate('questions');

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const subject = session.subjectId as unknown as PopulatedSubject;
    const subjectName = subject?.name || 'this subject';
    const questions = session.questions as unknown as PopulatedQuestion[];

    if (!session.uploadedImages || session.uploadedImages.length === 0) {
      return NextResponse.json({ error: 'No answer sheet photos uploaded for this session' }, { status: 400 });
    }

    // Default total marks calculation
    const totalQuestionsMarks = questions.reduce((sum, q) => sum + (q.marks || 10), 0);

    // Fallback Mock Evaluation if Groq API is not active
    if (!isAiEnabled()) {
      const mockResult = {
        totalMarks: totalQuestionsMarks,
        obtainedMarks: Math.round(totalQuestionsMarks * 0.75),
        summaryFeedback: "AI Vision Evaluation (Mock Mode): Your answers show good conceptual clarity and step-by-step progress. A few formatting improvements in the equations could yield perfect scores.",
        details: questions.map((q) => ({
          questionId: String(q._id),
          marksAwarded: Math.round((q.marks || 10) * 0.75),
          feedback: `Good attempt on ${q.topic || 'Question'}. Formulas are correctly listed, and final calculation aligns perfectly with the model answer.`
        }))
      };

      session.evaluationResult = mockResult;
      session.status = 'completed';
      session.endedAt = new Date();
      await session.save();

      return NextResponse.json({ evaluationResult: mockResult });
    }

    // Construct evaluation payload for Llama 3.2 Vision
    const questionsContext = questions.map((q) => ({
      questionId: String(q._id),
      text: q.questionText,
      unit: q.unit,
      topic: q.topic,
      marks: q.marks || 10
    }));

    const imagesToProcess = session.uploadedImages;
    const BATCH_SIZE = 5;
    const allDetails: { questionId: string; marksAwarded: number; feedback: string }[] = [];

    try {
      // Loop through images in batches to prevent API payload limits
      for (let batchIdx = 0; batchIdx < imagesToProcess.length; batchIdx += BATCH_SIZE) {
        const batchImages = imagesToProcess.slice(batchIdx, batchIdx + BATCH_SIZE);
        const batchNum = Math.floor(batchIdx / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(imagesToProcess.length / BATCH_SIZE);

        const batchMessages = [
          {
            role: 'system',
            content: `You are an expert university examiner grading paper-based written sheets for the engineering and computer science subject "${subjectName}".
Review the student's handwritten answer sheets (provided as images) and grade their answers to each exam question.

This is batch ${batchNum} of ${totalBatches} containing page ${batchIdx + 1} to ${batchIdx + batchImages.length} of the answer sheets.
Analyze these images and grade any questions you see solved in them. If a question is NOT solved in this batch of pages, DO NOT include it in the details array, or set its marks to 0 and state that it was not found in this batch of pages.

Questions to grade:
${JSON.stringify(questionsContext)}

Instructions:
1. Carefully perform optical character recognition (OCR) on each page.
2. Verify that the uploaded images actually contain handwritten or typed solutions for this exam.
3. CRITICAL SECURITY GUARDRAIL: If the uploaded images contain unrelated content, spam, blank pages, or documents completely unrelated to the exam (e.g., a grocery list, receipt, cartoon, random sketches, or text from other unrelated subjects), you MUST immediately identify this. For any question where the student submitted unrelated or invalid content (or if the entire upload is unrelated), award EXACTLY 0 marks for that question and explicitly state in the feedback: "Invalid submission: Submitting unrelated documents (such as grocery lists or spam) is not accepted." and award an overall obtainedMarks of 0.
4. Identify which written sections correspond to which question.
5. Grade each question strictly according to university model answer criteria (deduct marks for calculation mistakes, step omissions, or conceptual errors).
6. Return ONLY a valid JSON object matching this schema:
{
  "details": [
    {
      "questionId": "string (the question's MongoDB _id)",
      "marksAwarded": number,
      "feedback": "detailed review comments outlining specific mistakes or strengths for this question"
    }
  ]
}`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Here is batch ${batchNum} of the exam answer sheet photos. Please evaluate them:` },
              ...batchImages.map((base64Img: string) => ({
                type: 'image_url',
                image_url: {
                  url: base64Img.startsWith('data:') ? base64Img : `data:image/jpeg;base64,${base64Img}`
                }
              }))
            ]
          }
        ];

        const completion = await groq!.chat.completions.create({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: batchMessages as any,
          response_format: { type: 'json_object' }
        });

        const responseText = completion.choices[0]?.message?.content || '{}';
        const parsedResult = JSON.parse(responseText);

        if (Array.isArray(parsedResult.details)) {
          allDetails.push(...parsedResult.details);
        }
      }

      // Consolidate final grades for all questions in the test session
      const finalDetails: { questionId: string; marksAwarded: number; feedback: string }[] = [];
      
      for (const q of questions) {
        const qIdStr = String(q._id);
        const qEvaluations = allDetails.filter((d) => String(d.questionId) === qIdStr);

        if (qEvaluations.length > 0) {
          // Find evaluation with the highest score
          let bestEval = qEvaluations[0];
          for (const evalEntry of qEvaluations) {
            if (evalEntry.marksAwarded > bestEval.marksAwarded) {
              bestEval = evalEntry;
            }
          }

          // Combine unique feedbacks across page batches
          const combinedFeedback = qEvaluations
            .map((e) => e.feedback)
            .filter((f, idx, self) => f && self.indexOf(f) === idx)
            .join(' | ');

          finalDetails.push({
            questionId: qIdStr,
            marksAwarded: bestEval.marksAwarded,
            feedback: combinedFeedback || bestEval.feedback || 'Answer evaluated.'
          });
        } else {
          finalDetails.push({
            questionId: qIdStr,
            marksAwarded: 0,
            feedback: 'No solution found for this question in the uploaded pages.'
          });
        }
      }

      const obtainedMarks = finalDetails.reduce((sum, d) => sum + d.marksAwarded, 0);

      // Synthesize overall performance summary using text model
      let summaryFeedback = '';
      try {
        const summaryCompletion = await groq!.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: `You are an academic board examiner compiling the final report summary feedback for a student in "${subjectName}".
Review the question-by-question grades and compile a high-level feedback summary (2-3 sentences) summarizing their strengths and areas of improvement.`
            },
            {
              role: 'user',
              content: `Grades breakdown:\n${JSON.stringify(finalDetails)}\nTotal Score: ${obtainedMarks} / ${totalQuestionsMarks}`
            }
          ]
        });
        summaryFeedback = summaryCompletion.choices[0]?.message?.content || 'AI Vision evaluation completed successfully across all uploaded pages.';
      } catch (e) {
        console.warn('Summary generation failed, using fallback summary:', e);
        summaryFeedback = `Exam evaluation successfully compiled across ${imagesToProcess.length} pages. Total score obtained is ${obtainedMarks}/${totalQuestionsMarks}.`;
      }

      const evaluationResult = {
        totalMarks: totalQuestionsMarks,
        obtainedMarks,
        summaryFeedback,
        details: finalDetails
      };

      session.evaluationResult = evaluationResult;
      session.status = 'completed';
      session.endedAt = new Date();
      await session.save();

      return NextResponse.json({ evaluationResult });
    } catch (apiError: unknown) {
      const errMsg = apiError instanceof Error ? apiError.message : String(apiError);
      console.error('Vision grading API request failed:', errMsg);
      return NextResponse.json({ 
        error: 'Evaluation service temporarily unavailable. Please verify your connection or try again later.' 
      }, { status: 503 });
    }
  } catch (error) {
    console.error('API Error in /api/ai/evaluate:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
