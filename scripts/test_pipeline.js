const fs = require('fs');

// We will read the functions directly from /Users/thedarkpcm/Desktop/Priyanshu/PaperHub-web/components/math-markdown.tsx
// using Node's require/import or by copy-pasting the relevant code.
// Let's copy-paste the exact functions to make the script robust and quick.

function isAlreadyWrapped(trimmed) {
  if (trimmed.startsWith('$$') && trimmed.endsWith('$$')) {
    return (trimmed.match(/\$\$/g) || []).length === 2;
  }
  if (trimmed.startsWith('$') && trimmed.endsWith('$')) {
    const singleDollarCount = (trimmed.match(/(?<!\$)\$(?!\$)/g) || []).length;
    return singleDollarCount === 2;
  }
  if (trimmed.startsWith('\\[') && trimmed.endsWith('\\]')) {
    return (trimmed.match(/\\\[/g) || []).length === 1 && (trimmed.match(/\\\]/g) || []).length === 1;
  }
  if (trimmed.startsWith('\\(') && trimmed.endsWith('\\)')) {
    return (trimmed.match(/\\\(/g) || []).length === 1 && (trimmed.match(/\\\)/g) || []).length === 1;
  }
  return false;
}

function cleanMathDelimiters(line) {
  const trimmed = line.trim();
  
  const hasMultipleDisplay = (trimmed.match(/\$\$/g) || []).length > 2;
  const hasMultipleInline = (trimmed.match(/(?<!\$)\$(?!\$)/g) || []).length > 2;
  
  if (hasMultipleDisplay || hasMultipleInline) {
    const cleanContent = trimmed.replace(/\$\$/g, '').replace(/(?<!\$)\/(?!\$)/g, '').replace(/\$/g, '').trim();
    return `$$${cleanContent}$$`;
  }
  
  return line;
}

function isMathLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 5) return false;

  if (isAlreadyWrapped(trimmed)) {
    return false;
  }

  const textWithoutCommands = trimmed.replace(/\\[a-zA-Z]+/g, ' ').replace(/\$/g, '');
  const words = textWithoutCommands.match(/[a-zA-Z]{3,}/g) || [];
  
  const mathWords = new Set([
    'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
    'log', 'ln', 'exp', 'lim', 'det', 'deg',
    'dim', 'ker', 'arcsin', 'arccos', 'arctan',
    'sinh', 'cosh', 'tanh', 'coth'
  ]);
  const nonMathWords = words.filter(w => !mathWords.has(w.toLowerCase()));

  if (nonMathWords.length > 0) {
    return false;
  }

  const hasMathCommands = /\\[a-zA-Z]+/.test(trimmed);
  const hasOperators = /[\+=\-\*\/<>]/.test(trimmed);
  const hasPowerOrSub = /[\^_]/.test(trimmed);
  const hasDerivatives = /d[a-zA-Z]\/d[a-zA-Z]/.test(trimmed) || /d\^2[a-zA-Z]\/d[a-zA-Z]\^2/.test(trimmed);

  return hasMathCommands || hasPowerOrSub || hasDerivatives || (hasOperators && trimmed.length > 8);
}

function autoWrapMathLines(text) {
  const lines = text.split('\n');
  const processed = lines.map(line => {
    if (isMathLine(line)) {
      const cleaned = cleanMathDelimiters(line);
      if (cleaned.startsWith('$$') && cleaned.endsWith('$$')) {
        return `\n\n${cleaned}\n\n`;
      }
      return `\n\n$$${cleaned.trim()}$$\n\n`;
    }
    return line;
  });
  return processed.join('\n').replace(/\n{3,}/g, '\n\n');
}

function splitMathRegions(text) {
  const segments = [];
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

function autoWrapProseMath(s) {
  const segs = splitMathRegions(s);
  return segs.map(seg => {
    if (seg.type === 'math') return seg.content;
    return autoWrapMathLines(seg.content);
  }).join('');
}

function normalizeNewlines(text) {
  const segs = splitMathRegions(text);
  return segs.map(seg => {
    if (seg.type === 'math') return seg.content;
    
    const parts = seg.content.split(/(```[\s\S]*?```)/g);
    return parts.map(part => {
      if (part.startsWith('```')) return part;
      
      return part
        .replace(/(?<!\n)\n(?!\n)/g, '\n\n')
        .replace(/\n{3,}/g, '\n\n');
    }).join('');
  }).join('');
}

function mergeSplitMathLines(text) {
  let s = text;
  s = s.replace(/([\{\[\(\^\_\+\-\*\/\=\\\,])\r?\n\s*/g, '$1');
  s = s.replace(/\r?\n\s*([\}\]\)])/g, '$1');
  return s;
}

function wrapNakedLaTeX(text) {
  const segments = splitMathRegions(text);
  
  return segments.map(seg => {
    if (seg.type === 'math') return seg.content;
    
    let content = seg.content;
    const commandRe = /\\[a-zA-Z]+/g;
    let match;
    const mathRanges = [];
    
    while ((match = commandRe.exec(content)) !== null) {
      const cmdIndex = match.index;
      
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
      
      let start = left;
      let end = right;
      while (start < cmdIndex && /\s/.test(content[start])) start++;
      while (end > cmdIndex && /\s/.test(content[end - 1])) end--;
      
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

function preprocessLaTeX(content) {
  if (!content) return '';

  let s = mergeSplitMathLines(content);
  s = wrapNakedLaTeX(s);

  s = autoWrapProseMath(s);
  s = normalizeNewlines(s);

  s = s
    .replace(/\\\[/g, () => '\n\n$$\n')
    .replace(/\\\]/g, () => '\n$$\n\n')
    .replace(/\\\(/g, () => '$')
    .replace(/\\\)/g, () => '$');

  const parts = [];
  const mathTokenRe = /\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$/g;
  let lastIdx = 0;
  let m;

  while ((m = mathTokenRe.exec(s)) !== null) {
    if (m.index > lastIdx) {
      parts.push(s.slice(lastIdx, m.index).replace(/\$/g, ''));
    }
    parts.push(m[0]);
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < s.length) {
    parts.push(s.slice(lastIdx).replace(/\$/g, ''));
  }

  return parts.join('');
}

function unwrapProseFences(markdown) {
  return markdown.replace(
    /^```([a-zA-Z]*)[ \t]*\r?\n([\s\S]*?)^```/gm,
    (_m, lang, body) => {
      const trimmed = body.trim();
      const language = lang.toLowerCase();
      
      const isMathOrTextLang = !language || language === 'text' || language === 'latex' || language === 'math' || language === 'markdown';
      const hasHeavyMath = /\$\$|\\\[|\\\(|\\frac|\\int|\\begin|\\end|\\lambda|\\partial/.test(trimmed);
      
      if (isMathOrTextLang && hasHeavyMath) {
        return '\n' + trimmed + '\n';
      }
      
      const isCode =
        /;/.test(trimmed) || 
        /^\s*\w+\s*\(/.test(trimmed) || 
        /^\s*(if|for|while|return|int|void|def|class|import|#include|const|let|var|function)\b/.test(trimmed);
        
      if (isCode) return _m;
      return '\n' + trimmed + '\n';
    }
  );
}

const md = `From the given equation
z^4p^2 + z^2q^2 = 1
, we can simplify Charpit's equations. Notice that
2z^4p^2 + 2z^2q^2 = 2
, so we can simplify the equation for dz:

\`\`\`
$$
\\frac{dx}{2z^4p} = \\frac{dy}{2z^2q} = \\frac{dz}{2} = \\frac{-dp}{...
$$

Integrating each of these expressions gives us:

$$
x + z^3p = a
$$

$$
y + zq = b
$$

$$
z^2 = c
$$

where $a$, $b$, and $c$ are constants of integration.
\`\`\``;

console.log("PREPROCESS FIRST:");
const prep = preprocessLaTeX(md);
console.log(prep);
console.log("\nUNWRAP AFTER PREPROCESS:");
console.log(unwrapProseFences(prep));
