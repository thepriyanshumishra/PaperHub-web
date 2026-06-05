import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUniversity extends Document {
  name: string;
  code: string; // e.g. "AKTU", "MMMUT"
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UniversitySchema = new Schema<IUniversity>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const University: Model<IUniversity> = mongoose.models.University || mongoose.model<IUniversity>('University', UniversitySchema);
export default University;
