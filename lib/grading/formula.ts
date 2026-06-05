import { groq, isAiEnabled } from '@/lib/groq';
import { sanitizeText, AI_LIMITS } from '@/lib/promptSafety';

/**
 * Inserts explicit multiplication signs (*) in algebraic expressions where they are implied.
 * E.g., "2ab" -> "2*a*b", "(a+b)(a-b)" -> "(a+b)*(a-b)", "3(x+y)" -> "3*(x+y)"
 */
export function insertImpliedMultiplications(expr: string): string {
  let res = expr.replace(/\s+/g, '');

  // Digit followed by variable: e.g. "2x" -> "2*x"
  res = res.replace(/(\d)([a-z])/gi, '$1*$2');

  // Variable followed by variable: e.g. "ab" -> "a*b"
  res = res.replace(/([a-z])([a-z])/gi, '$1*$2');

  // Closing parenthesis followed by opening: e.g. ")( " -> ")*("
  res = res.replace(/\)\(/g, ')*(');

  // Closing parenthesis followed by variable or digit: e.g. ")x" -> ")*x"
  res = res.replace(/\)([a-z0-9])/gi, ')*$1');

  // Digit or variable followed by opening parenthesis: e.g. "x(" -> "x*("
  res = res.replace(/([a-z0-9])\(/gi, '$1*(');

  return res;
}

/**
 * Safely evaluates a math expression by replacing variables with numbers.
 * Expression is sanitized to allow only numbers, basic operators (+,-,*,/,**), parentheses, and spaces.
 */
export function safeEvaluateMath(expr: string, variableMap: Record<string, number>): number | null {
  try {
    let substituted = insertImpliedMultiplications(expr).toLowerCase();
    
    // Replace variables (e.g. 'x', 'y', 'a') with their values
    // Iterate keys in descending length order so 'xx' is replaced before 'x'
    const sortedKeys = Object.keys(variableMap).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      const val = variableMap[key];
      // Regex boundary checks for isolated variables
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      substituted = substituted.replace(regex, `(${val})`);
    }

    // Replace ^ with JS exponentiation **
    substituted = substituted.replace(/\^/g, '**');

    // Strict validation regex: allow only digits, dec, e, operations, parentheses
    const sanitized = substituted.replace(/\s+/g, '');
    if (!/^[0-9+\-*/().e**]+$/.test(sanitized)) {
      return null;
    }

    // Safe execution using Function constructor
    const result = new Function(`return (${sanitized});`)();
    return typeof result === 'number' && !isNaN(result) && isFinite(result) ? result : null;
  } catch (e) {
    return null;
  }
}

/**
 * Finds all single-character variables in an algebraic formula.
 */
export function findVariables(expr: string): string[] {
  const matches = expr.match(/\b[a-z]\b/gi) || [];
  return Array.from(new Set(matches.map(m => m.toLowerCase())));
}

/**
 * Evaluates formula equivalence by checking substitution results across 5 random trials.
 * Falls back to LLM comparison if the substitution parsing fails.
 */
export async function evaluateFormulaAnswer(
  attempt: string,
  modelAnswer: string
): Promise<{ score: number; confidence: number; reasoning: string }> {
  const variables = Array.from(new Set([...findVariables(attempt), ...findVariables(modelAnswer)]));

  // If no variables found, perform simple direct numerical evaluation check
  if (variables.length === 0) {
    const attemptVal = safeEvaluateMath(attempt, {});
    const modelVal = safeEvaluateMath(modelAnswer, {});
    if (attemptVal !== null && modelVal !== null) {
      const match = Math.abs(attemptVal - modelVal) < 1e-4;
      return {
        score: match ? 100 : 0,
        confidence: 100,
        reasoning: `Numerical formula match check: ${attempt} = ${attemptVal}, Model = ${modelVal}. equivalent: ${match}`
      };
    }
  } else {
    // Variable substitution checks
    let successCount = 0;
    let failCount = 0;

    for (let trial = 0; trial < 5; trial++) {
      const variableMap: Record<string, number> = {};
      variables.forEach(v => {
        // Generate random floating-point value between -5 and 5 (avoiding 0 to prevent div-by-zero problems)
        let rand = Math.random() * 10 - 5;
        if (Math.abs(rand) < 0.2) rand += 0.5;
        variableMap[v] = rand;
      });

      const attemptResult = safeEvaluateMath(attempt, variableMap);
      const modelResult = safeEvaluateMath(modelAnswer, variableMap);

      if (attemptResult !== null && modelResult !== null) {
        const diff = Math.abs(attemptResult - modelResult);
        // Using relative difference check to handle large floats
        const divisor = Math.max(Math.abs(attemptResult), Math.abs(modelResult), 1e-9);
        if (diff / divisor < 1e-4) {
          successCount++;
        } else {
          failCount++;
        }
      } else {
        // Parsing error on substitution
        break;
      }
    }

    // If all random substitutions match successfully
    if (successCount === 5 && failCount === 0) {
      return {
        score: 100,
        confidence: 95,
        reasoning: `Algebraic equivalence validated via numeric substitution checks across 5 trials on variables: ${variables.join(', ')}.`
      };
    }
    
    // If substitution definitely failed (different output on correct evaluation)
    if (failCount > 0 && successCount + failCount === 5) {
      return {
        score: 0,
        confidence: 95,
        reasoning: `Algebraic equivalence failed: numeric substitution checks across trials yielded different results. Attempt: ${attempt}, Model: ${modelAnswer}`
      };
    }
  }

  // 3. Fallback to Llama algebraic validator if substitution parsing failed
  if (isAiEnabled()) {
    try {
      const prompt = `You are a mathematical and symbolic expression checker.
Analyze if the student's formula matches the model formula in mathematical/scientific meaning (e.g. algebraic simplification, chemical equation balance, physics parameter identity).
Model Formula: "${sanitizeText(modelAnswer, AI_LIMITS.questionText)}"
Student Attempt: "${sanitizeText(attempt, AI_LIMITS.chatMessage)}"

Decide if they are equivalent.
Return ONLY a JSON response:
{
  "equivalent": boolean,
  "confidence": number (0-100),
  "reasoning": "string"
}`;

      const completion = await groq!.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'You are a strict math symbolic checker returning JSON.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      });

      const reply = completion.choices[0]?.message?.content || '{}';
      const result = JSON.parse(reply.trim());
      
      return {
        score: result.equivalent ? 100 : 0,
        confidence: result.confidence || 80,
        reasoning: `AI algebraic check: ${result.reasoning}`
      };
    } catch (e) {
      // Fallback
    }
  }

  return {
    score: 0,
    confidence: 50,
    reasoning: "Symbolic parsing failed, and AI evaluation is currently offline. Review manually."
  };
}
