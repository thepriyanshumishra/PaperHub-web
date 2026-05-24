import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import College from '../models/college';
import Branch from '../models/branch';
import Subject from '../models/subject';
import Question from '../models/question';
import { seedColleges, seedQuestions } from '../lib/seedData';

// Programmatically load .env.local if MONGODB_URI is not set
if (!process.env.MONGODB_URI) {
  const envLocalPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envLocalPath)) {
    const envFileContent = fs.readFileSync(envLocalPath, 'utf-8');
    envFileContent.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        // Remove quotes if present
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

async function seed() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI!);
    console.log('Connected successfully.');

    // Clear existing collection data
    console.log('Clearing existing collections...');
    await College.deleteMany({});
    await Branch.deleteMany({});
    await Subject.deleteMany({});
    await Question.deleteMany({});
    console.log('Collections cleared.');

    // Map subject codes to inserted Subject documents for question reference
    const subjectMap = new Map<string, mongoose.Types.ObjectId>();

    // Seed Colleges, Branches, and Subjects
    for (const collegeData of seedColleges) {
      console.log(`Inserting college: ${collegeData.name} (${collegeData.code})...`);
      const college = await College.create({
        name: collegeData.name,
        code: collegeData.code,
        isActive: collegeData.isActive,
      });

      for (const branchData of collegeData.branches) {
        if (!branchData.code) continue; // Safety check
        console.log(`  Inserting branch: ${branchData.name} (${branchData.code})...`);
        const branch = await Branch.create({
          collegeId: college._id,
          name: branchData.name,
          code: branchData.code,
          isActive: branchData.isActive,
        });

        for (const subjectData of branchData.subjects) {
          console.log(`    Inserting subject: ${subjectData.name} (${subjectData.code})...`);
          
          // Check if subject already exists (since BAS-01 belongs to both CSE and IT)
          let subject = await Subject.findOne({ code: subjectData.code });
          
          if (subject) {
            // Subject exists, append branch ID if not already present
            if (!subject.branchIds.includes(branch._id as any)) {
              subject.branchIds.push(branch._id as any);
              await subject.save();
            }
          } else {
            // Create new subject
            subject = await Subject.create({
              branchIds: [branch._id],
              semester: subjectData.semester,
              name: subjectData.name,
              code: subjectData.code,
              syllabus: subjectData.syllabus,
            });
          }

          subjectMap.set(subjectData.code, subject._id as mongoose.Types.ObjectId);
        }
      }
    }

    // Seed Questions
    for (const questionData of seedQuestions) {
      const subjectId = subjectMap.get(questionData.subjectCode);
      if (!subjectId) {
        console.warn(`Warning: Subject code ${questionData.subjectCode} not found in seeded database. Skipping question.`);
        continue;
      }

      console.log(`Inserting question for subject ${questionData.subjectCode}, unit ${questionData.unit}, topic "${questionData.topic}"...`);
      await Question.create({
        subjectId,
        unit: questionData.unit,
        topic: questionData.topic,
        questionText: questionData.questionText,
        difficulty: questionData.difficulty,
        repetitionFrequency: questionData.repetitionFrequency,
        sourcePapers: questionData.sourcePapers,
        cachedSolution: questionData.cachedSolution,
      });
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
