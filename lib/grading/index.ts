import { evaluateNumericalAnswer } from './numerical';
import { evaluateFormulaAnswer } from './formula';
import { evaluateSemanticAnswer } from './semantic';
import { evaluateProgrammingAnswer } from './programming';

export interface GradingResult {
  score: number;
  confidence: number;
  reasoning: string;
  missingPoints: string[];
  feedback: string;
  status: 'completed' | 'needs_review';
  complexity?: string;
  syntaxOk?: boolean;
}

/**
 * Normalizes text for exact matching (removes punctuation, lowercases, trims)
 */
function normalizeForExactMatch(text: string): string {
  return (text || '')
    .trim()
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Unified entry point to grade a student's answer.
 * Checks the question's evaluationMode and executes the appropriate grading rubric.
 * Escales to 'needs_review' if confidence is low.
 */
export async function gradeAnswer(
  question: any,
  studentAnswer: string
): Promise<GradingResult> {
  const mode = question.evaluationMode || 'semantic';
  const modelAnswer = question.modelAnswer || '';
  const keyPoints = question.keyPoints || [];
  const maxMarks = question.marks || 10;

  let score = 0;
  let confidence = 100;
  let reasoning = '';
  let missingPoints: string[] = [];
  let feedback = '';
  let complexity: string | undefined;
  let syntaxOk: boolean | undefined;

  switch (mode) {
    case 'exact_match': {
      const normAttempt = normalizeForExactMatch(studentAnswer);
      const normExpected = normalizeForExactMatch(modelAnswer);
      
      // Check target accepted values if specified
      let matched = normAttempt === normExpected;
      if (!matched && question.acceptedValues && question.acceptedValues.length > 0) {
        matched = question.acceptedValues.some(
          (val: string) => normalizeForExactMatch(val) === normAttempt
        );
      }

      score = matched ? 100 : 0;
      confidence = 100;
      reasoning = matched 
        ? `Exact text match validated successfully against model answer.` 
        : `Exact match failed. Expected: '${modelAnswer}' but student wrote: '${studentAnswer}'.`;
      feedback = matched
        ? 'Perfect match! Correct answer.'
        : 'Incorrect answer. Does not match expected values.';
      break;
    }

    case 'numerical': {
      const result = evaluateNumericalAnswer(
        studentAnswer,
        question.acceptedValues || [modelAnswer],
        question.acceptedRange,
        question.tolerance
      );
      score = result.score;
      confidence = result.confidence;
      reasoning = result.reasoning;
      feedback = result.score >= 70 ? 'Numerical answer matches expected target.' : result.reasoning;
      break;
    }

    case 'formula': {
      const result = await evaluateFormulaAnswer(studentAnswer, modelAnswer);
      score = result.score;
      confidence = result.confidence;
      reasoning = result.reasoning;
      feedback = result.score >= 70 
        ? 'Symbolic formula matches expected algebraic notation.' 
        : 'Symbolic verification check failed. Review formula simplifications.';
      break;
    }

    case 'semantic': {
      const result = await evaluateSemanticAnswer(
        studentAnswer,
        modelAnswer,
        keyPoints,
        maxMarks
      );
      score = result.score;
      confidence = result.confidence;
      reasoning = result.reasoning;
      missingPoints = result.missingPoints;
      feedback = result.feedback;
      break;
    }

    case 'programming': {
      const result = await evaluateProgrammingAnswer(
        studentAnswer,
        modelAnswer,
        keyPoints
      );
      score = result.score;
      confidence = result.confidence;
      reasoning = result.reasoning;
      complexity = result.complexity;
      syntaxOk = result.syntaxOk;
      feedback = result.feedback;
      break;
    }

    case 'manual_review':
    default: {
      score = 0;
      confidence = 100;
      reasoning = `Question requires manual grading by a verifier/moderator.`;
      feedback = 'Your attempt has been submitted for manual grading review.';
      break;
    }
  }

  // Escalation criteria (Step 8):
  // Confidence < 70% OR manual_review mode OR malformed indicators (extreme syntax errors or missing values)
  const needsReview = 
    confidence < 70 || 
    mode === 'manual_review' || 
    (mode === 'programming' && syntaxOk === false && score > 30);

  return {
    score,
    confidence,
    reasoning,
    missingPoints,
    feedback,
    status: needsReview ? 'needs_review' : 'completed',
    complexity,
    syntaxOk
  };
}
