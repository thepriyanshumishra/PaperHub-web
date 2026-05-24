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

const SessionSchema = new Schema<ISession>(
  {
    userId: { type: String, required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    type: { type: String, enum: ['practice', 'test'], required: true },
    subType: { type: String, enum: ['topic', 'unit', 'syllabus', 'custom'], required: true },
    config: {
      units: [{ type: Number }],
      topics: [{ type: String }],
      questionCount: { type: Number, required: true },
    },
    questions: [{ type: Schema.Types.ObjectId, ref: 'Question', required: true }],
    currentQuestionIndex: { type: Number, default: 0 },
    history: [SessionHistorySchema],
    testAnalytics: { type: SessionTestAnalyticsSchema, default: () => ({}) },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
  },
  { timestamps: true }
);

const Session: Model<ISession> = mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);
export default Session;
