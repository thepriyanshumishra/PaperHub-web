import mongoose from 'mongoose';
import Question from '../models/question';
import fs from 'fs';
import path from 'path';

// Load env vars
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
  console.log('Connected to MongoDB.');

  const questions = await Question.find({}).limit(10).lean();
  console.log(`Found ${questions.length} questions:`);
  questions.forEach((q) => {
    console.log(`ID: ${q._id}`);
    console.log(`Topic: ${q.topic}`);
    console.log(`Text: ${q.questionText}`);
    console.log(`Unit: ${q.unit}`);
    console.log(`Marks: ${q.marks}`);
    console.log(`Repetition: ${q.repetitionFrequency}`);
    console.log('-----------------------------------');
  });

  process.exit(0);
}

main().catch(console.error);
