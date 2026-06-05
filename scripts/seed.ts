import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import University from '../models/university';
import College from '../models/college';
import Course from '../models/course';
import Branch from '../models/branch';
import Subject from '../models/subject';
import Question from '../models/question';

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

interface ParsedUnit {
  unitNumber: number;
  unitTitle: string;
  topics: string[];
}

interface ParsedQuestion {
  questionId: string;
  unit: number;
  topic: string;
  questionText: string;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  sourcePapers: { year: number; examType: string }[];
  humanVerified: boolean;
}

interface ParsedPaper {
  metadata: Record<string, string>;
  syllabus: ParsedUnit[];
  questions: ParsedQuestion[];
}

interface SubjectConfig {
  name: string;
  semester: number;
  branchCodes: string[];
}

const SUBJECT_CONFIGS: Record<string, SubjectConfig> = {
  // Engineering Mathematics
  'BSM-110': { name: 'Engineering Mathematics-I', semester: 1, branchCodes: ['CSE', 'IT', 'ECE', 'ECE-IOT'] },
  'BSM-160': { name: 'Engineering Mathematics-II', semester: 2, branchCodes: ['CSE', 'IT', 'ECE', 'ECE-IOT'] },

  // Group A (CSE & IT) - Semester 1
  'BCS-110': { name: 'Introduction to C Programming', semester: 1, branchCodes: ['CSE'] },
  'BCS-111': { name: 'Web Designing-I', semester: 1, branchCodes: ['CSE'] },
  'BIT-103': { name: 'Programming in C', semester: 1, branchCodes: ['IT'] },
  'BIT-104': { name: 'Internet & Web Designing', semester: 1, branchCodes: ['IT'] },
  'BSM-131': { name: 'Engineering Physics', semester: 1, branchCodes: ['CSE', 'IT'] },
  'BHS-101': { name: 'Universal Human Values', semester: 1, branchCodes: ['CSE', 'IT'] },

  // Group A (CSE & IT) - Semester 2
  'BEE-160': { name: 'Basic Electrical Engineering', semester: 2, branchCodes: ['CSE', 'IT'] },
  'BSM-190': { name: 'Environmental Science and Green Chemistry', semester: 2, branchCodes: ['CSE', 'IT'] },
  'BCS-161': { name: 'Web Designing-II', semester: 2, branchCodes: ['CSE'] },
  'BIT-154': { name: 'Object Oriented Programming with C++', semester: 2, branchCodes: ['IT'] },

  // Group B (ECE & ECE-IoT) - Semester 1
  'BEE-110': { name: 'Basic Electrical Engineering', semester: 1, branchCodes: ['ECE', 'ECE-IOT'] },
  'BEC-106': { name: 'Electronic Component Testing and Measurement', semester: 1, branchCodes: ['ECE', 'ECE-IOT'] },
  'BSM-140': { name: 'Environmental Science and Green Chemistry', semester: 1, branchCodes: ['ECE', 'ECE-IOT'] },

  // Group B (ECE & ECE-IoT) - Semester 2
  'BEC-157': { name: 'Electronic Workshop', semester: 2, branchCodes: ['ECE', 'ECE-IOT'] },
  'BSM-181': { name: 'Engineering Physics', semester: 2, branchCodes: ['ECE', 'ECE-IOT'] },
  'BCS-160': { name: 'Introduction to C Programming', semester: 2, branchCodes: ['ECE', 'ECE-IOT'] },
  'BHS-151': { name: 'Universal Human Values: Understanding Harmony', semester: 2, branchCodes: ['ECE', 'ECE-IOT'] },
};

function getSubjectConfig(code: string, currentFile: string, parsedSem: number) {
  const upperCode = code.toUpperCase().trim();
  
  if (upperCode === 'BHS-152') {
    const isSem1File = currentFile.toUpperCase().includes('ECE_SEM1') || 
                       currentFile.toUpperCase().includes('IOT_SEM1') || 
                       parsedSem === 1;
    if (isSem1File) {
      return {
        name: 'Technical Writing & Professional Communication',
        semester: 1,
        branchCodes: ['ECE', 'ECE-IOT']
      };
    } else {
      return {
        name: 'Technical Writing & Professional Communication',
        semester: 2,
        branchCodes: ['CSE', 'IT']
      };
    }
  }
  
  return SUBJECT_CONFIGS[upperCode] || null;
}

function cleanCitations(str: string): string {
  if (!str) return str;
  return str.replace(/\[cite:\s*[^\]]+\]/gi, '').replace(/\s+/g, ' ').trim();
}

function cleanQuestionText(str: string): string {
  if (!str) return str;
  return str.replace(/\[cite:\s*[^\]]+\]/gi, '').trim();
}

function parseMarkdownFile(fileContent: string): ParsedPaper[] {
  const sections = fileContent.split(/(?:^|\n)(?:---\s*)?# Paper Metadata\s*\n/);
  const parsedPapers: ParsedPaper[] = [];

  for (const section of sections) {
    if (!section.trim()) continue;

    const questionStartIndex = section.search(/(?:^|\n)# Question\s+/i);
    let paperPart = section;
    let questionsPart = '';

    if (questionStartIndex !== -1) {
      paperPart = section.substring(0, questionStartIndex);
      questionsPart = section.substring(questionStartIndex);
    }

    const metadata: Record<string, string> = {};
    const paperLines = paperPart.split('\n');
    for (const line of paperLines) {
      const match = line.match(/^\s*-\s*([^:]+)\s*:\s*(.*)\s*$/);
      if (match) {
        const key = match[1].trim();
        const val = cleanCitations(match[2]);
        metadata[key] = val;
      }
    }

    const syllabus: ParsedUnit[] = [];
    let currentUnit: ParsedUnit | null = null;
    let inTopics = false;

    for (const line of paperLines) {
      const unitMatch = line.match(/^##\s+Unit\s+(\d+)\s*[—:-]\s*(.*)$/i);
      if (unitMatch) {
        const unitNumber = parseInt(unitMatch[1], 10);
        const unitTitle = cleanCitations(unitMatch[2]);
        currentUnit = { unitNumber, unitTitle, topics: [] };
        syllabus.push(currentUnit);
        inTopics = false;
        continue;
      }

      if (line.match(/^###\s+Topics/i)) {
        inTopics = true;
        continue;
      }

      if (inTopics && currentUnit) {
        const topicMatch = line.match(/^\s*-\s*(.*)$/);
        if (topicMatch) {
          const topicName = cleanCitations(topicMatch[1]);
          if (topicName && !currentUnit.topics.includes(topicName)) {
            currentUnit.topics.push(topicName);
          }
        }
      }

      if (line.startsWith('##') || line.startsWith('# ')) {
        inTopics = false;
      }
    }

    const questionBlocks = questionsPart.split(/(?=\n# Question\s+)/i).filter(Boolean);
    const questions: ParsedQuestion[] = [];

    for (const block of questionBlocks) {
      const qLines = block.split('\n');
      const qMetadata: Record<string, string> = {};
      let qText = '';
      let inMetadata = false;
      let inQuestionText = false;

      for (const line of qLines) {
        if (line.match(/^##\s+Metadata/i)) {
          inMetadata = true;
          inQuestionText = false;
          continue;
        }
        if (line.match(/^##\s+Question/i)) {
          inMetadata = false;
          inQuestionText = true;
          continue;
        }
        if (line.startsWith('# Question')) {
          continue;
        }

        if (inMetadata) {
          const match = line.match(/^\s*-\s*([^:]+)\s*:\s*(.*)\s*$/);
          if (match) {
            const key = match[1].trim();
            const val = cleanCitations(match[2]);
            qMetadata[key] = val;
          }
        } else if (inQuestionText) {
          if (line.trim() === '---') {
            continue;
          }
          qText += line + '\n';
        }
      }

      const qId = qMetadata['Question ID'];
      const unit = parseInt(qMetadata['Unit'], 10);
      const topic = qMetadata['Topic'];
      const difficultyRaw = qMetadata['Difficulty'] || 'medium';
      const marks = parseInt(qMetadata['Marks'] || '0', 10);
      const humanVerified = (qMetadata['Human Verified'] || 'false').toLowerCase() === 'true';
      const academicSession = qMetadata['Academic Session'] || '2025-2026';
      const examType = qMetadata['Exam Type'] || 'Major';

      if (qId && qText.trim()) {
        const year = parseInt(academicSession.split('-')[0], 10) || 2025;
        const difficulty = difficultyRaw.toLowerCase() as 'easy' | 'medium' | 'hard';
        const cleanedQText = cleanQuestionText(qText);

        questions.push({
          questionId: qId,
          unit: isNaN(unit) ? 1 : unit,
          topic: topic || 'General',
          questionText: cleanedQText,
          difficulty: ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium',
          marks: isNaN(marks) ? 0 : marks,
          sourcePapers: [{ year, examType }],
          humanVerified,
        });
      }
    }

    if (Object.keys(metadata).length > 0) {
      parsedPapers.push({
        metadata,
        syllabus,
        questions,
      });
    }
  }

  return parsedPapers;
}

async function seed() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI!, { autoSelectFamily: false });
    console.log('Clearing existing collections and indexes...');
    try { await University.collection.dropIndexes(); } catch (e) {}
    await University.deleteMany({});
    
    try { await College.collection.dropIndexes(); } catch (e) {}
    await College.deleteMany({});
    
    try { await Course.collection.dropIndexes(); } catch (e) {}
    await Course.deleteMany({});
    
    try { await Branch.collection.dropIndexes(); } catch (e) {}
    await Branch.deleteMany({});
    
    try { await Subject.collection.dropIndexes(); } catch (e) {}
    await Subject.deleteMany({});
    
    try { await Question.collection.dropIndexes(); } catch (e) {}
    await Question.deleteMany({});
    console.log('Collections cleared.');

    // 1. Seed Universities
    console.log('Seeding universities...');
    const mmmutUniv = await University.create({
      name: "Madan Mohan Malaviya University of Technology",
      code: "MMMUT",
      isActive: true,
    });
    const aktuUniv = await University.create({
      name: "Dr. A.P.J. Abdul Kalam Technical University",
      code: "AKTU",
      isActive: true,
    });
    const hbtuUniv = await University.create({
      name: "Harcourt Butler Technical University",
      code: "HBTU",
      isActive: true,
    });

    // 2. Seed Colleges linked to parent Universities
    console.log('Seeding colleges...');
    const mmmutCol = await College.create({
      universityId: mmmutUniv._id,
      name: "Madan Mohan Malaviya University of Technology",
      code: "MMMUT",
      isActive: true,
    });
    const aktuCol = await College.create({
      universityId: aktuUniv._id,
      name: "Dr. A.P.J. Abdul Kalam Technical University",
      code: "AKTU",
      isActive: false,
    });
    const hbtuCol = await College.create({
      universityId: hbtuUniv._id,
      name: "Harcourt Butler Technical University",
      code: "HBTU",
      isActive: false,
    });

    // 3. Seed Courses linked to Universities
    console.log('Seeding courses...');
    const mmmutBtech = await Course.create({
      universityId: mmmutUniv._id,
      name: "Bachelor of Technology",
      code: "B.TECH",
      durationYears: 4,
      maxSemesters: 8,
      isBranchRequired: true,
      isActive: true,
    });
    const aktuBtech = await Course.create({
      universityId: aktuUniv._id,
      name: "Bachelor of Technology",
      code: "B.TECH",
      durationYears: 4,
      maxSemesters: 8,
      isBranchRequired: true,
      isActive: false,
    });
    const hbtuBtech = await Course.create({
      universityId: hbtuUniv._id,
      name: "Bachelor of Technology",
      code: "B.TECH",
      durationYears: 4,
      maxSemesters: 8,
      isBranchRequired: true,
      isActive: false,
    });

    // 4. Seed Branches under the Courses
    console.log('Seeding branches...');
    const cse = await Branch.create({
      courseId: mmmutBtech._id,
      name: "Computer Science & Engineering",
      code: "CSE",
      isActive: true,
    });
    const it = await Branch.create({
      courseId: mmmutBtech._id,
      name: "Information Technology",
      code: "IT",
      isActive: true,
    });
    const ece = await Branch.create({
      courseId: mmmutBtech._id,
      name: "Electronics & Communication Engineering",
      code: "ECE",
      isActive: true,
    });
    const eceIot = await Branch.create({
      courseId: mmmutBtech._id,
      name: "Electronics & Communication Engineering (IoT)",
      code: "ECE-IOT",
      isActive: true,
    });

    // Inactive branches under MMMUT B.Tech
    const inactiveBranchCodes = ['EE', 'ME', 'CE'];
    const inactiveBranchNames: Record<string, string> = {
      EE: "Electrical Engineering",
      ME: "Mechanical Engineering",
      CE: "Civil Engineering",
    };

    for (const bCode of inactiveBranchCodes) {
      await Branch.create({
        courseId: mmmutBtech._id,
        name: inactiveBranchNames[bCode],
        code: bCode,
        isActive: false,
      });
    }

    // Inactive branches under AKTU and HBTU B.Tech
    const otherBtechs = [aktuBtech, hbtuBtech];
    const otherBranchCodes = ['CSE', 'IT', 'ECE', 'ECE-IOT', 'EE', 'ME', 'CE'];
    const otherBranchNames: Record<string, string> = {
      CSE: "Computer Science & Engineering",
      IT: "Information Technology",
      ECE: "Electronics & Communication Engineering",
      "ECE-IOT": "Electronics & Communication Engineering (IoT)",
      EE: "Electrical Engineering",
      ME: "Mechanical Engineering",
      CE: "Civil Engineering",
    };

    for (const bt of otherBtechs) {
      for (const bCode of otherBranchCodes) {
        await Branch.create({
          courseId: bt._id,
          name: otherBranchNames[bCode],
          code: bCode,
          isActive: false,
        });
      }
    }

    const subjectMap = new Map<string, mongoose.Types.ObjectId>();

    // 5. Scan & Ingest Raw Markdown Files
    const rawQuestionsDir = path.join(process.cwd(), 'Raw Questions');
    if (!fs.existsSync(rawQuestionsDir)) {
      console.error(`Error: Ingestion folder "${rawQuestionsDir}" not found.`);
      process.exit(1);
    }

    const files = fs.readdirSync(rawQuestionsDir).filter((file) => file.endsWith('.md'));
    console.log(`Found ${files.length} markdown ingestion source files.`);

    for (const file of files) {
      const filePath = path.join(rawQuestionsDir, file);
      console.log(`Ingesting file: ${file}...`);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const parsedPapers = parseMarkdownFile(fileContent);

      for (const paper of parsedPapers) {
        const subjectCode = paper.metadata['Subject Code'];
        const subjectName = paper.metadata['Subject'];
        const semesterStr = paper.metadata['Semester'];
        
        if (!subjectCode || !subjectName) {
          console.warn('Skipping paper section due to missing Subject or Subject Code metadata.');
          continue;
        }

        let semester = 1;
        if (semesterStr) {
          if (semesterStr.toLowerCase().includes('odd') || semesterStr.trim() === '1') {
            semester = 1;
          } else {
            const parsedSem = parseInt(semesterStr, 10);
            if (!isNaN(parsedSem)) {
              semester = parsedSem;
            }
          }
        }

        let subjectCodeClean = subjectCode.toUpperCase().trim();
        if (subjectCodeClean.includes('BME-101') || 
            subjectCodeClean.includes('BME-104') || 
            subjectCodeClean.includes('BME-157')) {
          console.log(`Skipping subject ${subjectCodeClean} to maintain exactly 5 subjects & 4 units per semester.`);
          continue;
        }
        const subjectConf = getSubjectConfig(subjectCodeClean, file, semester);
        
        let targetSemester = semester;
        let branchIds: mongoose.Types.ObjectId[] = [];
        let finalSubjectName = subjectName;

        if (subjectConf) {
          targetSemester = subjectConf.semester;
          finalSubjectName = subjectConf.name;
          
          for (const bCode of subjectConf.branchCodes) {
            if (bCode === 'CSE') branchIds.push(cse._id as mongoose.Types.ObjectId);
            if (bCode === 'IT') branchIds.push(it._id as mongoose.Types.ObjectId);
            if (bCode === 'ECE') branchIds.push(ece._id as mongoose.Types.ObjectId);
            if (bCode === 'ECE-IOT') branchIds.push(eceIot._id as mongoose.Types.ObjectId);
          }
        } else {
          const paperBranch = paper.metadata['Branch'] ? paper.metadata['Branch'].trim().toUpperCase() : 'CSE';
          const branchTokens = paperBranch.split(/[&,\/]/).map((s) => s.trim());
          for (const token of branchTokens) {
            if (token === 'CSE') {
              branchIds.push(cse._id as mongoose.Types.ObjectId);
            } else if (token === 'IT') {
              branchIds.push(it._id as mongoose.Types.ObjectId);
            } else if (token === 'ECE') {
              branchIds.push(ece._id as mongoose.Types.ObjectId);
              branchIds.push(eceIot._id as mongoose.Types.ObjectId);
            } else if (token === 'ECE-IOT' || token === 'ECE-IOT' || token === 'IOT') {
              branchIds.push(eceIot._id as mongoose.Types.ObjectId);
              branchIds.push(ece._id as mongoose.Types.ObjectId);
            } else if (token === 'COMMON') {
              branchIds.push(cse._id as mongoose.Types.ObjectId);
              branchIds.push(it._id as mongoose.Types.ObjectId);
              branchIds.push(ece._id as mongoose.Types.ObjectId);
              branchIds.push(eceIot._id as mongoose.Types.ObjectId);
            }
          }
          if (branchIds.length === 0) {
            const upperFileName = file.toUpperCase();
            if (upperFileName.includes('ECE') || upperFileName.includes('IOT')) {
              branchIds.push(ece._id as mongoose.Types.ObjectId);
              branchIds.push(eceIot._id as mongoose.Types.ObjectId);
            } else if (upperFileName.includes('IT')) {
              branchIds.push(it._id as mongoose.Types.ObjectId);
            } else {
              branchIds.push(cse._id as mongoose.Types.ObjectId);
            }
          }
        }

        let subject = await Subject.findOne({ code: subjectCodeClean, semester: targetSemester });
        if (subject) {
          for (const newUnit of paper.syllabus) {
            const existingUnit = subject.syllabus.find((u) => u.unitNumber === newUnit.unitNumber);
            if (existingUnit) {
              newUnit.topics.forEach((t) => {
                if (!existingUnit.topics.includes(t)) {
                  existingUnit.topics.push(t);
                }
              });
            } else {
              subject.syllabus.push(newUnit as any);
            }
          }
          branchIds.forEach((bId) => {
            if (!subject!.branchIds.some((existingId) => existingId.equals(bId))) {
              subject!.branchIds.push(bId);
            }
          });
          subject.syllabus.sort((a, b) => a.unitNumber - b.unitNumber);
          await subject.save();
        } else {
          subject = await Subject.create({
            branchIds,
            semester: targetSemester,
            name: finalSubjectName,
            code: subjectCodeClean,
            syllabus: paper.syllabus,
          });
        }

        subjectMap.set(subjectCode.toUpperCase(), subject._id as mongoose.Types.ObjectId);

        for (const q of paper.questions) {
          let existingQ = await Question.findOne({ questionId: q.questionId });
          if (existingQ) {
            q.sourcePapers.forEach((sp) => {
              const alreadyHasPaper = existingQ!.sourcePapers.some(
                (p) => p.year === sp.year && p.examType === sp.examType
              );
              if (!alreadyHasPaper) {
                existingQ!.sourcePapers.push(sp);
                existingQ!.repetitionFrequency += 1;
              }
            });
            await existingQ.save();
          } else {
            await Question.create({
              questionId: q.questionId,
              subjectId: subject._id,
              unit: q.unit,
              topic: q.topic,
              questionText: q.questionText,
              difficulty: q.difficulty,
              repetitionFrequency: 1,
              marks: q.marks,
              sourcePapers: q.sourcePapers,
              humanVerified: q.humanVerified,
              verificationStatus: 'verified',
            });
          }
        }
      }
    }

    console.log('Post-processing: Checking Technical Writing (BHS-152) for ECE & ECE-IOT Sem 1...');
    const technicalWritingSem2 = await Subject.findOne({ code: 'BHS-152', semester: 2 });
    if (technicalWritingSem2) {
      let technicalWritingSem1 = await Subject.findOne({ code: 'BHS-152', semester: 1 });
      if (!technicalWritingSem1) {
        console.log('Creating Technical Writing (BHS-152) for ECE & ECE-IOT Semester 1...');
        const branchIdsSem1: mongoose.Types.ObjectId[] = [];
        branchIdsSem1.push(ece._id as mongoose.Types.ObjectId);
        branchIdsSem1.push(eceIot._id as mongoose.Types.ObjectId);
        
        technicalWritingSem1 = await Subject.create({
          branchIds: branchIdsSem1,
          semester: 1,
          name: technicalWritingSem2.name,
          code: 'BHS-152',
          syllabus: technicalWritingSem2.syllabus,
        });
      }
      
      const questionsToClone = await Question.find({ subjectId: technicalWritingSem2._id });
      console.log(`Cloning ${questionsToClone.length} Technical Writing questions for ECE & ECE-IOT Sem 1...`);
      
      for (const q of questionsToClone) {
        const clonedQuestionId = `${q.questionId}-ECE`;
        const existingClone = await Question.findOne({ questionId: clonedQuestionId });
        if (!existingClone) {
          await Question.create({
            questionId: clonedQuestionId,
            subjectId: technicalWritingSem1._id,
            unit: q.unit,
            topic: q.topic,
            questionText: q.questionText,
            difficulty: q.difficulty,
            repetitionFrequency: q.repetitionFrequency,
            marks: q.marks,
            sourcePapers: q.sourcePapers,
            humanVerified: q.humanVerified,
            cachedSolution: q.cachedSolution,
            verificationStatus: 'verified',
          });
        }
      }
      console.log('Post-processing Technical Writing cloning completed!');
    }

    console.log('Ingestion and Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
