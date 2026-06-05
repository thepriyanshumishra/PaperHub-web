import mongoose from 'mongoose';
import College from '../models/college';
import Branch from '../models/branch';
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

  const colleges = await College.find({}).lean();
  for (const college of colleges) {
    console.log(`\n=== COLLEGE: ${college.name} (${college.code}) ===`);
    const branches = await Branch.find({ collegeId: college._id }).lean();
    for (const branch of branches) {
      console.log(`\n  Branch: ${branch.name} (${branch.code})`);
      // Check semesters 1 and 2
      for (const sem of [1, 2]) {
        const subjects = await Subject.find({
          branchIds: branch._id,
          semester: sem
        }).lean();
        console.log(`    Semester ${sem}: ${subjects.length} subjects`);
        subjects.forEach((sub) => {
          console.log(`      - [${sub.code}] ${sub.name}`);
        });
      }
    }
  }

  process.exit(0);
}

main().catch(console.error);
