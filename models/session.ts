import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISessionHistory {
  questionId: mongoose.Types.ObjectId;
  viewedSolution: boolean;
  aiQueriesCount: number;
}

export interface ISessionTestAnalytics {
  tabSwitches: number;
  focusLosses: number;
  fullscreenExits: number;
}

export interface ITestResponse {
  questionId: mongoose.Types.ObjectId;
  selfScore?: 'correct' | 'partial' | 'incorrect';
  score?: number;
  notes?: string;
}

export interface ISession extends Document {
  userId: string; // Anonymous UUID
  subjectId: mongoose.Types.ObjectId;
  type: 'practice' | 'test';
  subType: 'topic' | 'unit' | 'syllabus' | 'custom';
  config: {
    units: number[];
    topics: string[];
    questionCount: number;
  };
  questions: mongoose.Types.ObjectId[];
  currentQuestionIndex: number;
  history: ISessionHistory[];
  testAnalytics: ISessionTestAnalytics;
  startedAt: Date;
  endedAt?: Date;
  status: 'active' | 'completed';
  evaluationMethod?: 'self' | 'photo';
  testResponses?: ITestResponse[];
  uploadedImages?: string[]; // Array of base64 image strings
  evaluationResult?: {
    totalMarks: number;
    obtainedMarks: number;
    summaryFeedback: string;
    details: {
      questionId: string;
      marksAwarded: number;
      feedback: string;
    }[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const SessionHistorySchema = new Schema<ISessionHistory>({
  questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
  viewedSolution: { type: Boolean, default: false },
  aiQueriesCount: { type: Number, default: 0 },
});

const SessionTestAnalyticsSchema = new Schema<ISessionTestAnalytics>({
  tabSwitches: { type: Number, default: 0 },
  focusLosses: { type: Number, default: 0 },
  fullscreenExits: { type: Number, default: 0 },
});

const TestResponseSchema = new Schema<ITestResponse>({
  questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
  selfScore: { type: String, enum: ['correct', 'partial', 'incorrect'] },
  score: { type: Number },
  notes: { type: String },
});

const SessionSchema = new Schema<ISession>(
  {
    userId: { type: String, required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    type: { type: String, enum: ['practice', 'test'], required: true },
    subType: { type: String, enum: ['topic', 'unit', 'syllabus', 'custom'], required: true },
    config: {
      units: [{ type: Number }],
      topics: [{ type: String }],
      questionCount: { type: Number },
    },
    questions: [{ type: Schema.Types.ObjectId, ref: 'Question', required: true }],
    currentQuestionIndex: { type: Number, default: 0 },
    history: [SessionHistorySchema],
    testAnalytics: { type: SessionTestAnalyticsSchema, default: () => ({}) },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    evaluationMethod: { type: String, enum: ['self', 'photo'], default: 'self' },
    testResponses: [TestResponseSchema],
    uploadedImages: [{ type: String }],
    evaluationResult: {
      totalMarks: { type: Number },
      obtainedMarks: { type: Number },
      summaryFeedback: { type: String },
      details: [{
        questionId: { type: String },
        marksAwarded: { type: Number },
        feedback: { type: String },
      }],
    },
  },
  { timestamps: true }
);

const Session: Model<ISession> = mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);
export default Session;
