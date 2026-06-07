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

export interface ICachedHints {
  hints: string[]; // 3 progressive hints
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
  cachedHints?: ICachedHints;
  humanVerified: boolean;
  verificationStatus: 'pending' | 'verified' | 'flagged' | 'archived';
  verificationComment?: string;
  verifiedBy?: string;
  verifiedByName?: string;
  verifiedAt?: Date;
  flaggedBy?: string;
  flaggedByName?: string;
  flaggedAt?: Date;
  ocrConfidence?: number;
  originalTextBeforeVerification?: string;
  verifierChanges?: any;
  verificationCorrectionCount?: number;
  flaggedCount?: number;
  lastAppearedYear?: number;
  version: number;
  importance?: 'low' | 'medium' | 'high';
  sourceDocumentId?: mongoose.Types.ObjectId;
  sourcePageNumber?: number;
  sourcePageImage?: string;
  croppedQuestionImage?: string;
  aiSuggestions?: {
    subjectId?: mongoose.Types.ObjectId;
    unit?: number;
    topic?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    confidence?: number;
  };
  duplicateScore?: number;
  similarQuestionIds?: string[];
  extractionQualityScore?: number;
  evaluationMode?: 'exact_match' | 'numerical' | 'formula' | 'semantic' | 'programming' | 'manual_review';
  modelAnswer?: string;
  keyPoints?: string[];
  acceptedRange?: {
    min?: number;
    max?: number;
  };
  acceptedValues?: string[];
  tolerance?: number;
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
    cachedHints: {
      hints: [{ type: String }],
      generatedAt: { type: Date, default: Date.now }
    },
    humanVerified: { type: Boolean, default: false },
    verificationStatus: { 
      type: String, 
      enum: ['pending', 'verified', 'flagged', 'archived'], 
      default: 'pending' 
    },
    verificationComment: { type: String, default: '' },
    verifiedBy: { type: String },
    verifiedByName: { type: String },
    verifiedAt: { type: Date },
    flaggedBy: { type: String },
    flaggedByName: { type: String },
    flaggedAt: { type: Date },
    ocrConfidence: { type: Number, default: 100 },
    originalTextBeforeVerification: { type: String },
    verifierChanges: { type: Schema.Types.Mixed },
    verificationCorrectionCount: { type: Number, default: 0 },
    flaggedCount: { type: Number, default: 0 },
    lastAppearedYear: { type: Number },
    version: { type: Number, default: 1 },
    sourceDocumentId: { type: Schema.Types.ObjectId, ref: 'UploadedDocument' },
    sourcePageNumber: { type: Number },
    sourcePageImage: { type: String },
    croppedQuestionImage: { type: String },
    aiSuggestions: {
      subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
      unit: { type: Number },
      topic: { type: String },
      difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
      confidence: { type: Number }
    },
    duplicateScore: { type: Number, default: 0 },
    similarQuestionIds: [{ type: String }],
    extractionQualityScore: { type: Number },
    evaluationMode: {
      type: String,
      enum: ['exact_match', 'numerical', 'formula', 'semantic', 'programming', 'manual_review'],
      default: 'semantic'
    },
    modelAnswer: { type: String, default: '' },
    keyPoints: [{ type: String }],
    acceptedRange: {
      min: { type: Number },
      max: { type: Number }
    },
    acceptedValues: [{ type: String }],
    tolerance: { type: Number }
  },
  { timestamps: true }
);

// Pre-save hook to automatically cache the latest paper year
QuestionSchema.pre('save', function (this: IQuestion) {
  if (this.sourcePapers && this.sourcePapers.length > 0) {
    const years = this.sourcePapers.map((sp) => sp.year);
    this.lastAppearedYear = Math.max(...years);
  }
});

// Indexes for fast academic retrieval and search matching
QuestionSchema.index({ subjectId: 1, unit: 1, topic: 1 });
QuestionSchema.index({ difficulty: 1 });
QuestionSchema.index({ repetitionFrequency: -1 });
QuestionSchema.index({ verificationStatus: 1, updatedAt: -1 });
QuestionSchema.index({ subjectId: 1, verificationStatus: 1, unit: 1, difficulty: 1, lastAppearedYear: -1 });
QuestionSchema.index({ questionText: 'text', topic: 'text' }, { weights: { topic: 10, questionText: 1 } });
QuestionSchema.index({ 'sourcePapers.examType': 1, 'sourcePapers.year': 1 });
QuestionSchema.index({ subjectId: 1, 'sourcePapers.examType': 1, 'sourcePapers.year': 1 });

export function getQuestionImportance(question: { repetitionFrequency?: number; lastAppearedYear?: number }) {
  const rep = question.repetitionFrequency || 1;
  const lastYear = question.lastAppearedYear;
  const currentYear = new Date().getFullYear();

  if (rep >= 3) return 'high';
  if (lastYear && (currentYear - lastYear <= 2) && rep >= 2) return 'high';
  if (rep === 2) return 'medium';
  return 'low';
}

const Question: Model<IQuestion> = mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);
export default Question;
