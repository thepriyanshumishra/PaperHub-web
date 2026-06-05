import { groq, isAiEnabled } from '@/lib/groq';
import { sanitizeText, AI_LIMITS } from '@/lib/promptSafety';

export async function evaluateSemanticAnswer(
  attempt: string,
  modelAnswer: string,
  keyPoints: string[],
  maxMarks: number
): Promise<{
  score: number;
  confidence: number;
  reasoning: string;
  missingPoints: string[];
  feedback: string;
}> {
  // If AI is disabled, run basic heuristic overlap fallback
  if (!isAiEnabled()) {
    const wordCount = attempt.split(/\s+/).filter(w => w.length > 3).length;
    const score = wordCount > 25 ? 85 : (wordCount > 10 ? 50 : 10);
    return {
      score,
      confidence: 50,
      reasoning: "AI is currently offline. Grading based on answer length heuristics (Offline fallback).",
      missingPoints: keyPoints.slice(1),
      feedback: score >= 70 
        ? "Good attempt. Core conceptual points are addressed (Mock mode)." 
        : "Your explanation is too brief. Try to elaborate on the definitions and limitations (Mock mode)."
    };
  }

  const prompt = `You are a university sessional exam grader. Grade the student's explanation/theory answer.
Question Model Answer: "${sanitizeText(modelAnswer, AI_LIMITS.questionText)}"
Key Points to look for: ${JSON.stringify(keyPoints)}
Student Attempt: "${sanitizeText(attempt, AI_LIMITS.chatMessage)}"
Max Marks: ${maxMarks}

Instructions:
1. Compare the student answer against the model answer and key points. Do NOT require exact wording; verify semantic correctness and meaning.
2. Deduct marks for incorrect information, or missing key points. Award partial marks.
3. Compute:
   - score: marks awarded (number, between 0 and ${maxMarks})
   - confidence: confidence score of grading (0-100)
   - reasoning: detailed, step-by-step grading explanation (hidden from student)
   - missingPoints: array of strings from the list of Key Points that the student missed or did not address
   - feedback: brief, student-facing constructive comments (1-2 sentences)

Return ONLY a JSON response:
{
  "score": number,
  "confidence": number,
  "reasoning": "string",
  "missingPoints": ["string"],
  "feedback": "string"
}`;

  try {
    const completion = await groq!.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'You are a professional academic grader returning JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    });

    const reply = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(reply.trim());

    // Convert score (out of maxMarks) to percentage (0 to 100)
    const pctScore = maxMarks > 0 ? Math.round((result.score / maxMarks) * 100) : result.score;

    return {
      score: Math.max(0, Math.min(100, pctScore)),
      confidence: result.confidence || 80,
      reasoning: result.reasoning || 'Semantic analysis complete.',
      missingPoints: Array.isArray(result.missingPoints) ? result.missingPoints : [],
      feedback: result.feedback || 'Answer evaluated.'
    };
  } catch (e: any) {
    return {
      score: 50,
      confidence: 50,
      reasoning: `AI evaluation failed: ${e.message}`,
      missingPoints: [],
      feedback: 'Failed to trigger AI semantic verification. Grade will default to partial marks.'
    };
  }
}
