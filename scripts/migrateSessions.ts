import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

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

async function run() {
  try {
    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(MONGODB_URI!, { autoSelectFamily: false });
    console.log('Connected successfully.');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established.');
    }

    // Access the raw collection objects
    const oldSessionsCollection = db.collection('sessions');
    const newSessionsCollection = db.collection('practice_sessions');

    console.log("Analyzing old 'sessions' collection for academic exam/practice records...");
    
    // Academic sessions are identified by having 'subjectId' or 'type' inside ['practice', 'test']
    const academicSessions = await oldSessionsCollection.find({
      $or: [
        { subjectId: { $exists: true } },
        { type: { $in: ['practice', 'test'] } }
      ]
    }).toArray();

    console.log(`Found ${academicSessions.length} academic practice/test sessions in the 'sessions' collection.`);

    if (academicSessions.length === 0) {
      console.log('No sessional academic records need migration. Check completed.');
      process.exit(0);
    }

    console.log(`Migrating ${academicSessions.length} sessions to 'practice_sessions'...`);

    // Insert them into new collection (use ordered false so duplicate insert errors don't stop the batch)
    let migratedCount = 0;
    for (const doc of academicSessions) {
      try {
        const exists = await newSessionsCollection.findOne({ _id: doc._id });
        if (!exists) {
          await newSessionsCollection.insertOne(doc);
        }
        migratedCount++;
      } catch (insertErr) {
        console.warn(`Failed to insert document ${doc._id}:`, insertErr);
      }
    }

    console.log(`Successfully copied ${migratedCount} / ${academicSessions.length} academic sessions to 'practice_sessions'.`);

    // Delete the migrated documents from the old 'sessions' collection
    if (migratedCount > 0) {
      const idsToDelete = academicSessions.map(doc => doc._id);
      const deleteResult = await oldSessionsCollection.deleteMany({
        _id: { $in: idsToDelete }
      });
      console.log(`Successfully deleted ${deleteResult.deletedCount} academic records from the old 'sessions' collection.`);
    }

    console.log('Migration completed successfully. Separate collections are fully isolated.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed with error:', error);
    process.exit(1);
  }
}

run();
