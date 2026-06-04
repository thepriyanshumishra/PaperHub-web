const fs = require('fs');
const path = require('path');

// Load environment variables manually BEFORE importing database connector
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line: string) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const parts = trimmed.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join('=').trim();
          process.env[key] = value;
        }
      }
    });
  }
} catch (e) {
  console.error('Failed to load env variables:', e);
}

const dbConnect = require('../lib/db').default;
const Question = require('../models/question').default;

async function clearCache() {
  console.log('Connecting to database...');
  await dbConnect();
  console.log('Connected.');

  console.log('Wiping cachedSolution from all questions in MongoDB to force fresh, beautiful generation...');
  const result = await Question.updateMany({}, { $unset: { cachedSolution: "" } });
  console.log(`Success! Updated ${result.modifiedCount} questions. All solution caches cleared.`);
  process.exit(0);
}

clearCache().catch((err) => {
  console.error('Failed to clear cache:', err);
  process.exit(1);
});
