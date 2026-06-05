import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INote extends Document {
  userId: string;         // Reference to User._id (Firebase UID)
  questionId: string;     // Reference to Question._id (represented as a string)
  noteText: string;       // Markdown note text
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    userId: { type: String, required: true },
    questionId: { type: String, required: true },
    noteText: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

// Enforce unique note per user per question
NoteSchema.index({ userId: 1, questionId: 1 }, { unique: true });
NoteSchema.index({ userId: 1, updatedAt: -1 });

const Note: Model<INote> = mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);
export default Note;
