import katex from "katex";

function splitMathRegions(text: string): Array<{ type: 'math' | 'text'; content: string }> {
  const segments: Array<{ type: 'math' | 'text'; content: string }> = [];
  const mathRe = /\x24\x24[\s\S]*?\x24\x24|\x24[^\x24\n]*?\x24|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/g;
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
    
    try {
      // Validate parsing with KaTeX by passing the INNER content and the proper display mode!
      katex.renderToString(innerContent, {
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
      return rawBlock;
    } catch (err) {
      console.warn("-> KaTeX parse error detected, recovering gracefully:", err instanceof Error ? err.message : err);
      
      const envMatch = innerContent.match(/^\\begin\{(gathered|aligned|align|matrix|pmatrix|bmatrix|cases|split|equation)\*?\}([\s\S]*?)\\end\{\1\*?\}$/);
      let textContent = envMatch ? envMatch[2].trim() : innerContent;
      
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

const inputs = [
  "This is a valid math block: $x^2 + y^2 = z^2$",
  "This has a KaTeX error: $\\label{eqn : identifieridentifier > letter[letter|number|underscore]^*}$",
  "This is C code in math: $$\n\\begin{gathered}\nint a, b; \\\\\nscanf(\"%d %d\", &a, &b);\n\\end{gathered}\n$$"
];

console.log("=== RUNNING REFINED ALL-IN-ONE MASTER FALLBACK TESTS ===\n");
for (const input of inputs) {
  console.log("INPUT:\n", input);
  const output = validateAndUnwrapMathErrors(input);
  console.log("\nOUTPUT:\n", output);
  console.log("-------------------------------------------\n");
}
