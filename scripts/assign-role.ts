import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import User from '../models/user';

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

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: npx tsx scripts/assign-role.ts <email> <role>');
  console.log('Roles: student | verifier | moderator | admin');
  process.exit(1);
}

const email = args[0].trim().toLowerCase();
const role = args[1].trim().toLowerCase();

const VALID_ROLES = ['student', 'verifier', 'moderator', 'admin'];
if (!VALID_ROLES.includes(role)) {
  console.error(`Error: Invalid role "${role}". Valid roles are: ${VALID_ROLES.join(', ')}`);
  process.exit(1);
}

async function run() {
  try {
    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(MONGODB_URI!, { autoSelectFamily: false });
    console.log('Connected.');

    console.log(`Looking up user with email: ${email}...`);
    const user = await User.findOne({ email });
    
    if (!user) {
      console.error(`Error: User with email "${email}" not found in MongoDB database.`);
      console.log('Please make sure you have registered this account and logged in at least once so the profile document is initialized.');
      process.exit(1);
    }

    console.log(`User found! Current profile details:`);
    console.log(`- ID: ${user._id}`);
    console.log(`- Display Name: ${user.displayName || 'None'}`);
    console.log(`- Role: ${user.role}`);
    console.log(`- Onboarding Completed: ${user.onboardingCompleted}`);

    console.log(`Updating role to "${role}"...`);
    user.role = role as any;
    await user.save();
    
    console.log(`Success! User role has been updated to "${role}".`);
    process.exit(0);
  } catch (error) {
    console.error('Error running script:', error);
    process.exit(1);
  }
}

run();
