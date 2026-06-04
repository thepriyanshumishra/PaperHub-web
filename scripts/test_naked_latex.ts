function mergeSplitMathLines(text: string): string {
  let s = text;
  // Merge lines if the first ends with a math operator/delimiter and the second starts with math/braces
  s = s.replace(/([\{\[\(\^\_\+\-\*\/\=\\\,])\r?\n\s*/g, '$1');
  // Merge lines if the second starts with a close brace/bracket
  s = s.replace(/\r?\n\s*([\}\]\)])/g, '$1');
  return s;
}

function splitMathRegions(text: string): Array<{ type: 'math' | 'text'; content: string }> {
  const segments: Array<{ type: 'math' | 'text'; content: string }> = [];
  const mathRe = /\$\$[\s\S]*?\$\$|\$[^\$\n]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/g;
  let lastIndex = 0;
  let match;

  while ((match = mathRe.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'math', content: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return segments;
}

function wrapNakedLaTeX(text: string): string {
  const segments = splitMathRegions(text);
  
  return segments.map(seg => {
    if (seg.type === 'math') return seg.content;
    
    let content = seg.content;
    const commandRe = /\\[a-zA-Z]+/g;
    let match;
    const mathRanges: Array<{ start: number; end: number }> = [];
    
    while ((match = commandRe.exec(content)) !== null) {
      const cmdIndex = match.index;
      
      // Expand left
      let left = cmdIndex;
      while (left > 0) {
        const char = content[left - 1];
        if (char === '\n' || char === '\r') {
          break;
        }
        if (/[\d\s\+\-\*\/\=\<\>\(\)\[\]\{\}\_\^\,\.\:\!\#\$\%\&\|\'\’]/.test(char)) {
          left--;
        } else if (/[a-zA-Z]/.test(char)) {
          let wordStart = left - 1;
          while (wordStart > 0 && /[a-zA-Z]/.test(content[wordStart - 1])) {
            wordStart--;
          }
          const word = content.slice(wordStart, left);
          const mathWords = new Set(['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'log', 'ln', 'exp', 'lim', 'det']);
          
          // Check if this word is a base for a superscript or subscript (i.e. followed by ^ or _)
          const nextChar = content[left];
          const isBaseChar = nextChar === '^' || nextChar === '_';
          
          if (word.length === 1 || mathWords.has(word.toLowerCase()) || isBaseChar) {
            left = wordStart;
          } else {
            break;
          }
        } else {
          break;
        }
      }
      
      // Expand right
      let right = cmdIndex + match[0].length;
      let openBraces = 0;
      let openBrackets = 0;
      let openParens = 0;
      
      while (right < content.length) {
        const char = content[right];
        if (char === '\n' || char === '\r') {
          break;
        }
        
        if (char === '{') { openBraces++; right++; }
        else if (char === '}') { openBraces = Math.max(0, openBraces - 1); right++; }
        else if (char === '[') { openBrackets++; right++; }
        else if (char === ']') { openBrackets = Math.max(0, openBrackets - 1); right++; }
        else if (char === '(') { openParens++; right++; }
        else if (char === ')') { openParens = Math.max(0, openParens - 1); right++; }
        else if (/[\d\s\+\-\*\/\=\<\>\_\^\,\.\:\!\#\$\%\&\|]/.test(char)) {
          right++;
        } else if (/[a-zA-Z]/.test(char)) {
          if (openBraces > 0 || openBrackets > 0 || openParens > 0) {
            right++;
          } else {
            let wordEnd = right;
            while (wordEnd < content.length && /[a-zA-Z]/.test(content[wordEnd])) {
              wordEnd++;
            }
            const word = content.slice(right, wordEnd);
            const mathWords = new Set(['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'log', 'ln', 'exp', 'lim', 'det']);
            if (word.length === 1 || mathWords.has(word.toLowerCase())) {
              right = wordEnd;
            } else {
              break;
            }
          }
        } else {
          break;
        }
      }
      
      // Clean up leading/trailing spaces
      let start = left;
      let end = right;
      while (start < cmdIndex && /\s/.test(content[start])) start++;
      while (end > cmdIndex && /\s/.test(content[end - 1])) end--;
      
      // Exclude trailing punctuation
      while (end > start && /[\.\,\:\;\!\?]/.test(content[end - 1])) {
        end--;
      }
      
      if (start < end) {
        let mergedRange = false;
        if (mathRanges.length > 0) {
          const lastRange = mathRanges[mathRanges.length - 1];
          const between = content.slice(lastRange.end, start);
          const hasNewline = between.includes('\n') || between.includes('\r');
          if (start <= lastRange.end + 2 && !hasNewline) {
            lastRange.end = Math.max(lastRange.end, end);
            mergedRange = true;
          }
        }
        if (!mergedRange) {
          mathRanges.push({ start, end });
        }
      }
      
      commandRe.lastIndex = right;
    }
    
    let result = '';
    let lastIdx = 0;
    for (const range of mathRanges) {
      if (range.start > lastIdx) {
        result += content.slice(lastIdx, range.start);
      }
      const rawMath = content.slice(range.start, range.end).trim();
      if (rawMath) {
        result += `$${rawMath}$`;
      }
      lastIdx = range.end;
    }
    if (lastIdx < content.length) {
      result += content.slice(lastIdx);
    }
    
    return result;
  }).join('');
}

const rawText = "Substituting x = \\frac{3}{11}t - \\frac{1}{11} + Ce^{-\n\\frac{11}{8}t}:\nFirst, find \\frac{dx}{dt}:\n\\frac{dx}{dt} = \\frac{3}{11} - Ce^{-\n\\frac{11}{8}t} \\cdot (-\\frac{11}{8})";

console.log("=== ORIGINAL TEXT ===");
console.log(rawText);

console.log("\n=== MERGED TEXT ===");
const merged = mergeSplitMathLines(rawText);
console.log(merged);

console.log("\n=== WRAPPED TEXT ===");
const wrapped = wrapNakedLaTeX(merged);
console.log(wrapped);
