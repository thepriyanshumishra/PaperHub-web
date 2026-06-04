function unwrapProseFences(markdown) {
  return markdown.replace(
    /^```([a-zA-Z]*)[ \t]*\r?\n([\s\S]*?)^```/gm,
    (_m, lang, body) => {
      const trimmed = body.trim();
      const language = lang.toLowerCase();
      
      console.log("MATCH FOUND!");
      console.log("language:", JSON.stringify(lang));
      console.log("body:", JSON.stringify(body));
      
      const isMathOrTextLang = !language || language === 'text' || language === 'latex' || language === 'math' || language === 'markdown';
      const hasHeavyMath = /\$\$|\\\[|\\\(|\\frac|\\int|\\begin|\\end|\\lambda|\\partial/.test(trimmed);
      
      console.log("isMathOrTextLang:", isMathOrTextLang);
      console.log("hasHeavyMath:", hasHeavyMath);
      
      if (isMathOrTextLang && hasHeavyMath) {
        return '\n' + trimmed + '\n';
      }
      
      const isCode =
        /;/.test(trimmed) || 
        /^\s*\w+\s*\(/.test(trimmed) || 
        /^\s*(if|for|while|return|int|void|def|class|import|#include|const|let|var|function)\b/.test(trimmed);
        
      console.log("isCode:", isCode);
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

console.log("INPUT:");
console.log(md);
console.log("\nOUTPUT:");
console.log(unwrapProseFences(md));
