import katex from 'katex';

/**
 * sanitizeLaTeX.ts
 * -----------------
 * Server-side & Client-side utility: sanitizes AI-generated LaTeX.
 *
 * Problems fixed:
 *  1. JSON control-character corruption (\f, \b, \t, \v, \r)
 *  2. Missing backslashes on LaTeX keywords (e.g. "frac" instead of "\frac")
 *  3. Literal-bracket matrix wrappers ([ \begin{bmatrix}…end{bmatrix} ])
 *  4. Math expressions wrapped in plain prose parentheses (...) or braces {...}
 *     instead of proper $ / $$ delimiters (the most common LLM mistake)
 *  5. Complex inline $ ... $ upgraded to display $$ ... $$ blocks
 *  6. Orphaned lone $ signs stripped from prose
 *  7. LaTeX environments (matrix, aligned, cases, etc.) correctly wrapped and preserved as single display blocks.
 *  8. Complete idempotency (running multiple times on the same text leaves it perfectly intact).
 */

/* ── All LaTeX command names that the LLM commonly drops the backslash from ── */
const MATH_COMMANDS = [
  'big', 'Big', 'bigg', 'Bigg',
  'frac', 'dfrac', 'tfrac', 'cfrac', 'binom', 'dbinom', 'tbinom', 'sqrt', 'cbrt',
  'quad', 'qquad', 'hspace', 'vspace', 'text', 'mbox',
  'mathbb', 'mathcal', 'mathrm', 'mathbf', 'mathit', 'mathtt', 'mathsf', 'mathfrak', 'mathscr',
  'boldsymbol', 'bm', 'vec', 'hat', 'bar', 'tilde', 'dot', 'ddot',
  'partial', 'nabla', 'infty', 'hbar', 'ell', 'wp',
  'sim', 'approx', 'cong', 'equiv', 'propto',
  'neq', 'ne', 'leq', 'le', 'geq', 'ge', 'll', 'gg',
  'times', 'div', 'cdot', 'cdots', 'ldots', 'vdots', 'ddots', 'hdots',
  'pm', 'mp', 'oplus', 'ominus', 'otimes', 'oslash',
  'cap', 'cup', 'subset', 'supset', 'subseteq', 'supseteq',
  'notin', 'ni', 'land', 'lor', 'lnot', 'neg',
  'forall', 'exists', 'nexists', 'emptyset', 'varnothing',
  'triangle', 'angle', 'because', 'therefore',
  'sum', 'prod', 'iint', 'iiint', 'oint',
  'lim', 'limsup', 'liminf', 'max', 'min', 'sup', 'inf',
  'det', 'deg', 'dim', 'ker', 'arg', 'hom', 'Pr', 'operatorname',
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
  'arcsin', 'arccos', 'arctan', 'arccot', 'arcsec', 'arccsc',
  'sinh', 'cosh', 'tanh', 'coth', 'log', 'ln', 'lg', 'exp',
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'varepsilon',
  'zeta', 'eta', 'theta', 'vartheta', 'iota', 'kappa', 'varkappa',
  'lambda', 'mu', 'nu', 'xi', 'pi', 'varpi',
  'rho', 'varrho', 'sigma', 'varsigma', 'tau',
  'upsilon', 'phi', 'varphi', 'chi', 'psi', 'omega',
  'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi',
  'Sigma', 'Upsilon', 'Phi', 'Psi', 'Omega',
  'gets', 'mapsto',
  'leftarrow', 'rightarrow', 'leftrightarrow',
  'Leftarrow', 'Rightarrow', 'Leftrightarrow',
  'longleftarrow', 'longrightarrow', 'longleftrightarrow',
  'Longleftarrow', 'Longrightarrow', 'Longleftrightarrow',
  'nearrow', 'nwarrow', 'searrow', 'swarrow',
  'uparrow', 'downarrow', 'updownarrow',
  'Uparrow', 'Downarrow', 'Updownarrow',
  'overline', 'underline', 'widehat', 'widetilde', 'overbrace', 'underbrace',
  'overset', 'underset', 'stackrel',
  'pmod', 'bmod', 'mod', 'gcd', 'lcm', 'rank', 'trace', 'tr',
  'Re', 'Im', 'lfloor', 'rfloor', 'lceil', 'rceil',
  'langle', 'rangle', 'vert', 'Vert', 'mid',
  'prime', 'infty',
  'hline', 'cline',
];

const CMD_RE = new RegExp(
  `(?<![a-zA-Z\\\\\\u0370-\\u03ff])(${MATH_COMMANDS.join('|')})\\b`,
  'g'
);

/* ── Helper Functions ── */

function maskTextRegions(mathBlock: string): { masked: string; placeholders: string[] } {
  const placeholders: string[] = [];
  let result = '';
  let i = 0;
  const n = mathBlock.length;

  while (i < n) {
    if (mathBlock.startsWith('\\text{', i) || mathBlock.startsWith('\\mbox{', i)) {
      const isText = mathBlock.startsWith('\\text{', i);
      const prefix = isText ? '\\text{' : '\\mbox{';
      const startIdx = i;
      i += prefix.length;
      
      let depth = 1;
      while (i < n && depth > 0) {
        if (mathBlock[i] === '\\') {
          i += 2;
          continue;
        }
        if (mathBlock[i] === '{') {
          depth++;
        } else if (mathBlock[i] === '}') {
          depth--;
        }
        i++;
      }
      
      const fullTextRegion = mathBlock.slice(startIdx, i);
      const placeholder = `__MATH_TEXT_PLACEHOLDER_${placeholders.length}__`;
      placeholders.push(fullTextRegion);
      result += placeholder;
    } else {
      result += mathBlock[i];
      i++;
    }
  }

  return { masked: result, placeholders };
}

function unmaskTextRegions(masked: string, placeholders: string[]): string {
  let result = masked;
  for (let idx = 0; idx < placeholders.length; idx++) {
    result = result.replace(`__MATH_TEXT_PLACEHOLDER_${idx}__`, placeholders[idx]);
  }
  return result;
}

function replaceMathCommandsSafe(mathBlock: string): string {
  const { masked, placeholders } = maskTextRegions(mathBlock);
  const replaced = masked.replace(CMD_RE, '\\$1');
  return unmaskTextRegions(replaced, placeholders);
}

function convertSingleWordMathLists(text: string): string {
  const lines = text.split('\n');
  const processed: string[] = [];
  let i = 0;
  const n = lines.length;

  while (i < n) {
    const match = lines[i].trim().match(/^\$\$\s*([a-zA-Z_][a-zA-Z0-9_ ]*)\s*\$\$$/);
    
    if (match) {
      const group: string[] = [];
      let j = i;
      while (j < n) {
        const m = lines[j].trim().match(/^\$\$\s*([a-zA-Z_][a-zA-Z0-9_ ]*)\s*\$\$$/);
        if (!m) break;
        group.push(m[1].trim());
        j++;
      }

      if (group.length >= 2) {
        const bulletList = group.map((term, index) => {
          const cKeywords = new Set(['char', 'int', 'float', 'double', 'long', 'short', 'void', 'auto', 'register', 'static', 'extern', 'volatile', 'const']);
          if (cKeywords.has(term.toLowerCase())) {
            return `${index + 1}. \`${term}\``;
          }
          return `${index + 1}. **${term}**`;
        }).join('\n');
        
        processed.push('\n' + bulletList + '\n');
        i = j;
        continue;
      }
    }

    processed.push(lines[i]);
    i++;
  }

  return processed.join('\n');
}

function hasMathIndicators(content: string): boolean {
  return (
    /\\[a-zA-Z]/.test(content) ||       // any \command
    /[_^]\{/.test(content) ||            // subscript/superscript with braces
    /[_^][a-zA-Z0-9]/.test(content)      // simple subscript/superscript
  );
}

function needsDisplayBlock(content: string): boolean {
  return (
    /\\(frac|dfrac|int|iint|iiint|oint|sum|prod|begin|partial|sqrt|lim|mathcal|mathrm|nabla)/.test(content) ||
    (content.includes('=') && content.length > 8) ||
    content.length > 30
  );
}

function isAlreadyWrapped(trimmed: string): boolean {
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

function cleanMathDelimiters(line: string): string {
  let trimmed = line.trim();
  
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  
  const hasMultipleDisplay = (trimmed.match(/\$\$/g) || []).length > 2;
  const hasMultipleInline = (trimmed.match(/(?<!\$)\$(?!\$)/g) || []).length > 2;
  
  if (hasMultipleDisplay || hasMultipleInline) {
    const cleanContent = trimmed.replace(/\$\$/g, '').replace(/(?<!\$)\/(?!\$)/g, '').replace(/\$/g, '').trim();
    return `$$${cleanContent}$$`;
  }
  
  return trimmed;
}

function isMathLine(line: string): boolean {
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
    'sinh', 'cosh', 'tanh', 'coth', 'binom'
  ]);
  const nonMathWords = words.filter(w => !mathWords.has(w.toLowerCase()));

  if (nonMathWords.length > 0) {
    return false;
  }

  const hasMathCommands = /\\[a-zA-Z]+/.test(trimmed);
  const hasOperators = /[\+=\-\*\/<>]/.test(trimmed);
  const hasPowerOrSub = /[\^_]/.test(trimmed);
  const hasDerivatives = /d[a-zA-Z]\/d[a-zA-Z]/.test(trimmed) || /d\^2[a-zA-Z]\/d[a-zA-Z]\^2/.test(trimmed);
  const hasDoubleBackslash = /\\\\/.test(trimmed);

  return hasMathCommands || hasPowerOrSub || hasDerivatives || hasDoubleBackslash || (hasOperators && trimmed.length > 8);
}

function autoWrapMathLines(text: string): string {
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

function wrapProsemath(prose: string): string {
  const result: string[] = [];
  let i = 0;
  const n = prose.length;

  while (i < n) {
    const ch = prose[i];

    if (ch === '{') {
      const isLaTexBrace = /(?:\\[a-zA-Z]*|[\^_]|\})\s*$/.test(prose.slice(0, i));
      if (!isLaTexBrace) {
        let depth = 1;
        let j = i + 1;
        while (j < n && depth > 0) {
          if (prose[j] === '{') depth++;
          else if (prose[j] === '}') depth--;
          j++;
        }
        if (depth === 0) {
          const inner = prose.slice(i + 1, j - 1).trim();
          if (hasMathIndicators(inner)) {
            if (needsDisplayBlock(inner)) {
              result.push(`\n\n$$${inner}$$\n\n`);
            } else {
              result.push(`$${inner}$`);
            }
            i = j;
            continue;
          }
        }
      }
    }

    if (ch === '(') {
      const isLaTexParen = /(?:\\left|\\right|\\big|\\Big|\\bigg|\\Bigg)\s*$/.test(prose.slice(0, i));
      if (!isLaTexParen) {
        let depth = 1;
        let j = i + 1;
        while (j < n && depth > 0 && j - i < 400 && prose[j] !== '\n') {
          if (prose[j] === '(') depth++;
          else if (prose[j] === ')') depth--;
          j++;
        }
        if (depth === 0) {
          const inner = prose.slice(i + 1, j - 1).trim();
          if (hasMathIndicators(inner)) {
            if (needsDisplayBlock(inner)) {
              result.push(`\n\n$$${inner}$$\n\n`);
            } else {
              result.push(`$${inner}$`);
            }
            i = j;
            continue;
          }
        }
      }
    }

    result.push(ch);
    i++;
  }

  return result.join('');
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

function convertMathCodeBlocks(text: string): string {
  const segments = splitMathRegions(text);
  
  return segments.map(seg => {
    if (seg.type !== 'math') return seg.content;
    
    let mathContent = seg.content;
    if (mathContent.startsWith('$$') && mathContent.endsWith('$$')) {
      mathContent = mathContent.slice(2, -2).trim();
    } else if (mathContent.startsWith('$') && mathContent.endsWith('$')) {
      mathContent = mathContent.slice(1, -1).trim();
    } else if (mathContent.startsWith('\\[') && mathContent.endsWith('\\]')) {
      mathContent = mathContent.slice(2, -2).trim();
    } else if (mathContent.startsWith('\\(') && mathContent.endsWith('\\)')) {
      mathContent = mathContent.slice(2, -2).trim();
    }
    
    const envMatch = mathContent.match(/^\\begin\{(gathered|aligned|align|matrix|pmatrix|bmatrix|cases|split|equation)\*?\}([\s\S]*?)\\end\{\1\*?\}$/);
    let innerText = envMatch ? envMatch[2].trim() : mathContent;
    
    // Replace LaTeX line breaks \\ with actual newlines
    innerText = innerText.replace(/\\\\\s*/g, '\n');
    
    const lines = innerText.split('\n').map(line => {
      let l = line.trim();
      l = l.replace(/\\%/g, '%');
      l = l.replace(/\\&/g, '&');
      l = l.replace(/\\_/g, '_');
      l = l.replace(/\\</g, '<').replace(/\\>/g, '>');
      return l;
    });
    
    let cleanedText = lines.join('\n');
    
    // Post-process: Convert raw newlines inside double-quoted strings back to literal \n
    cleanedText = cleanedText.replace(/"([^"]*)"/g, (match, p1) => {
      return '"' + p1.replace(/\n/g, '\\n') + '"';
    });
    
    const isCode = 
      /;\s*$/.test(cleanedText) ||
      /\b(int|void|char|float|double|clock_t|bool)\b/.test(cleanedText) ||
      /\b(scanf|printf|srand|rand|clock|main|include|define)\b/.test(cleanedText) ||
      /\b(for|if|while|else|return)\b/.test(cleanedText) ||
      /[a-zA-Z0-9_]+\[[a-zA-Z0-9_]+\]/.test(cleanedText) ||
      /(&&|\|\|)/.test(cleanedText) ||
      /%[d-s]/.test(cleanedText) ||
      /#[a-zA-Z]+/.test(cleanedText);
      
    if (isCode) {
      return `\n\n\`\`\`c\n${cleanedText}\n\`\`\`\n\n`;
    }
    
    return seg.content;
  }).join('');
}

function autoWrapProseMath(s: string): string {
  const segs = splitMathRegions(s);
  return segs.map(seg => {
    if (seg.type === 'math') return seg.content;
    return autoWrapMathLines(seg.content);
  }).join('');
}

function mergeSplitMathLines(text: string): string {
  let s = text;
  s = s.replace(/([\{\[\(\^\_\+\-\/=\,])\r?\n\s*/g, '$1');
  s = s.replace(/\r?\n\s*([\}\]\)])/g, '$1');
  return s;
}

function wrapNakedLaTeX(text: string): string {
  const segments = splitMathRegions(text);
  
  return segments.map(seg => {
    if (seg.type === 'math') return seg.content;
    
    const content = seg.content;
    const commandRe = /\\[a-zA-Z]+/g;
    let match;
    const mathRanges: Array<{ start: number; end: number }> = [];
    
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
          while (wordStart > 0 && /[a-zA-Z]/i.test(content[wordStart - 1])) {
            wordStart--;
          }
          const word = content.slice(wordStart, left);
          const mathWords = new Set(['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'log', 'ln', 'exp', 'lim', 'det', 'binom']);
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
            while (wordEnd < content.length && /[a-zA-Z]/i.test(content[wordEnd])) {
              wordEnd++;
            }
            const word = content.slice(right, wordEnd);
            const mathWords = new Set(['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'log', 'ln', 'exp', 'lim', 'det', 'binom']);
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
      let rawMath = content.slice(range.start, range.end).trim();
      if (rawMath) {
        if (rawMath.startsWith('[') && rawMath.endsWith(']')) {
          rawMath = rawMath.slice(1, -1).trim();
        }
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

function maskCodeBlocks(text: string): { masked: string; placeholders: string[] } {
  const placeholders: string[] = [];
  const regex = /```[a-zA-Z]*\r?\n[\s\S]*?```/g;
  
  const masked = text.replace(regex, (match) => {
    const placeholder = `__CODE_BLOCK_PLACEHOLDER_${placeholders.length}__`;
    placeholders.push(match);
    return placeholder;
  });
  
  return { masked, placeholders };
}

function unmaskCodeBlocks(masked: string, placeholders: string[]): string {
  let result = masked;
  for (let idx = 0; idx < placeholders.length; idx++) {
    result = result.replace(`__CODE_BLOCK_PLACEHOLDER_${idx}__`, placeholders[idx]);
  }
  return result;
}

function validateAndUnwrapMathErrors(text: string): string {
  const segments = splitMathRegions(text);
  
  return segments.map(seg => {
    if (seg.type !== 'math') return seg.content;
    
    const rawBlock = seg.content;
    
    let innerContent = rawBlock;
    let isDisplay = false;
    if (innerContent.startsWith('$$') && innerContent.endsWith('$$')) {
      innerContent = innerContent.slice(2, -2).trim();
      isDisplay = true;
    } else if (innerContent.startsWith('$') && innerContent.endsWith('$')) {
      innerContent = innerContent.slice(1, -1).trim();
    } else if (innerContent.startsWith('\\[') && innerContent.endsWith('\\]')) {
      innerContent = innerContent.slice(2, -2).trim();
      isDisplay = true;
    } else if (innerContent.startsWith('\\(') && innerContent.endsWith('\\)')) {
      innerContent = innerContent.slice(2, -2).trim();
    }

    // Clean up unsupported macros before dry-run validating!
    // This is the absolute master fix: we strip \label{...} from the math block!
    const cleanedInner = innerContent.replace(/\\label\{[^{}]*\}/g, '');
    
    try {
      katex.renderToString(cleanedInner, {
        throwOnError: true,
        displayMode: isDisplay,
        macros: {
          '\\bold': '\\mathbf',
          '\\bm': '\\boldsymbol',
          '\\sgn': '\\operatorname{sgn}',
          '\\tr': '\\operatorname{tr}',
          '\\tg': '\\tan',
          '\\ctg': '\\cot',
          '\\sh': '\\sinh',
          '\\ch': '\\cosh',
          '\\th': '\\tanh',
          '\\cth': '\\coth',
          '\\sp': '^',
          '\\sb': '_',
          '\\box': '\\Box',
        }
      });
      if (isDisplay) {
        return `\n\n$$${cleanedInner}$$\n\n`;
      }
      return `$${cleanedInner}$`;
    } catch {
      const envMatch = cleanedInner.match(/^\\begin\{(gathered|aligned|align|matrix|pmatrix|bmatrix|cases|split|equation)\*?\}([\s\S]*?)\\end\{\1\*?\}$/);
      let textContent = envMatch ? envMatch[2].trim() : cleanedInner;
      
      textContent = textContent.replace(/\\\\\s*/g, '\n');
      
      textContent = textContent
        .replace(/\\%/g, '%')
        .replace(/\\&/g, '&')
        .replace(/\\_/g, '_')
        .replace(/\\</g, '<')
        .replace(/\\>/g, '>')
        .replace(/\\label/g, 'label');
      
      const lines = textContent.split('\n').map(l => l.trim()).filter(Boolean);
      const cleaned = lines.join('\n');
      
      const isCode = 
        /;\s*$/.test(cleaned) ||
        /\b(int|void|char|float|double|clock_t|bool)\b/.test(cleaned) ||
        /\b(scanf|printf|srand|rand|clock|main|include|define)\b/.test(cleaned) ||
        /\b(for|if|while|else|return)\b/.test(cleaned) ||
        /[a-zA-Z0-9_]+\[[a-zA-Z0-9_]+\]/.test(cleaned) ||
        /(&&|\|\|)/.test(cleaned) ||
        /%[d-s]/.test(cleaned) ||
        /#[a-zA-Z]+/.test(cleaned);
        
      if (isCode) {
        return `\n\n\`\`\`c\n${cleaned}\n\`\`\`\n\n`;
      }
      
      if (isDisplay) {
        return `\n\n${cleaned}\n\n`;
      } else {
        return ` \`${cleaned}\` `;
      }
    }
  }).join('');
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main sanitizer
   ───────────────────────────────────────────────────────────────────────────── */
export function sanitizeAILatex(text: string): string {
  if (!text) return text;

  // Replace literal backslash-n strings with actual newline characters
  let s = text.replace(/\\n/g, '\n');

  // Convert raw single-word display math blocks to clean ordered lists
  s = convertSingleWordMathLists(s);

  // Convert mistakenly wrapped C code display math blocks to standard C markdown blocks
  s = convertMathCodeBlocks(s);

  // Mask all standard code blocks to protect their contents from mathematical corrections
  const { masked, placeholders } = maskCodeBlocks(s);
  s = masked;

  // 1. Restore JSON control-character corruption
  s = s
    .replace(/\x0c/g, '\\f')
    .replace(/\x08/g, '\\b')
    .replace(/\x09/g, '\\t')
    .replace(/\x0b/g, '\\v')
    .replace(/\x0d(?!\n)/g, '\\r');

  // Convert standard escaped math delimiters to dollar delimiters for remarkMath parsing
  s = s
    .replace(/\\\[/g, () => '\n\n$$\n')
    .replace(/\\\]/g, () => '\n$$\n\n')
    .replace(/\\\(/g, () => '$')
    .replace(/\\\)/g, () => '$');

  // Pre-sanitize: Restore missing backslashes on highly specific math-only keywords globally
  s = s.replace(/(?<![a-zA-Z\\])(frac|dfrac|tfrac|cfrac|binom|dbinom|tbinom|sqrt|cbrt|mathcal|mathrm|mathbf|mathbb|boldsymbol|bm|partial|nabla|infty)\b/g, '\\$1');
  s = s.replace(/(?<![a-zA-Z\\])(begin|end)\b\s*\{\s*(matrix|pmatrix|bmatrix|vmatrix|Vmatrix|Bmatrix|cases|dcases|rcases|drcases|array|align|aligned|gather|gathered|split|equation)\*?\s*\}/g, '\\$1{$2}');

  // Wrap any LaTeX environments (matrix, aligned, cases, etc.) in $$ block delimiters and strip outer brackets
  // ONLY in text regions to avoid double-wrapping!
  {
    const ENV_RE = /(?:\\\[|\[)?\s*(?<!\\)\\begin\{(matrix|pmatrix|bmatrix|vmatrix|Vmatrix|Bmatrix|smallmatrix|array|cases|dcases|rcases|drcases|align|aligned|gather|gathered|split|multline|eqnarray|equation)\*?\}([\s\S]*?)(?<!\\)\\end\{\1\*?\}\s*(?:\\\]|\])?/g;
    const segs = splitMathRegions(s);
    s = segs.map(seg => {
      if (seg.type === 'math') return seg.content;
      return seg.content.replace(ENV_RE, (_m, env, body) => {
        return `\n\n$$\n\\begin{${env}}${body.trim()}\\end{${env}}\n$$\n\n`;
      });
    }).join('');
  }

  // Deep Fix: Heal math split across newlines and wrap naked LaTeX in inline delimiters
  s = mergeSplitMathLines(s);
  s = wrapNakedLaTeX(s);

  // Auto-wrap pure mathematical lines in $$ display delimiters
  s = autoWrapProseMath(s);

  // Restore missing backslashes INSIDE existing math delimiters
  s = s.replace(
    /(\$\$[\s\S]*?\$\$|\$[^\$\n]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g,
    (mathBlock) => replaceMathCommandsSafe(mathBlock)
  );

  // Detect math wrapped in prose {...} or (...) and convert to $/$$
  {
    const segs = splitMathRegions(s);
    s = segs.map(seg => {
      if (seg.type === 'math') return seg.content;
      return wrapProsemath(seg.content);
    }).join('');
  }

  // Restore missing backslashes in NEWLY created math regions
  s = s.replace(
    /(\$\$[\s\S]*?\$\$|\$[^\$\n]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g,
    (mathBlock) => replaceMathCommandsSafe(mathBlock)
  );

  // Auto-upgrade complex inline $...$ to display $$...$$
  {
    const segs = splitMathRegions(s);
    s = segs.map(seg => {
      if (seg.type !== 'math') return seg.content;
      if (!seg.content.startsWith('$') || seg.content.startsWith('$$')) return seg.content;

      const mathContent = seg.content.slice(1, -1).trim();

      const hasComplexCommand = /\\(frac|dfrac|partial|int|iint|iiint|oint|sum|prod|begin|end|sqrt|mathcal|mathrm|nabla|binom)/.test(mathContent);
      const hasEqualWithLength = mathContent.includes('=') && mathContent.length > 15;
      const hasDerivatives = /[a-zA-Z]''?\(/.test(mathContent);
      const isMultiTerm = (mathContent.includes('+') || mathContent.includes('-')) && mathContent.length > 20;

      if (hasComplexCommand || hasDerivatives || hasEqualWithLength || isMultiTerm) {
        return `\n\n$$${mathContent}$$\n\n`;
      }

      return seg.content;
    }).join('');
  }

  // Normalize multi-line display math blocks by wrapping them in gathered environments
  {
    const segs = splitMathRegions(s);
    s = segs.map(seg => {
      if (seg.type !== 'math') return seg.content;
      if (!seg.content.startsWith('$$')) return seg.content;
      
      const mathContent = seg.content.slice(2, -2).trim();
      if (mathContent.includes('\n') && !mathContent.includes('\\begin{')) {
        const lines = mathContent
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean);
        
        return `$$\n\\begin{gathered}\n${lines.join(' \\\\\n')}\n\\end{gathered}\n$$`;
      }
      return seg.content;
    }).join('');
  }

  // Strip orphaned lone $ signs in prose (LLM artefacts)
  {
    const parts: string[] = [];
    const mathTokenRe = /\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$/g;
    let lastIdx = 0;
    let m: RegExpExecArray | null;

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
    s = parts.join('');
  }

  // Collapse excess blank lines
  s = s.replace(/\n{3,}/g, '\n\n');

  // Ultimate Master Fallback: Validate all remaining math regions with KaTeX parser
  // and gracefully unwrap/recover any regions that fail to parse.
  s = validateAndUnwrapMathErrors(s);

  // Restore all protected C code blocks
  s = unmaskCodeBlocks(s, placeholders);

  return s;
}

/**
 * Recursively sanitize every string field in a parsed solution object.
 * Exempts "code" and "mermaid" properties to protect programming code and diagram syntax.
 */
export function sanitizeSolutionObject<T>(obj: T): T {
  return sanitizeSolutionObjectHelper(obj, null) as unknown as T;
}

function sanitizeSolutionObjectHelper(obj: unknown, keyName: string | null): unknown {
  if (typeof obj === 'string') {
    if (keyName === 'mermaid') {
      return obj.replace(/\\"/g, '"');
    }
    if (keyName === 'code') {
      return obj;
    }
    return sanitizeAILatex(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeSolutionObjectHelper(item, keyName));
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = sanitizeSolutionObjectHelper(v, k);
    }
    return result;
  }
  return obj;
}
