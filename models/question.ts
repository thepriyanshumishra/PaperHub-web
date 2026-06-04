import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISourcePaper {
  year: number;
  examType: string; // e.g. "Minor 1", "Minor 2", "Major"
}

export interface ISolutionStep {
  stepNumber: number;
  heading: string;
  content: string; // Markdown/LaTeX content
}

export interface ICachedSolution {
  content: string; // Full solution in Markdown/LaTeX or intro paragraph
  steps?: ISolutionStep[];
  type?: 'stepwise' | 'theoretical' | 'coding' | 'flowchart' | 'theory' | 'maths';
  code?: string;
  explanation?: string;
  complexity?: {
    time: string;
    space: string;
  };
  inputOutput?: string;
  mermaid?: string;
  generatedAt: Date;
}

export interface IQuestion extends Document {
  questionId: string;
  subjectId: mongoose.Types.ObjectId;
  unit: number;
  topic: string;
  questionText: string; // Markdown/LaTeX content
  difficulty: 'easy' | 'medium' | 'hard';
  repetitionFrequency: number;
  marks: number;
  sourcePapers: ISourcePaper[];
  cachedSolution?: ICachedSolution;
  humanVerified: boolean;
  verificationStatus: 'pending' | 'verified' | 'flagged';
  verificationComment?: string;
  verifiedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SourcePaperSchema = new Schema<ISourcePaper>({
  year: { type: Number, required: true },
  examType: { type: String, required: true },
});

const SolutionStepSchema = new Schema<ISolutionStep>({
  stepNumber: { type: Number, required: true },
  heading: { type: String, required: true },
  content: { type: String, required: true },
});

const CachedSolutionSchema = new Schema<ICachedSolution>({
  content: { type: String, required: true },
  steps: [SolutionStepSchema],
  type: { type: String, enum: ['stepwise', 'theoretical', 'coding', 'flowchart', 'theory', 'maths'], default: 'stepwise' },
  code: { type: String },
  explanation: { type: String },
  complexity: {
    time: { type: String },
    space: { type: String },
  },
  inputOutput: { type: String },
  mermaid: { type: String },
  generatedAt: { type: Date, default: Date.now },
});

const QuestionSchema = new Schema<IQuestion>(
  {
    questionId: { type: String, required: true, unique: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    unit: { type: Number, required: true },
    topic: { type: String, required: true, trim: true },
    questionText: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    repetitionFrequency: { type: Number, default: 1 },
    marks: { type: Number, required: true },
    sourcePapers: [SourcePaperSchema],
    cachedSolution: CachedSolutionSchema,
    humanVerified: { type: Boolean, default: false },
    verificationStatus: { 
      type: String, 
      enum: ['pending', 'verified', 'flagged'], 
      default: 'pending' 
    },
    verificationComment: { type: String, default: '' },
    verifiedBy: { type: String },
  },
  { timestamps: true }
);

QuestionSchema.index({ subjectId: 1, unit: 1, topic: 1 });
QuestionSchema.index({ difficulty: 1 });
QuestionSchema.index({ repetitionFrequency: -1 });

const Question: Model<IQuestion> = mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);
export default Question;
