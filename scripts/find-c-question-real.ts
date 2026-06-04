import mongoose from "mongoose";
import fs from "fs";
import path from "path";

const envLocalPath = path.join("/Users/thedarkpcm/Desktop/Priyanshu/PaperHub-web", ".env.local");
let MONGODB_URI = "";

if (fs.existsSync(envLocalPath)) {
  const envFileContent = fs.readFileSync(envLocalPath, "utf-8");
  envFileContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      if (key === "MONGODB_URI") {
        MONGODB_URI = value.trim();
      }
    }
  });
}

const QuestionSchema = new mongoose.Schema({
  questionText: String,
  cachedSolution: mongoose.Schema.Types.Mixed
});

const Question = mongoose.models.Question || mongoose.model("Question", QuestionSchema, "questions");

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB!");
  
  const question = await Question.findOne({ questionText: /describe the different types/i });
  if (question) {
    console.log("FOUND QUESTION!");
    console.log("ID:", question._id);
    console.log("Question Text:", JSON.stringify(question.questionText));
    console.log("Cached Solution:");
    console.log(JSON.stringify(question.cachedSolution, null, 2));
  } else {
    console.log("QUESTION NOT FOUND!");
    // Let's print all questions in DB to see what is there
    const all = await Question.find({}, { questionText: 1 }).limit(10);
    console.log("Top 10 questions in DB:");
    all.forEach(q => console.log("- ", q.questionText));
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
