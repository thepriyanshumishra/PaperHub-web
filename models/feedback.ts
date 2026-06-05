import mongoose, { Schema, Model } from 'mongoose';

export interface IFeedback {
  userId: string;
  userEmail: string;
  category: 'bug' | 'feature_request' | 'content_quality' | 'ui_ux' | 'performance' | 'other';
  title: string;
  description: string;
  page: string;
  status: 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  adminNotes: string;
  resolvedBy: string;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    userId: { type: String, required: true, index: true },
    userEmail: { type: String, required: true },
    category: {
      type: String,
      enum: ['bug', 'feature_request', 'content_quality', 'ui_ux', 'performance', 'other'],
      required: true,
    },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 2000 },
    page: { type: String, default: '/' },
    status: {
      type: String,
      enum: ['open', 'acknowledged', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    adminNotes: { type: String, default: '' },
    resolvedBy: { type: String, default: '' },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

FeedbackSchema.index({ status: 1, priority: -1 });
FeedbackSchema.index({ category: 1 });
FeedbackSchema.index({ createdAt: -1 });

const Feedback: Model<IFeedback> = mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', FeedbackSchema);
export default Feedback;
