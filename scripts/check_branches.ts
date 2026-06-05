import mongoose from 'mongoose';
import University from '../models/university';
import Course from '../models/course';
import Branch from '../models/branch';
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

  const universities = await University.find({}).lean();
  console.log('UNIVERSITIES IN DB:', universities);

  for (const univ of universities) {
    const courses = await Course.find({ universityId: univ._id }).lean();
    console.log(`COURSES FOR ${univ.code} (${univ._id}):`, courses);
    for (const course of courses) {
      const branches = await Branch.find({ courseId: course._id }).lean();
      console.log(`BRANCHES FOR ${course.code} (${course._id}):`, branches);
    }
  }

  process.exit(0);
}

main().catch(console.error);
