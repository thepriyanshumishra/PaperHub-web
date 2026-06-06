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
  subType: 'topic' | 'unit' | 'syllabus' | 'custom' | 'minor' | 'major';
  config: {
    units: number[];
    topics: string[];
    questionCount: number;
    subjectIds?: mongoose.Types.ObjectId[] | string[];
    selections?: {
      subjectId: mongoose.Types.ObjectId | string;
      units: number[];
      topics: string[];
    }[];
  };
  questions: mongoose.Types.ObjectId[];
  currentQuestionIndex: number;
  history: ISessionHistory[];
  testAnalytics: ISessionTestAnalytics;
  startedAt: Date;
  endedAt?: Date;
  status: 'active' | 'completed' | 'failed_eval';
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
      status?: 'completed' | 'needs_review' | 'reviewed';
      confidence?: number;
      reasoning?: string;
      missingPoints?: string[];
      originalAnswer?: string;
      reviewerComment?: string;
      reviewedBy?: string;
      reviewedAt?: Date;
    }[];
  };
  blueprintId?: mongoose.Types.ObjectId;
  isExamMode?: boolean;
  examDuration?: number; // in seconds
  timeRemaining?: number; // in seconds
  timerLastSyncedAt?: Date;
  seed?: number;
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
    subType: { type: String, enum: ['topic', 'unit', 'syllabus', 'custom', 'minor', 'major'], required: true },
    config: {
      units: [{ type: Number }],
      topics: [{ type: String }],
      questionCount: { type: Number },
      subjectIds: [{ type: Schema.Types.ObjectId, ref: 'Subject' }],
      selections: [{
        subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
        units: [{ type: Number }],
        topics: [{ type: String }]
      }]
    },
    questions: [{ type: Schema.Types.ObjectId, ref: 'Question', required: true }],
    currentQuestionIndex: { type: Number, default: 0 },
    history: [SessionHistorySchema],
    testAnalytics: { type: SessionTestAnalyticsSchema, default: () => ({}) },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    status: { type: String, enum: ['active', 'completed', 'failed_eval'], default: 'active' },
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
        status: { type: String, enum: ['completed', 'needs_review', 'reviewed'], default: 'completed' },
        confidence: { type: Number },
        reasoning: { type: String },
        missingPoints: [{ type: String }],
        originalAnswer: { type: String },
        reviewerComment: { type: String },
        reviewedBy: { type: String },
        reviewedAt: { type: Date },
      }],
    },
    blueprintId: { type: Schema.Types.ObjectId, ref: 'TestBlueprint' },
    isExamMode: { type: Boolean, default: false },
    examDuration: { type: Number },
    timeRemaining: { type: Number },
    timerLastSyncedAt: { type: Date },
    seed: { type: Number },
  },
  { timestamps: true }
);

const Session: Model<ISession> = mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);

SessionSchema.index({ userId: 1, type: 1, status: 1 });

export function syncSessionTimer(session: any) {
  if (session.status !== 'active' || !session.isExamMode) return;

  const now = new Date();
  const lastSync = session.timerLastSyncedAt || session.startedAt || now;
  const elapsedSeconds = Math.floor((now.getTime() - new Date(lastSync).getTime()) / 1000);

  if (elapsedSeconds > 0) {
    session.timeRemaining = Math.max(0, (session.timeRemaining ?? 3600) - elapsedSeconds);
    session.timerLastSyncedAt = now;

    if (session.timeRemaining <= 0) {
      session.status = 'completed';
      session.endedAt = now;
    }
  }
}

export default Session;
