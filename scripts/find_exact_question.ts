import mongoose from 'mongoose';
import Question from '../models/question';
import Session from '../models/session';

import fs from 'fs';
import path from 'path';
if (!process.env.MONGODB_URI) {
  const envLocalPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envLocalPath)) {
    const envFileContent = fs.readFileSync(envLocalPath, 'utf-8');
    envFileContent.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = (match[2] || '').trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        process.env[match[1]] = val;
      }
    });
  }
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/paperhub';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB.');
  
  const session = await Session.findById('6a1e11c87186a0d36a81ea60').lean();
  if (!session) {
    console.log('Session not found!');
    process.exit(1);
  }
  
  const questionIds = session.questions || [];
  console.log(`Session has ${questionIds.length} questions.`);
  
  for (const qId of questionIds) {
    const q = await Question.findById(qId).lean();
    if (!q) continue;
    
    // Check if the question text or any cached solution (in any field) contains "rules" or "character" or "identifier"
    const qStr = JSON.stringify(q);
    if (qStr.toLowerCase().includes('first character') || qStr.toLowerCase().includes('subsequent')) {
      console.log('====================================================');
      console.log('MATCHING QUESTION IN SESSION:', q._id);
      console.log('Question Text:', q.questionText);
      console.log('Cached Solution:', JSON.stringify(q.cachedSolution?.content));
      if (q.cachedSolution && q.cachedSolution.steps) {
        q.cachedSolution.steps.forEach((step, sIdx) => {
          console.log(`  Step ${sIdx+1} Heading: ${step.heading}`);
          console.log(`  Step ${sIdx+1} Content: ${JSON.stringify(step.content)}`);
        });
      }
    }
  }
  
  process.exit(0);
}

main().catch(console.error);
