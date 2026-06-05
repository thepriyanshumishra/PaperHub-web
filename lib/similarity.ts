/**
 * Normalizes text by removing punctuation, converting to lowercase, 
 * stripping LaTeX expressions/environments, and collapsing whitespace.
 */
export function normalizeQuestionText(text: string): string {
  if (!text) return '';

  return text
    .toLowerCase()
    // Remove LaTeX commands (like \frac, \sqrt, \alpha, \begin{matrix}, etc.)
    .replace(/\\[a-zA-Z]+/g, ' ')
    // Remove LaTeX environment tags and math modes (like $ or $$)
    .replace(/[\$\{\}\[\]\(\)\\\_\^]/g, ' ')
    // Remove Markdown formatting characters
    .replace(/[\#\*\_`\-\+]/g, ' ')
    // Remove common punctuation
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ' ')
    // Collapse multiple whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates Jaccard Similarity between two token sets.
 * Jaccard = Intersection / Union
 */
export function calculateJaccardSimilarity(text1: string, text2: string): number {
  const norm1 = normalizeQuestionText(text1);
  const norm2 = normalizeQuestionText(text2);

  if (!norm1 && !norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;

  const words1 = new Set(norm1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(norm2.split(' ').filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) {
    // Fallback to direct character contains if words are too short
    return norm1 === norm2 ? 1.0 : (norm1.includes(norm2) || norm2.includes(norm1) ? 0.5 : 0.0);
  }

  const intersection = new Set<string>();
  words1.forEach(x => {
    if (words2.has(x)) {
      intersection.add(x);
    }
  });

  const union = new Set<string>(words1);
  words2.forEach(x => union.add(x));

  return intersection.size / union.size;
}

/**
 * Calculates a comprehensive similarity score combining Jaccard set overlap
 * and substring/inclusion scoring to detect exact, near, and reworded duplicates.
 */
export function getSimilarityScore(text1: string, text2: string): number {
  const jaccard = calculateJaccardSimilarity(text1, text2);
  const norm1 = normalizeQuestionText(text1);
  const norm2 = normalizeQuestionText(text2);

  // Exact match after normalization
  if (norm1 === norm2) return 1.0;

  // Containment score (if one question contains the entirety of the other)
  let containment = 0;
  if (norm1.length > 10 && norm2.length > 10) {
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
      containment = Math.min(norm1.length, norm2.length) / Math.max(norm1.length, norm2.length);
    }
  }

  // Combine scores, favoring exact token overlaps but factoring in layout containment
  return Math.max(jaccard, containment);
}
