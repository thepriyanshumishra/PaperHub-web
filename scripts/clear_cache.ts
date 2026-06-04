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

if (!MONGODB_URI) {
  console.error('Error: Please define the MONGODB_URI environment variable inside .env.local');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGODB_URI!);
  console.log("Connected to MongoDB!");
  
  // Unset cachedSolution field for all questions to clear the old corrupted cache
  const result = await Question.updateMany({}, { $unset: { cachedSolution: "" } });
  console.log(`Successfully cleared cachedSolution for ${result.modifiedCount} questions!`);
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
