import fs from 'fs';
import path from 'path';

// Parse and load .env.local manually for terminal runner
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  for (const line of envConfig.split('\n')) {
    const matched = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (matched) {
      const key = matched[1];
      let value = matched[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  }
}

async function main() {
  try {
    const dbConnect = (await import('../lib/db')).default;
    const User = (await import('../models/user')).default;
    const Session = (await import('../models/session')).default;

    await dbConnect();
    console.log("Connected to MongoDB.");

    const userCount = await User.countDocuments({});
    const sessionCount = await Session.countDocuments({});
    console.log(`Found ${userCount} users and ${sessionCount} sessions.`);

    await User.deleteMany({});
    await Session.deleteMany({});
    console.log("Successfully deleted all users and sessions from MongoDB.");
    
    process.exit(0);
  } catch (err) {
    console.error("Error resetting database users:", err);
    process.exit(1);
  }
}

main();
