import mongoose from 'mongoose';
import University from '../models/university';
import Course from '../models/course';
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

  const universities = await University.find({}).lean();
  for (const univ of universities) {
    console.log(`\n=== UNIVERSITY: ${univ.name} (${univ.code}) ===`);
    const courses = await Course.find({ universityId: univ._id }).lean();
    for (const course of courses) {
      console.log(`\n  Course: ${course.name} (${course.code})`);
      const branches = await Branch.find({ courseId: course._id }).lean();
      
      if (branches.length === 0) {
        // Course without branches (e.g. MBA/MCA)
        const maxSem = course.maxSemesters || 4;
        for (let sem = 1; sem <= maxSem; sem++) {
          const subjects = await Subject.find({
            semester: sem
          }).lean();
          if (subjects.length > 0) {
            console.log(`    Semester ${sem}: ${subjects.length} subjects`);
            subjects.forEach((sub) => {
              console.log(`      - [${sub.code}] ${sub.name}`);
            });
          }
        }
      } else {
        for (const branch of branches) {
          console.log(`\n    Branch: ${branch.name} (${branch.code})`);
          const maxSem = course.maxSemesters || 8;
          for (let sem = 1; sem <= maxSem; sem++) {
            const subjects = await Subject.find({
              branchIds: branch._id,
              semester: sem
            }).lean();
            if (subjects.length > 0) {
              console.log(`      Semester ${sem}: ${subjects.length} subjects`);
              subjects.forEach((sub) => {
                console.log(`        - [${sub.code}] ${sub.name}`);
              });
            }
          }
        }
      }
    }
  }

  process.exit(0);
}

main().catch(console.error);
