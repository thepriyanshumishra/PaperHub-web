const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

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
    await mongoose.connect(MONGODB_URI, { autoSelectFamily: false });
    console.log('Connected to MongoDB.');

    const db = mongoose.connection.db;

    // 1. Update Test User Profiles
    console.log('Updating test user profiles...');
    const usersCol = db.collection('users');

    // Admin
    const adminRes = await usersCol.updateOne(
      { username: 'testadmin' },
      {
        $set: {
          displayName: 'Admin User',
          name: 'Admin User',
          role: 'admin',
          accountStatus: 'active',
          onboardingCompleted: true,
          'profile.name': 'Admin User'
        }
      }
    );
    console.log('Updated Admin:', adminRes.matchedCount > 0 ? 'Success' : 'Not Found');

    // Verifier
    const verifierRes = await usersCol.updateOne(
      { username: 'testverifier' },
      {
        $set: {
          displayName: 'Verifier User',
          name: 'Verifier User',
          role: 'verifier',
          accountStatus: 'active',
          onboardingCompleted: true,
          'profile.name': 'Verifier User'
        }
      }
    );
    console.log('Updated Verifier:', verifierRes.matchedCount > 0 ? 'Success' : 'Not Found');

    // Moderator
    const moderatorRes = await usersCol.updateOne(
      { username: 'testmoderator' },
      {
        $set: {
          displayName: 'Moderator User',
          name: 'Moderator User',
          role: 'moderator',
          accountStatus: 'active',
          onboardingCompleted: true,
          'profile.name': 'Moderator User'
        }
      }
    );
    console.log('Updated Moderator:', moderatorRes.matchedCount > 0 ? 'Success' : 'Not Found');

    // Student
    const studentRes = await usersCol.updateOne(
      { username: 'teststudent' },
      {
        $set: {
          displayName: 'Student User',
          name: 'Student User',
          role: 'student',
          accountStatus: 'active',
          onboardingCompleted: true,
          'profile.name': 'Student User',
          'profile.branch': 'CSE',
          'profile.semester': 2
        }
      }
    );
    console.log('Updated Student:', studentRes.matchedCount > 0 ? 'Success' : 'Not Found');


    // 2. Seed Feedbacks
    console.log('Clearing existing feedbacks...');
    const feedbackCol = db.collection('feedbacks');
    await feedbackCol.deleteMany({});
    
    console.log('Seeding mock feedbacks...');
    const feedbackList = [
      {
        userId: 'teststudent',
        userEmail: 'teststudent@paperhub.com',
        category: 'bug',
        title: 'OCR formula rendering fails on Physics Unit 2',
        description: 'When practicing Physics Unit 2, the LaTeX formula for Schrödinger equation is raw and unparsed.',
        page: '/subjects/physics/practice',
        status: 'open',
        priority: 'high',
        adminNotes: '',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: 'teststudent',
        userEmail: 'teststudent@paperhub.com',
        category: 'ui_ux',
        title: 'Dark mode contrast is low in heatmap cells',
        description: 'The green shades in dark mode heatmap are too dark to distinguish. Please increase contrast.',
        page: '/analytics',
        status: 'acknowledged',
        priority: 'medium',
        adminNotes: 'Assigned to front-end team to review HSL Tailwind configurations.',
        createdAt: new Date(Date.now() - 3600000),
        updatedAt: new Date()
      },
      {
        userId: 'teststudent',
        userEmail: 'teststudent@paperhub.com',
        category: 'performance',
        title: 'Solving page loads very slowly under poor network connection',
        description: 'Next.js server-side hydration for questions is blocking the initial paint of the practice screen.',
        page: '/practice/solve',
        status: 'in_progress',
        priority: 'critical',
        adminNotes: 'Refactoring solve page components to client-side load solutions asynchronously.',
        createdAt: new Date(Date.now() - 7200000),
        updatedAt: new Date()
      },
      {
        userId: 'teststudent',
        userEmail: 'teststudent@paperhub.com',
        category: 'content_quality',
        title: 'Incorrect solution for Maths-I sessional paper 2024',
        description: 'Question ID BCS-Q3 has a minor error in Step 3 where integration constants were omitted.',
        page: '/subjects/maths-1/tests',
        status: 'resolved',
        priority: 'medium',
        adminNotes: 'Verifier updated solution cache. Verified successfully.',
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date()
      }
    ];

    await feedbackCol.insertMany(feedbackList);
    console.log('Feedback seeded.');

    // 3. Update question statuses to populate verifier / moderator queues
    console.log('Updating sample questions to pending / flagged / archived...');
    const questionsCol = db.collection('questions');
    const questions = await questionsCol.find({}).limit(20).toArray();
    
    if (questions.length > 0) {
      // Set some to pending
      for (let i = 0; i < Math.min(5, questions.length); i++) {
        await questionsCol.updateOne(
          { _id: questions[i]._id },
          { $set: { verificationStatus: 'pending' } }
        );
      }
      // Set some to flagged
      for (let i = 5; i < Math.min(8, questions.length); i++) {
        await questionsCol.updateOne(
          { _id: questions[i]._id },
          { 
            $set: { 
              verificationStatus: 'flagged',
              verificationComment: 'Mathematical equation is missing subscripts in sessional document.' 
            } 
          }
        );
      }
      // Set one to archived
      if (questions.length > 8) {
        await questionsCol.updateOne(
          { _id: questions[8]._id },
          { $set: { verificationStatus: 'archived' } }
        );
      }

      // Setup mock duplicates between questions[1] and questions[2] for UI testing
      if (questions.length > 3) {
        const q1 = questions[1];
        const q2 = questions[2];
        await questionsCol.updateOne(
          { _id: q1._id },
          { 
            $set: { 
              similarQuestionIds: [q2.questionId],
              duplicateScore: 0.95,
              verificationStatus: 'pending'
            } 
          }
        );
        await questionsCol.updateOne(
          { _id: q2._id },
          { 
            $set: { 
              similarQuestionIds: [q1.questionId],
              duplicateScore: 0.95,
              verificationStatus: 'pending'
            } 
          }
        );
        console.log(`Mock duplicate group set between: ${q1.questionId} and ${q2.questionId}`);
      }

      console.log('Sample questions updated.');
    } else {
      console.log('No questions found in database.');
    }

    // 4. Seed Appeals
    console.log('Clearing existing appeals...');
    const appealsCol = db.collection('appeals');
    await appealsCol.deleteMany({});

    if (questions.length > 0) {
      console.log('Seeding mock appeals...');
      const mockSessionId = new mongoose.Types.ObjectId();
      const mockQuestionId = questions[0]._id;

      await appealsCol.insertOne({
        sessionId: mockSessionId,
        questionId: mockQuestionId,
        userId: 'teststudent',
        reason: 'I submitted the correct steps and formula but the grading model evaluated it as 0 marks. Please review.',
        status: 'pending',
        previousScore: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      if (questions.length > 1) {
        await appealsCol.insertOne({
          sessionId: mockSessionId,
          questionId: questions[1]._id,
          userId: 'teststudent',
          reason: 'Typo in question options. Option A and C are exactly same. I marked A but was marked incorrect.',
          status: 'resolved',
          previousScore: 0,
          adjustedScore: 10,
          resolvedBy: 'testmoderator',
          resolutionComment: 'Typo resolved. Target question updated and score adjusted.',
          createdAt: new Date(Date.now() - 3600000),
          updatedAt: new Date()
        });
      }
      console.log('Appeals seeded.');
    }

    // 5. Seed Uploaded Documents & Batches (Verifier Ingestion Pipeline)
    console.log('Clearing document batches and uploads...');
    const batchesCol = db.collection('documentbatches');
    const uploadsCol = db.collection('uploadeddocuments');
    await batchesCol.deleteMany({});
    await uploadsCol.deleteMany({});

    console.log('Seeding mock batches and documents...');
    const batch1 = await batchesCol.insertOne({
      name: 'Batch_MMMUT_Mathematics_2025',
      status: 'completed',
      totalFiles: 2,
      processedFiles: 2,
      uploadedBy: 'testverifier',
      createdAt: new Date(Date.now() - 86400000),
      updatedAt: new Date(Date.now() - 86400000)
    });

    const batch2 = await batchesCol.insertOne({
      name: 'Batch_MMMUT_Physics_2026',
      status: 'processing',
      totalFiles: 3,
      processedFiles: 1,
      uploadedBy: 'testverifier',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const batch3 = await batchesCol.insertOne({
      name: 'Batch_AKTU_Electrical_2025',
      status: 'failed',
      totalFiles: 1,
      processedFiles: 0,
      uploadedBy: 'testverifier',
      errorMessage: 'OCR parsing failed: corrupted PDF file structure.',
      createdAt: new Date(Date.now() - 172800000),
      updatedAt: new Date(Date.now() - 172800000)
    });

    // Seed documents
    const subjectsCol = db.collection('subjects');
    const sampleSubject = await subjectsCol.findOne({});
    const subId = sampleSubject ? sampleSubject._id : new mongoose.Types.ObjectId();

    await uploadsCol.insertOne({
      batchId: batch1.insertedId,
      fileName: 'Maths_Sessional_2025.pdf',
      mimeType: 'application/pdf',
      fileSize: 4120394,
      fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      status: 'completed',
      subjectId: subId,
      year: 2025,
      examType: 'Sessional-1',
      pages: [
        { pageNumber: 1, imagePath: '/uploads/page1.png', extractedContent: 'Solve all questions. 1. Find rank of matrix...', confidence: 94 },
        { pageNumber: 2, imagePath: '/uploads/page2.png', extractedContent: '2. Solve differential equation x dx + y dy = 0...', confidence: 91 }
      ],
      createdAt: new Date(Date.now() - 86400000),
      updatedAt: new Date(Date.now() - 86400000)
    });

    await uploadsCol.insertOne({
      batchId: batch2.insertedId,
      fileName: 'Physics_EndSem_2026.pdf',
      mimeType: 'application/pdf',
      fileSize: 5120392,
      fileHash: 'f4b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b866',
      status: 'processing',
      subjectId: subId,
      year: 2026,
      examType: 'Major',
      pages: [
        { pageNumber: 1, imagePath: '/uploads/phys1.png', extractedContent: 'Section A. 1. Explain photoelectric effect...', confidence: 85 }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await uploadsCol.insertOne({
      batchId: batch3.insertedId,
      fileName: 'Electrical_Major_2025.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024394,
      fileHash: 'a1b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b777',
      status: 'failed',
      errorMessage: 'Corrupted file payload.',
      subjectId: subId,
      year: 2025,
      examType: 'Major',
      pages: [],
      createdAt: new Date(Date.now() - 172800000),
      updatedAt: new Date(Date.now() - 172800000)
    });

    console.log('Document pipeline seeded.');

    // 6. Seed College Requests
    console.log('Clearing college requests...');
    const colRequestsCol = db.collection('collegerequests');
    await colRequestsCol.deleteMany({});

    console.log('Seeding mock college requests...');
    const mmmutUniv = await db.collection('universities').findOne({ code: 'MMMUT' });
    const univId = mmmutUniv ? mmmutUniv._id : new mongoose.Types.ObjectId();

    await colRequestsCol.insertMany([
      {
        userId: 'teststudent',
        userEmail: 'teststudent@paperhub.com',
        universityId: univId,
        collegeName: 'Institute of Engineering and Technology, Lucknow',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: 'teststudent',
        userEmail: 'teststudent@paperhub.com',
        universityId: univId,
        collegeName: 'Kamla Nehru Institute of Technology, Sultanpur',
        status: 'pending',
        createdAt: new Date(Date.now() - 3600000),
        updatedAt: new Date()
      },
      {
        userId: 'teststudent',
        userEmail: 'teststudent@paperhub.com',
        universityId: univId,
        collegeName: 'Bundelkhand Institute of Engineering and Technology, Jhansi',
        status: 'approved',
        adminNotes: 'Verified and approved as state-govt autonomous college.',
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date()
      }
    ]);

    console.log('College requests seeded.');

    console.log('Seeding process completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seed();
