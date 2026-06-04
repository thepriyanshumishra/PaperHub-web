import mongoose from 'mongoose';
import Question from '../models/question';

// Programmatically load .env.local if MONGODB_URI is not set
import fs from 'fs';
import path from 'path';
if (!process.env.MONGODB_URI) {
  const envLocalPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envLocalPath)) {
    const envFileContent = fs.readFileSync(envLocalPath, 'utf-8');
    envFileContent.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        process.env[key] = value.trim();
      }
    });
  }
}

const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  await mongoose.connect(MONGODB_URI!);
  console.log("Connected to MongoDB!");
  
  const questions = await Question.find({ 
    $or: [
      { questionText: /sin/i },
      { questionText: /log/i },
      { questionText: /x\^2/i },
      { questionText: /d\^2y/i }
    ]
  });
  
  console.log(`Found ${questions.length} matching questions.`);
  for (const q of questions) {
    if (q.questionText.includes('x^2') || q.questionText.includes('log') || q.questionText.includes('sin')) {
      console.log("- ID:", q._id);
      console.log("  Text:", JSON.stringify(q.questionText));
    }
  }
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
