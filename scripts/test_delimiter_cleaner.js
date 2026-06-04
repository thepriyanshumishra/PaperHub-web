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

const question = `$$x^2\\frac{d^2y}{dx^2}$$ + $$x\\frac{dy}{dx}$$ + y = $$\\log x \\sin(\\log x)$$`;

console.log("Original question:");
console.log(question);
console.log("\nCleaned & Merged question:");
console.log(cleanMathDelimiters(question));
