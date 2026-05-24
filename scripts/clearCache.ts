import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

// Load .env.local manually
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const lines = fs.readFileSync(envLocalPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      const value = trimmed.substring(eqIdx + 1).trim();
      process.env[key] = value;
    }
  }
  console.log('Loaded .env.local');
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in .env.local');
  process.exit(1);
}

async function clearCachedSolutions() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI!, { autoSelectFamily: false });
    console.log('Connected!');

    // Clear cachedSolution from all questions that have it set
    const db = mongoose.connection.db!;
    const result = await db.collection('questions').updateMany(
      { cachedSolution: { $exists: true } },
      { $unset: { cachedSolution: '' } }
    );

    console.log(`✅ Cleared cached solutions from ${result.modifiedCount} questions.`);
    await mongoose.disconnect();
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

clearCachedSolutions();
