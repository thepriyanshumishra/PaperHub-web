import katex from "katex";

const tests = [
  "\\text{max value}",
  "\\text{\\max value}",
  "\\text{min value}",
  "\\text{\\min value}",
  "\\text{begin step}",
  "\\text{\\begin step}",
  "\\text{left side}",
  "\\text{\\left side}",
  "\\text{right side}",
  "\\text{\\right side}"
];

for (const t of tests) {
  try {
    const result = katex.renderToString(t, { throwOnError: false });
    const hasError = result.includes("katex-error");
    console.log(`INPUT: ${JSON.stringify(t)} | HAS ERROR: ${hasError}`);
  } catch (e) {
    console.log(`INPUT: ${JSON.stringify(t)} | EXCEPTION:`, e);
  }
}
