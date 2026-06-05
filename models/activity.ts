import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IActivity extends Document {
  userId: string; // Firebase UID
  type: 'practice_completed' | 'test_completed' | 'daily_goal_achieved' | 'streak_milestone' | 'league_promotion';
  metadata: Record<string, any>;
  createdAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['practice_completed', 'test_completed', 'daily_goal_achieved', 'streak_milestone', 'league_promotion'],
      required: true
    },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: { createdAt: true, updatedAt: false } // Only record creation time
  }
);

// Index to fetch student activity feed sorted by date
ActivitySchema.index({ userId: 1, createdAt: -1 });

const Activity: Model<IActivity> =
  mongoose.models.Activity || mongoose.model<IActivity>('Activity', ActivitySchema);

export default Activity;
