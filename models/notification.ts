import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotification extends Document {
  userId: string; // Firebase UID
  title: string;
  message: string;
  type: 'goal' | 'streak' | 'leaderboard' | 'account' | 'moderation';
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['goal', 'streak', 'leaderboard', 'account', 'moderation'],
      required: true
    },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Indexes for fast querying of unread user alerts
NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
