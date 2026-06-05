import { groq, isAiEnabled } from '@/lib/groq';
import { sanitizeText, AI_LIMITS } from '@/lib/promptSafety';

export async function evaluateProgrammingAnswer(
  attempt: string,
  modelAnswer: string,
  keyPoints: string[]
): Promise<{
  score: number;
  confidence: number;
  reasoning: string;
  syntaxOk: boolean;
  complexity: string; // Time/Space complexity e.g. "O(N) time, O(1) space"
  feedback: string;
}> {
  if (!isAiEnabled()) {
    // Heuristic fallback
    const hasBasicKeywords = attempt.includes('function') || 
                              attempt.includes('def ') || 
                              attempt.includes('class') || 
                              attempt.includes('return') ||
                              attempt.includes('for') ||
                              attempt.includes('while') ||
                              attempt.includes('#include') ||
                              attempt.includes('import');
    
    return {
      score: hasBasicKeywords ? 80 : 30,
      confidence: 50,
      reasoning: "AI is currently offline. Evaluating using code keywords static heuristics.",
      syntaxOk: true,
      complexity: "O(N) time (offline estimation)",
      feedback: hasBasicKeywords 
        ? "Code structure looks valid. Static keyword heuristic check passed (Mock Mode)." 
        : "Missing basic structural functions, include headers, or return keywords."
    };
  }

  const prompt = `You are a strict programming grading bot. Perform static analysis on the student's code attempt.
Question Model Answer Code:
"${modelAnswer}"
Key Points/Requirements: ${JSON.stringify(keyPoints)}

Student Code Attempt:
"${sanitizeText(attempt, AI_LIMITS.chatMessage)}"

Instructions:
1. Validate syntax correctness (isolated checks for missing braces, semi-colons, brackets, or indentation errors). No live execution.
2. Determine estimate for time and space complexity (e.g. O(N) time, O(1) space).
3. Evaluate semantic correctness: does it achieve the desired algorithmic goals of the model solution?
4. Calculate percentage score (0 to 100).
5. Output details matching this JSON format:
{
  "score": number,
  "confidence": number (0-100),
  "syntaxOk": boolean,
  "complexity": "string description",
  "reasoning": "internal grading notes",
  "feedback": "student-facing feedback (1-2 sentences)"
}`;

  try {
    const completion = await groq!.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'You are a code grading bot returning JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    });

    const reply = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(reply.trim());

    // EXTENSION HOOK FOR FUTURE CODE EXECUTION:
    // This hooks is set for future sandbox run: const sandboxOutput = runCodeInSandbox(attempt);

    return {
      score: Math.max(0, Math.min(100, result.score || 50)),
      confidence: result.confidence || 80,
      reasoning: result.reasoning || 'Static analysis completed.',
      syntaxOk: result.syntaxOk !== undefined ? result.syntaxOk : true,
      complexity: result.complexity || 'O(N) time, O(1) space',
      feedback: result.feedback || 'Code evaluated.'
    };
  } catch (e: any) {
    return {
      score: 50,
      confidence: 50,
      reasoning: `Programming evaluation failed: ${e.message}`,
      syntaxOk: true,
      complexity: 'O(N) time',
      feedback: 'Failed to run static code analysis. Defaulting to partial grades.'
    };
  }
}
