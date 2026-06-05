import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAppeal extends Document {
  sessionId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  userId: string; // Firebase UID of the student
  reason: string;
  status: 'pending' | 'resolved' | 'rejected';
  previousScore: number;
  adjustedScore?: number;
  resolvedBy?: string; // Moderator/Admin Firebase UID
  resolutionComment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AppealSchema = new Schema<IAppeal>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
    userId: { type: String, required: true, index: true },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'resolved', 'rejected'],
      default: 'pending',
      index: true
    },
    previousScore: { type: Number, required: true },
    adjustedScore: { type: Number },
    resolvedBy: { type: String },
    resolutionComment: { type: String }
  },
  { timestamps: true }
);

const Appeal: Model<IAppeal> = mongoose.models.Appeal || mongoose.model<IAppeal>('Appeal', AppealSchema);
export default Appeal;
