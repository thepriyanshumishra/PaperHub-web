import mongoose from 'mongoose';
import Question from '../models/question';

// Load .env.local
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
  console.log("Connected to MongoDB!");
  
  // Find any question that has "First, find" or "frac{11}{8}" in the content
  const questions = await Question.find({
    $or: [
      { "cachedSolution.content": /First, find/ },
      { "cachedSolution.steps.content": /First, find/ },
      { "cachedSolution.content": /frac\{11\}\{8\}/ },
      { "cachedSolution.steps.content": /frac\{11\}\{8\}/ }
    ]
  }).lean();
  
  console.log(`Found ${questions.length} matching questions.`);
  
  for (const q of questions) {
    console.log("--- QUESTION ID:", q._id);
    console.log("Question Text:", q.questionText);
    console.log("Cached Solution Content:", q.cachedSolution?.content);
    if (q.cachedSolution?.steps) {
      for (const step of q.cachedSolution.steps) {
        console.log(`  Step: ${step.heading}`);
        console.log("  Step Content:", JSON.stringify(step.content));
      }
    }
  }
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
