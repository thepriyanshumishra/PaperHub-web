import mongoose from 'mongoose';
import Question from '../models/question';
import Subject from '../models/subject';
import { sanitizeSolutionObject } from '../lib/sanitizeLaTeX';
import fs from 'fs';
import path from 'path';

// Load env vars from .env.local unconditionally if file exists
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envFileContent = fs.readFileSync(envLocalPath, 'utf-8');
  envFileContent.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      process.env[match[1]] = (match[2] || '').trim().replace(/^["']|["']$/g, '');
    }
  });
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/paperhub';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.');
  
  // Ensure Subject model is registered (prevent tree-shaking)
  const _dummy = Subject;

  // Dynamically import groq after environment variables are loaded
  const { groq, isAiEnabled } = await import('../lib/groq');

  if (!isAiEnabled()) {
    console.error('Groq is not enabled. Make sure GROQ_API_KEY is in .env.local');
    process.exit(1);
  }

  const questionId = '6a16ccac156d17376c1c6fc8';
  const question = await Question.findById(questionId).populate('subjectId');
  if (!question) {
    console.error('Question not found');
    process.exit(1);
  }

  const subject = question.subjectId as any;
  const subjectName = subject?.name || 'the subject';
  const syllabus = subject?.syllabus || [];
  const topic = question.topic;

  const prompt = `You are a university mathematics and computer science professor teaching "${subjectName}". 
Generate a clear, step-by-step solution for the following university exam question:
"${question.questionText}"

The question is from Unit ${question.unit}, Topic: "${topic}".
Syllabus detail: ${JSON.stringify(syllabus)}

Instructions:
1. Provide the response as a JSON object containing:
   - "content": A brief introductory paragraph about the problem approach.
   - "steps": A list of steps. Each step must have:
     - "stepNumber": integer starting from 1
     - "heading": brief 2-5 word title of what the step does (e.g. "Differentiate Both Sides")
     - "content": detailed mathematical/algorithmic text explaining the derivation.
2. Formatting and Layout Guidelines for Content:
   - Make the presentation clean, highly structured, and readable for students.
   - NEVER pack long derivations, matrices, systems of equations, or determinants inside running inline text.
   - ALWAYS display significant calculations and derivations on their own lines as block equations enclosed in $$ ... $$.
   - Keep paragraphs short (maximum 2-3 sentences per paragraph). Use whitespace to let equations breathe.
   - Use bullet points or numbered lists to break down multi-part calculations (e.g., list of partial derivatives, parameters, or sub-steps) instead of writing them in a single paragraph.
   - Only use inline math (enclosed in $ ... $) for simple variables (like $x$, $y$) or small expressions (like $f(x)$).
3. The explanation must resemble a university exam model answer. Use clear, step-by-step reasoning. Do NOT use olympiad shortcuts or off-syllabus tricks. Focus on step-oriented grading points.
4. Keep all LaTeX equations mathematically sound.
5. LaTeX delimiters and JSON escaping rules:
   - Use $$ ... $$ for display/block equations. Do NOT use \\[ ... \\] or \\[ ... \\].
   - Use $ ... $ for inline math expressions. Do NOT use \\( ... \\) or \\( ... \\).
   - Because you are returning JSON, you MUST double-escape all backslashes in LaTeX commands. For example, write \\\\begin{bmatrix} instead of \\begin{bmatrix}, \\\\frac instead of \\frac, \\\\lambda instead of \\lambda, and \\\\rightarrow instead of \\rightarrow.
   - Row separators in matrices must be written as \\\\\\\\ (four backslashes in JSON) so that they parse to \\\\ (two backslashes) in standard LaTeX.
   - Do NOT wrap matrices inside literal brackets like [ \\\\begin{bmatrix} ... \\\\end{bmatrix} ]. Use $$ \\\\begin{bmatrix} ... \\\\end{bmatrix} $$ instead.
6. For any programming code (C, C++, etc.), you MUST format it inside standard Markdown fenced code blocks using triple backticks and the language (e.g. \`\`\`c ... \`\`\`) with normal newlines and indentation. Do NOT use inline code blocks (\`...\`), and do NOT use LaTeX spacing commands (like \\quad, \\qquad) or literal 'quad' inside code blocks.

Output must be ONLY valid JSON matching this schema:
{
  "content": "string",
  "steps": [
    { "stepNumber": number, "heading": "string", "content": "string" }
  ]
}`;

  console.log('Sending request to Groq...');
  const completion = await groq!.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  });

  const responseText = completion.choices[0]?.message?.content || '{}';
  console.log('\n--- RAW LLM RESPONSE ---');
  console.log(responseText);

  console.log('\n--- PARSING AND SANITIZING ---');
  const parsed = JSON.parse(responseText);
  const sanitized = sanitizeSolutionObject(parsed);

  console.log('\n--- SANITIZED CONTENT ---');
  console.log('Intro Content:', sanitized.content);
  sanitized.steps.forEach((step: any) => {
    console.log(`\nStep ${step.stepNumber}: ${step.heading}`);
    console.log(step.content);
  });

  // Check for matrix and delimiter correctness
  console.log('\n--- LATEX CORRECTNESS CHECKS ---');
  let hasBmatrix = false;
  let hasBackslashBmatrix = false;
  let hasDoubleBackslashInMatrix = false;
  let hasLiteralBracketMatrix = false;
  let hasDisplayMathDelimiters = false;
  let hasSlashBracketDelimiters = false;

  const allTexts = [sanitized.content, ...sanitized.steps.map((s: any) => s.content)].join('\n');

  if (allTexts.includes('bmatrix')) hasBmatrix = true;
  if (allTexts.includes('\\begin{bmatrix}')) {
    hasBackslashBmatrix = true;
    // Let's check for row separators in matrix regions
    const matMatch = allTexts.match(/\\begin\{bmatrix\}([\s\S]*?)\\end\{bmatrix\}/);
    if (matMatch) {
      const matBody = matMatch[1];
      if (matBody.includes('\\\\')) {
        hasDoubleBackslashInMatrix = true;
      }
    }
  }
  if (allTexts.match(/\[\s*\\begin\{bmatrix\}/)) hasLiteralBracketMatrix = true;
  if (allTexts.includes('$$')) hasDisplayMathDelimiters = true;
  if (allTexts.includes('\\[') || allTexts.includes('\\]')) hasSlashBracketDelimiters = true;

  console.log('- Found bmatrix environment:', hasBmatrix);
  console.log('- Has backslash before begin{bmatrix}:', hasBackslashBmatrix);
  console.log('- Row separators in bmatrix are double backslash (\\\\):', hasDoubleBackslashInMatrix);
  console.log('- Wrapped in literal brackets [ \\begin... ]:', hasLiteralBracketMatrix);
  console.log('- Contains $$ display math delimiters:', hasDisplayMathDelimiters);
  console.log('- Contains \\[ or \\] slash bracket delimiters:', hasSlashBracketDelimiters);

  process.exit(0);
}

main().catch(console.error);
