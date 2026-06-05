/**
 * Safely parses a numeric string which may contain fractions (e.g., "1/2", "3/4")
 * or scientific notation (e.g., "2e3", "2x10^3", "2.5*10^-2").
 * Returns the parsed float or null if not a valid number.
 */
export function parseNumericValue(val: string): number | null {
  if (!val) return null;
  let cleaned = val.trim().toLowerCase().replace(/\s+/g, '');
  
  // Convert standard scientific multipliers "x10^" or "*10^" to JS standard "e"
  cleaned = cleaned.replace(/(?:x|\*|\u00D7)?10\^([+\-]?\d+)/g, 'e$1');
  
  // Handle fractions like "1/2", "-5/4"
  if (cleaned.includes('/')) {
    const parts = cleaned.split('/');
    if (parts.length === 2) {
      const numerator = parseFloat(parts[0]);
      const denominator = parseFloat(parts[1]);
      if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
        return numerator / denominator;
      }
    }
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Graded numerical evaluations.
 * If the value is within range or equals target (within tolerance), awards 100 marks.
 */
export function evaluateNumericalAnswer(
  attempt: string,
  expectedValues?: string[],
  acceptedRange?: { min?: number; max?: number },
  tolerance?: number
): { score: number; confidence: number; reasoning: string } {
  const parsedAttempt = parseNumericValue(attempt);
  if (parsedAttempt === null) {
    return {
      score: 0,
      confidence: 95,
      reasoning: `Could not parse student attempt '${attempt}' as a valid numerical value. Expected integer, float, fraction, or scientific notation.`
    };
  }

  const defaultTolerance = tolerance !== undefined ? tolerance : 0.001;

  // 1. Check range if specified
  if (acceptedRange && (acceptedRange.min !== undefined || acceptedRange.max !== undefined)) {
    const min = acceptedRange.min !== undefined ? acceptedRange.min : -Infinity;
    const max = acceptedRange.max !== undefined ? acceptedRange.max : Infinity;
    
    if (parsedAttempt >= min && parsedAttempt <= max) {
      return {
        score: 100,
        confidence: 100,
        reasoning: `Student answer ${parsedAttempt} lies within the accepted range [${min}, ${max}].`
      };
    } else {
      return {
        score: 0,
        confidence: 100,
        reasoning: `Student answer ${parsedAttempt} lies outside the accepted range [${min}, ${max}].`
      };
    }
  }

  // 2. Check acceptedValues array if specified
  if (expectedValues && expectedValues.length > 0) {
    for (const val of expectedValues) {
      const parsedExpected = parseNumericValue(val);
      if (parsedExpected !== null) {
        const diff = Math.abs(parsedAttempt - parsedExpected);
        if (diff <= defaultTolerance) {
          return {
            score: 100,
            confidence: 100,
            reasoning: `Student answer ${parsedAttempt} matches accepted target ${parsedExpected} (within tolerance ±${defaultTolerance}).`
          };
        }
      }
    }

    return {
      score: 0,
      confidence: 100,
      reasoning: `Student answer ${parsedAttempt} does not match any of the accepted values: ${expectedValues.join(', ')} (tolerance ±${defaultTolerance}).`
    };
  }

  return {
    score: 0,
    confidence: 50,
    reasoning: "Numerical verification failed because no target values or ranges were specified in the rubric."
  };
}
