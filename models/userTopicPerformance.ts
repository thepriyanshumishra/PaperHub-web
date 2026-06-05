import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserTopicPerformance extends Document {
  userId: string; // Firebase UID
  subjectId: mongoose.Types.ObjectId;
  unit: number;
  topic: string;
  attempted: number;
  correct: number;
  totalScore: number; // Sum of percentage scores (0 to 100)
  createdAt: Date;
  updatedAt: Date;
}

const UserTopicPerformanceSchema = new Schema<IUserTopicPerformance>(
  {
    userId: { type: String, required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    unit: { type: Number, required: true },
    topic: { type: String, required: true, trim: true },
    attempted: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Enforce unique topic records per user per subject
UserTopicPerformanceSchema.index({ userId: 1, subjectId: 1, topic: 1 }, { unique: true });

const UserTopicPerformance: Model<IUserTopicPerformance> =
  mongoose.models.UserTopicPerformance ||
  mongoose.model<IUserTopicPerformance>('UserTopicPerformance', UserTopicPerformanceSchema);

export default UserTopicPerformance;
