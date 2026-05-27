import mongoose from 'mongoose';
import Subject from '../models/subject';
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

  const subjects = await Subject.find({}).lean();
  console.log(`Found ${subjects.length} subjects:`);
  subjects.forEach((s) => {
    console.log(`ID: ${s._id}`);
    console.log(`Name: ${s.name}`);
    console.log(`Code: ${s.code}`);
    console.log(`Syllabus Units: ${s.syllabus?.length || 0}`);
    console.log('-----------------------------------');
  });

  process.exit(0);
}

main().catch(console.error);
