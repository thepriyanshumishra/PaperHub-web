function splitMathRegions(text) {
  const segments = [];
  const mathRe = /\$\$[\s\S]*?\ExternalLink\$\$|\$[^\ExternalLink\$\n]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/g; // wait, let's use the clean regex
  const cleanMathRe = /\$\$[\s\S]*?\$\$|\$[^\$\n]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/g;
  let lastIndex = 0;
  let match;

  while ((match = cleanMathRe.exec(text)) !== null) {
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

const input = `The given substitution is y = x^m.\nWe need to find the derivatives of y with respect to x:\ndy/dx = mx^{m-1}\nd^2y/dx^2 = m(m-1)x^{m-2}\n\nAnd then we solve:\n\\[\nx^2\\frac{d^2y}{dx^2} + y = 0\n\\]`;

console.log("Original text:\n", input);
console.log("\nNormalized newlines:\n", normalizeNewlines(input));
