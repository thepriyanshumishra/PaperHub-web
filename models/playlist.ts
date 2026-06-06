import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPlaylist extends Document {
  name: string;
  description?: string;
  type: 'bookmark' | 'note';
  userId: string;
  subjectId: mongoose.Types.ObjectId;
  questions: mongoose.Types.ObjectId[];
  isPrivate: boolean;
  icon: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const PlaylistSchema = new Schema<IPlaylist>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: { type: String, enum: ['bookmark', 'note'], default: 'bookmark', required: true },
    userId: { type: String, required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    isPrivate: { type: Boolean, default: true },
    icon: { type: String, default: 'bookmark' },
    color: { type: String, default: 'purple' },
  },
  { timestamps: true }
);

// Compound indexes for fast retrieval
PlaylistSchema.index({ userId: 1, type: 1 });
PlaylistSchema.index({ userId: 1, subjectId: 1, type: 1 });

const Playlist: Model<IPlaylist> = mongoose.models.Playlist || mongoose.model<IPlaylist>('Playlist', PlaylistSchema);
export default Playlist;
