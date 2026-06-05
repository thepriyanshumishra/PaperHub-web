import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISearchAnalytics extends Document {
  userId?: string;
  query: string;
  subjectId?: mongoose.Types.ObjectId;
  topic?: string;
  createdAt: Date;
}

const SearchAnalyticsSchema = new Schema<ISearchAnalytics>(
  {
    userId: { type: String, index: true },
    query: { type: String, required: true, trim: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', index: true },
    topic: { type: String, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// Compound index to optimize aggregations for tracking most searched subjects and topics
SearchAnalyticsSchema.index({ subjectId: 1, topic: 1 });
SearchAnalyticsSchema.index({ createdAt: -1 });

const SearchAnalytics: Model<ISearchAnalytics> =
  mongoose.models.SearchAnalytics || mongoose.model<ISearchAnalytics>('SearchAnalytics', SearchAnalyticsSchema);

export default SearchAnalytics;
