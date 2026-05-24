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
  content: string; // Full solution in Markdown/LaTeX
  steps: ISolutionStep[];
  generatedAt: Date;
}

export interface IQuestion extends Document {
  subjectId: mongoose.Types.ObjectId;
  unit: number;
  topic: string;
  questionText: string; // Markdown/LaTeX content
  difficulty: 'easy' | 'medium' | 'hard';
  repetitionFrequency: number;
  sourcePapers: ISourcePaper[];
  cachedSolution?: ICachedSolution;
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
  generatedAt: { type: Date, default: Date.now },
});

const QuestionSchema = new Schema<IQuestion>(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    unit: { type: Number, required: true },
    topic: { type: String, required: true, trim: true },
    questionText: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    repetitionFrequency: { type: Number, default: 1 },
    sourcePapers: [SourcePaperSchema],
    cachedSolution: CachedSolutionSchema,
  },
  { timestamps: true }
);

QuestionSchema.index({ subjectId: 1, unit: 1, topic: 1 });
QuestionSchema.index({ difficulty: 1 });
QuestionSchema.index({ repetitionFrequency: -1 });

const Question: Model<IQuestion> = mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);
export default Question;
