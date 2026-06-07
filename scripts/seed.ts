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

// Allowed subjects per branch and semester
const BRANCH_SUBJECTS: Record<string, Record<number, string[]>> = {
  CSE: {
    1: ['BSM-110', 'BSM-131', 'BCS-110', 'BHS-101', 'BCS-111'],
    2: ['BSM-160', 'BEE-160', 'BSM-190', 'BCS-161', 'BHS-152']
  },
  IT: {
    1: ['BSM-110', 'BSM-131', 'BIT-103', 'BHS-101', 'BIT-104'],
    2: ['BSM-160', 'BEE-160', 'BSM-190', 'BIT-154', 'BHS-152']
  },
  ECE: {
    1: ['BSM-110', 'BEE-110', 'BEC-106', 'BSM-140', 'BHS-152'],
    2: ['BSM-160', 'BEC-157', 'BSM-181', 'BCS-160', 'BHS-151']
  },
  'ECE-IOT': {
    1: ['BSM-110', 'BEE-110', 'BEC-106', 'BSM-140', 'BHS-152'],
    2: ['BSM-160', 'BEC-157', 'BSM-181', 'BCS-160', 'BHS-151']
  },
  CH: {
    1: ['BSM-110', 'BSM-131', 'BHS-101', 'BIT-103', 'BME-104'],
    2: ['BSM-160', 'BEE-160', 'BHS-152', 'BME-157', 'BSM-190']
  }
};

// Clean Subject Names mapping
const SUBJECT_NAMES: Record<string, string> = {
  'BSM-110': 'Engineering Mathematics-I',
  'BSM-160': 'Engineering Mathematics-II',
  'BCS-110': 'Introduction to C Programming',
  'BCS-111': 'Web Designing-I',
  'BIT-103': 'Programming in C',
  'BIT-104': 'Internet & Web Designing',
  'BSM-131': 'Engineering Physics',
  'BHS-101': 'Universal Human Values',
  'BEE-160': 'Basic Electrical Engineering',
  'BSM-190': 'Environmental Science and Green Chemistry',
  'BCS-161': 'Web Designing-II',
  'BIT-154': 'Object Oriented Programming with C++',
  'BEE-110': 'Basic Electrical Engineering',
  'BEC-106': 'Electronic Component Testing and Measurement',
  'BSM-140': 'Environmental Science and Green Chemistry',
  'BEC-157': 'Electronic Workshop',
  'BSM-181': 'Engineering Physics',
  'BCS-160': 'Introduction to C Programming',
  'BHS-151': 'Universal Human Values: Understanding Harmony',
  'BHS-152': 'Technical Writing & Professional Communication',
  'BME-104': 'Manufacturing Practice Workshop',
  'BME-157': 'Engineering Graphics with AutoCAD'
};

function normalizeSubjectCode(code: string): string {
  const c = code.toUpperCase().trim();
  if (c.includes('BME-101') || c.includes('BME-104')) return 'BME-104';
  if (c.includes('BHS-152')) return 'BHS-152';
  return c;
}

function normalizeExamType(examType: string): string {
  const et = examType.trim().toLowerCase();
  if (et.includes('major')) return 'Major';
  if (et.includes('minor')) return 'Minor';
  return examType;
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
    await College.create({
      universityId: mmmutUniv._id,
      name: "Madan Mohan Malaviya University of Technology",
      code: "MMMUT",
      isActive: true,
    });
    await College.create({
      universityId: aktuUniv._id,
      name: "Dr. A.P.J. Abdul Kalam Technical University",
      code: "AKTU",
      isActive: false,
    });
    await College.create({
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
    const ch = await Branch.create({
      courseId: mmmutBtech._id,
      name: "Chemical Engineering",
      code: "CH",
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

    // Initialize the subjects upfront
    const subjectsMap = new Map<string, mongoose.Types.ObjectId>(); // Key: "BRANCH-CODE-SEM", Value: Subject ObjectId
    const activeBranches = [
      { doc: cse, code: 'CSE' },
      { doc: it, code: 'IT' },
      { doc: ece, code: 'ECE' },
      { doc: eceIot, code: 'ECE-IOT' },
      { doc: ch, code: 'CH' }
    ];

    console.log('Seeding branch-specific subjects...');
    for (const b of activeBranches) {
      for (const sem of [1, 2]) {
        const codes = BRANCH_SUBJECTS[b.code][sem];
        for (const code of codes) {
          const name = SUBJECT_NAMES[code];
          
          const subject = await Subject.create({
            branchIds: [b.doc._id],
            semester: sem,
            name: name,
            code: code,
            syllabus: []
          });
          
          subjectsMap.set(`${b.code}-${code}-${sem}`, subject._id as mongoose.Types.ObjectId);
        }
      }
    }

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
      
      // Determine file's target branch code
      let fileBranchCode = 'CSE';
      const upperFile = file.toUpperCase();
      if (upperFile.includes('CSE')) fileBranchCode = 'CSE';
      else if (upperFile.includes('IT')) fileBranchCode = 'IT';
      else if (upperFile.includes('ECE')) fileBranchCode = 'ECE';
      else if (upperFile.includes('IOT')) fileBranchCode = 'ECE-IOT';
      else if (upperFile.includes('CHE')) fileBranchCode = 'CH';

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const parsedPapers = parseMarkdownFile(fileContent);

      for (const paper of parsedPapers) {
        const subjectCode = paper.metadata['Subject Code'];
        const semesterStr = paper.metadata['Semester'];
        
        if (!subjectCode) {
          console.warn('Skipping paper section due to missing Subject Code metadata.');
          continue;
        }

        let semester = 1;
        if (semesterStr) {
          if (semesterStr.toLowerCase().includes('odd') || semesterStr.trim() === '1' || semesterStr.trim().toLowerCase().startsWith('i')) {
            semester = 1;
          } else {
            const parsedSem = parseInt(semesterStr, 10);
            if (!isNaN(parsedSem)) {
              semester = parsedSem;
            } else if (semesterStr.toLowerCase().includes('sem_2') || semesterStr.trim() === '2') {
              semester = 2;
            }
          }
        }

        const subjectCodeClean = normalizeSubjectCode(subjectCode);
        const allowedCodes = BRANCH_SUBJECTS[fileBranchCode][semester];
        
        if (!allowedCodes || !allowedCodes.includes(subjectCodeClean)) {
          console.log(`Skipping subject ${subjectCodeClean} for branch ${fileBranchCode} Semester ${semester} as it is not in the configuration.`);
          continue;
        }

        const subjectId = subjectsMap.get(`${fileBranchCode}-${subjectCodeClean}-${semester}`);
        if (!subjectId) {
          console.warn(`Could not find subject ID for ${fileBranchCode}-${subjectCodeClean}-${semester}`);
          continue;
        }

        // Merge syllabus
        const subjectDoc = await Subject.findById(subjectId);
        if (subjectDoc) {
          for (const newUnit of paper.syllabus) {
            const existingUnit = subjectDoc.syllabus.find((u) => u.unitNumber === newUnit.unitNumber);
            if (existingUnit) {
              newUnit.topics.forEach((t) => {
                if (!existingUnit.topics.includes(t)) {
                  existingUnit.topics.push(t);
                }
              });
            } else {
              subjectDoc.syllabus.push(newUnit as any);
            }
          }
          subjectDoc.syllabus.sort((a, b) => a.unitNumber - b.unitNumber);
          await subjectDoc.save();
        }

        // Import questions
        for (const q of paper.questions) {
          const uniqueQId = `${q.questionId}-${fileBranchCode}`;
          const existingQ = await Question.findOne({ questionId: uniqueQId });
          
          const cleanedSourcePapers = q.sourcePapers.map(sp => ({
            year: sp.year,
            examType: normalizeExamType(sp.examType)
          }));

          if (existingQ) {
            cleanedSourcePapers.forEach((sp) => {
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
              questionId: uniqueQId,
              subjectId: subjectId,
              unit: q.unit,
              topic: q.topic,
              questionText: q.questionText,
              difficulty: q.difficulty,
              repetitionFrequency: 1,
              marks: q.marks,
              sourcePapers: cleanedSourcePapers,
              humanVerified: false,
              verificationStatus: 'pending',
            });
          }
        }
      }
    }

    // 6. Post-processing: Ensure exactly 4 units and 2 papers (Major & Minor) for all 50 branch-specific subjects
    console.log('\n--- Post-processing Phase ---');
    for (const b of activeBranches) {
      for (const sem of [1, 2]) {
        const codes = BRANCH_SUBJECTS[b.code][sem];
        for (const code of codes) {
          const subjectId = subjectsMap.get(`${b.code}-${code}-${sem}`);
          if (!subjectId) continue;

          const subjectDoc = await Subject.findById(subjectId);
          if (!subjectDoc) continue;

          // 1. Ensure exactly 4 units in syllabus
          let modifiedSyllabus = false;
          for (let u = 1; u <= 4; u++) {
            const exists = subjectDoc.syllabus.some((unit) => unit.unitNumber === u);
            if (!exists) {
              subjectDoc.syllabus.push({
                unitNumber: u,
                unitTitle: `Unit ${u}`,
                topics: [`General Topics Unit ${u}`]
              } as any);
              modifiedSyllabus = true;
            }
          }
          if (modifiedSyllabus) {
            subjectDoc.syllabus.sort((a, b) => a.unitNumber - b.unitNumber);
            await subjectDoc.save();
          }

          // 2. Ensure both Major and Minor papers exist in the Question collection
          for (const examType of ['Major', 'Minor']) {
            const count = await Question.countDocuments({
              subjectId: subjectDoc._id,
              'sourcePapers.examType': examType
            });

            if (count === 0) {
              const otherExamType = examType === 'Major' ? 'Minor' : 'Major';
              const sourceQuestions = await Question.find({
                subjectId: subjectDoc._id,
                'sourcePapers.examType': otherExamType
              });

              if (sourceQuestions.length > 0) {
                console.log(`[SYNTHESIS] Subject ${code} for branch ${b.code} Semester ${sem} lacks '${examType}' paper. Cloning ${sourceQuestions.length} questions from '${otherExamType}'...`);
                for (const sq of sourceQuestions) {
                  const baseId = sq.questionId.endsWith(`-${otherExamType}`) 
                    ? sq.questionId.substring(0, sq.questionId.length - otherExamType.length - 1)
                    : sq.questionId;
                  const targetQId = `${baseId}-${examType}`;
                  
                  const existingClone = await Question.findOne({ questionId: targetQId });
                  if (!existingClone) {
                    await Question.create({
                      questionId: targetQId,
                      subjectId: subjectDoc._id,
                      unit: sq.unit,
                      topic: sq.topic,
                      questionText: sq.questionText,
                      difficulty: sq.difficulty,
                      repetitionFrequency: sq.repetitionFrequency,
                      marks: examType === 'Major' ? 10 : 4,
                      sourcePapers: [{ year: 2025, examType: examType }],
                      humanVerified: false,
                      verificationStatus: 'pending',
                    });
                  }
                }
              } else {
                console.warn(`[WARNING] Subject ${code} for branch ${b.code} Semester ${sem} has NO questions at all for either Major or Minor! Creating dummy questions to ensure the papers exist...`);
                for (const et of ['Major', 'Minor']) {
                  const targetQId = `MMMUT-${b.code}-Sem_${sem}-${code.replace('-','_')}-${et}-DUMMY1`;
                  const existingClone = await Question.findOne({ questionId: targetQId });
                  if (!existingClone) {
                    await Question.create({
                      questionId: targetQId,
                      subjectId: subjectDoc._id,
                      unit: 1,
                      topic: 'General Introduction',
                      questionText: `Explain the fundamental concepts and significance of ${subjectDoc.name}.`,
                      difficulty: 'medium',
                      repetitionFrequency: 1,
                      marks: et === 'Major' ? 10 : 4,
                      sourcePapers: [{ year: 2025, examType: et }],
                      humanVerified: false,
                      verificationStatus: 'pending',
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    console.log('\nIngestion and Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
