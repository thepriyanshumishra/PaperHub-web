const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://priyanshumishramps21_db_user:mqq2DtZH0Lua08EH@cluster0.oqudxon.mongodb.net/paperhub?retryWrites=true&w=majority';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const SessionSchema = new mongoose.Schema({}, { strict: false });
  const Session = mongoose.model('Session', SessionSchema, 'sessions');

  const completedSessions = await Session.find({ status: 'completed', evaluationMethod: 'self' }).sort({ endedAt: -1 }).limit(5).lean();
  console.log(`Found ${completedSessions.length} completed self sessions`);
  completedSessions.forEach(s => {
    console.log('--------------------------------------------------');
    console.log(`ID: ${s._id}`);
    console.log(`Type: ${s.type}, SubType: ${s.subType}`);
    console.log(`Status: ${s.status}, Method: ${s.evaluationMethod}`);
    console.log(`Started: ${s.startedAt}, Ended: ${s.endedAt}`);
    console.log('Test Responses:', JSON.stringify(s.testResponses, null, 2));
    console.log('Evaluation Result (from DB):', JSON.stringify(s.evaluationResult, null, 2));
  });

  await mongoose.disconnect();
}

main().catch(console.error);
