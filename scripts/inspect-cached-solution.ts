import mongoose from 'mongoose';
import Question from '../models/question';

// Load .env.local if MONGODB_URI is not set
import fs from 'fs';
import path from 'path';
if (!process.env.MONGODB_URI) {
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
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/paperhub';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');
  
  const questions = await Question.find({ 'cachedSolution.steps': { $exists: true, $not: { $size: 0 } } }).lean();
  console.log('Found questions with cached solutions:', questions.length);
  
  if (questions.length > 0) {
    const q = questions[0];
    console.log('Question Text:', JSON.stringify(q.questionText));
    console.log('Cached Solution content:', JSON.stringify(q.cachedSolution?.content));
    if (q.cachedSolution && q.cachedSolution.steps) {
      q.cachedSolution.steps.forEach((step, idx) => {
        console.log(`--- Step ${idx+1} ---`);
        console.log('Heading:', step.heading);
        console.log('Raw Content (JSON.stringify):', JSON.stringify(step.content));
        // Check for control characters:
        for (let i = 0; i < step.content.length; i++) {
          const code = step.content.charCodeAt(i);
          if (code < 32) {
            console.log(`  found control char at index ${i}: code=${code} (${JSON.stringify(step.content[i])})`);
          }
        }
      });
    }
  } else {
    console.log('No cached solutions found.');
  }
  
  process.exit(0);
}

main().catch(console.error);
