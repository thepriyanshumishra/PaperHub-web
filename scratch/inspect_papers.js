const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://priyanshumishramps21_db_user:mqq2DtZH0Lua08EH@cluster0.oqudxon.mongodb.net/paperhub?retryWrites=true&w=majority';

async function main() {
  await mongoose.connect(MONGODB_URI);
  const Question = mongoose.connection.collection('questions');
  const subjects = mongoose.connection.collection('subjects');
  
  // get distinct sourcePapers for all questions
  const questions = await Question.find({}).toArray();
  const papers = new Set();
  
  questions.forEach(q => {
    if (q.sourcePapers && q.sourcePapers.length > 0) {
      q.sourcePapers.forEach(sp => papers.add(`${sp.examType} ${sp.year} - SubjectID: ${q.subjectId}`));
    }
  });
  
  console.log('Available Papers:');
  papers.forEach(p => console.log(p));
  
  console.log('\nFetching a few subjects:');
  const subs = await subjects.find({}).limit(5).toArray();
  console.log(subs.map(s => ({_id: s._id, name: s.name, code: s.code})));
  
  mongoose.disconnect();
}

main().catch(console.error);
