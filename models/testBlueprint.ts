import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IQuestionGroup {
  unit: number;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  count: number;
}

export interface ISectionPattern {
  name: string;
  count: number;
  marks: number;
}

export interface IMarksPattern {
  totalMarks: number;
  sections?: ISectionPattern[];
}

export interface ITestBlueprint extends Document {
  universityId?: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  examType: 'minor' | 'major' | 'custom';
  duration: number; // in minutes (e.g. 60, 180)
  questionDistribution: IQuestionGroup[];
  marksPattern: IMarksPattern;
  userId?: string; // Optional: Firebase UID for custom user-created blueprints
  createdAt: Date;
  updatedAt: Date;
}

const QuestionGroupSchema = new Schema<IQuestionGroup>({
  unit: { type: Number, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  marks: { type: Number, required: true },
  count: { type: Number, required: true },
});

const SectionPatternSchema = new Schema<ISectionPattern>({
  name: { type: String, required: true },
  count: { type: Number, required: true },
  marks: { type: Number, required: true },
});

const MarksPatternSchema = new Schema<IMarksPattern>({
  totalMarks: { type: Number, required: true },
  sections: [SectionPatternSchema],
});

const TestBlueprintSchema = new Schema<ITestBlueprint>(
  {
    universityId: { type: Schema.Types.ObjectId, ref: 'University' },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    examType: { 
      type: String, 
      enum: ['minor', 'major', 'custom'], 
      required: true 
    },
    duration: { type: Number, required: true },
    questionDistribution: [QuestionGroupSchema],
    marksPattern: MarksPatternSchema,
    userId: { type: String, index: true }, // Filter to load student-specific custom configurations
  },
  { timestamps: true }
);

// Indexes to speed up blueprint selections
TestBlueprintSchema.index({ subjectId: 1, examType: 1 });
TestBlueprintSchema.index({ universityId: 1, courseId: 1, branchId: 1 });

const TestBlueprint: Model<ITestBlueprint> = 
  mongoose.models.TestBlueprint || mongoose.model<ITestBlueprint>('TestBlueprint', TestBlueprintSchema);

export default TestBlueprint;
