/**
 * sanitizeLaTeX.ts
 * -----------------
 * Server-side utility: sanitizes AI-generated LaTeX BEFORE it is stored in MongoDB.
 *
 * The LLaMA/Groq JSON output routinely corrupts LaTeX in two ways:
 *
 *  1. JSON escape-sequence mangling
 *     "\frac"  → "\x0c" + "rac"   (form-feed)
 *     "\begin" → "\x08" + "egin"  (backspace)
 *     "\right" → "\x0d" + "ight"  (carriage-return)
 *     "\tab"   → "\x09" + "ab"    (horizontal tab)
 *     "\vert"  → "\x0b" + "ert"   (vertical tab)
 *
 *  2. Missing backslashes on LaTeX keyword names
 *     "begin{bmatrix}" instead of "\begin{bmatrix}"
 *     "end{pmatrix}"   instead of "\end{pmatrix}"
 *     "rightarrow"     instead of "\rightarrow"
 *     … etc.
 *
 *  3. Literal-bracket matrix wrappers
 *     "[ \begin{bmatrix} 1 & 2 \\ 3 & 4 end{bmatrix} ]"
 *     → "\[\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}\]"
 *
 * After this function runs the text contains clean, standard LaTeX that
 * MathJax / KaTeX can parse without any further preprocessing.
 */

/* ── All LaTeX command names that the LLM commonly drops the backslash from ── */
const MATH_COMMANDS = [
  // Delimiters
  'left', 'right', 'big', 'Big', 'bigg', 'Bigg',
  // Environments
  'begin', 'end',
  // Fractions / roots
  'frac', 'dfrac', 'tfrac', 'cfrac', 'sqrt', 'cbrt',
  // Spacing
  'quad', 'qquad', 'hspace', 'vspace', 'text', 'mbox',
  // Font styles
  'mathbb', 'mathcal', 'mathrm', 'mathbf', 'mathit', 'mathtt', 'mathsf',
  'boldsymbol', 'bm', 'vec', 'hat', 'bar', 'tilde', 'dot', 'ddot',
  // Operators
  'partial', 'nabla', 'infty', 'hbar', 'ell', 'wp',
  'sim', 'approx', 'cong', 'equiv', 'propto',
  'neq', 'ne', 'leq', 'le', 'geq', 'ge', 'll', 'gg',
  'times', 'div', 'cdot', 'cdots', 'ldots', 'vdots', 'ddots', 'hdots',
  'pm', 'mp', 'oplus', 'ominus', 'otimes', 'oslash',
  'cap', 'cup', 'subset', 'supset', 'subseteq', 'supseteq',
  'in', 'notin', 'ni', 'land', 'lor', 'lnot', 'neg',
  'forall', 'exists', 'nexists', 'emptyset', 'varnothing',
  'triangle', 'angle', 'because', 'therefore',
  'sum', 'prod', 'int', 'iint', 'iiint', 'oint',
  'lim', 'limsup', 'liminf', 'max', 'min', 'sup', 'inf',
  'det', 'deg', 'dim', 'ker', 'arg', 'hom', 'Pr',
  // Trig / log
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
  'arcsin', 'arccos', 'arctan', 'arccot', 'arcsec', 'arccsc',
  'sinh', 'cosh', 'tanh', 'coth', 'log', 'ln', 'lg', 'exp',
  // Greek (lower)
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'varepsilon',
  'zeta', 'eta', 'theta', 'vartheta', 'iota', 'kappa', 'varkappa',
  'lambda', 'mu', 'nu', 'xi', 'pi', 'varpi',
  'rho', 'varrho', 'sigma', 'varsigma', 'tau',
  'upsilon', 'phi', 'varphi', 'chi', 'psi', 'omega',
  // Greek (upper)
  'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi',
  'Sigma', 'Upsilon', 'Phi', 'Psi', 'Omega',
  // Arrows
  'to', 'gets', 'mapsto',
  'leftarrow', 'rightarrow', 'leftrightarrow',
  'Leftarrow', 'Rightarrow', 'Leftrightarrow',
  'longleftarrow', 'longrightarrow', 'longleftrightarrow',
  'Longleftarrow', 'Longrightarrow', 'Longleftrightarrow',
  'nearrow', 'nwarrow', 'searrow', 'swarrow',
  'uparrow', 'downarrow', 'updownarrow',
  'Uparrow', 'Downarrow', 'Updownarrow',
  // Accents / decorators
  'overline', 'underline', 'widehat', 'widetilde', 'overbrace', 'underbrace',
  'overset', 'underset', 'stackrel',
  // Misc
  'pmod', 'bmod', 'mod', 'gcd', 'lcm', 'rank', 'trace', 'tr',
  'Re', 'Im', 'lfloor', 'rfloor', 'lceil', 'rceil',
  'langle', 'rangle', 'vert', 'Vert', 'mid',
  'not', 'prime', 'infty',
  // Matrix helpers
  'hline', 'cline',
];

/* ─── Regex: match a command word NOT already preceded by a backslash ─── */
const CMD_RE = new RegExp(
  `(?<!\\\\)\\b(${MATH_COMMANDS.join('|')})\\b`,
  'g'
);

/* ─── Matrix / display-env names ─── */
const MAT_ENVS =
  '(?:b?matrix|pmatrix|vmatrix|Vmatrix|Bmatrix|smallmatrix|array|cases|align(?:ed)?|gather(?:ed)?|equation\\*?)';

/**
 * Sanitize a single text string that came out of the LLM JSON.
 * Returns clean, standard LaTeX ready for KaTeX / MathJax.
 */
export function sanitizeAILatex(text: string): string {
  if (!text) return text;

  // ── 1. Restore JSON control-character corruption ──────────────────────────
  let s = text
    .replace(/\x0c/g, '\\f')   // form-feed  → \f  (from \frac, \for, etc.)
    .replace(/\x08/g, '\\b')   // backspace  → \b  (from \begin, \bar, etc.)
    .replace(/\x09/g, '\\t')   // h-tab      → \t  (from \text, \to, etc.)
    .replace(/\x0b/g, '\\v')   // v-tab      → \v  (from \vec, \vdots, etc.)
    .replace(/\x0d(?!\n)/g, '\\r'); // CR (not CRLF) → \r  (from \right, \rho, etc.)

  // ── 2. Normalize literal-bracket matrix wrappers ─────────────────────────
  // LLM often wraps matrices as:  [ \begin{bmatrix} ... end{bmatrix} ]
  // We convert these to proper $$ \begin{env} ... \end{env} $$
  const matWrapRe = new RegExp(
    `\\[\\s*(?:\\\\?begin\\{(${MAT_ENVS})[^}]*\\})([\\s\\S]*?)(?:\\\\?end\\{(${MAT_ENVS})[^}]*\\})\\s*\\]`,
    'g'
  );
  s = s.replace(matWrapRe, (_m, env1, body) => {
    const envName = env1 || 'bmatrix';
    return `$$\\begin{${envName}}${body}\\end{${envName}}$$`;
  });

  // ── 3. Restore missing backslashes inside math delimiters ─────────────────
  // We iterate over every math region ($…$, $$…$$, \[…\], \(…\))
  // and prepend a backslash to any bare command keyword.
  s = s.replace(
    /(\$\$[\s\S]*?\$\$|\$[^\$\n]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g,
    (mathBlock) => mathBlock.replace(CMD_RE, '\\$1')
  );

  return s;
}

/**
 * Recursively sanitize every string field in a parsed solution object.
 */
export function sanitizeSolutionObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return sanitizeAILatex(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeSolutionObject) as unknown as T;
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      result[k] = sanitizeSolutionObject(v);
    }
    return result as T;
  }
  return obj;
}
