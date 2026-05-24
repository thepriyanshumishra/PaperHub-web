import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICollege extends Document {
  name: string;
  code: string;
  isActive: boolean;
  logoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CollegeSchema = new Schema<ICollege>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    isActive: { type: Boolean, default: false },
    logoUrl: { type: String },
  },
  { timestamps: true }
);

const College: Model<ICollege> = mongoose.models.College || mongoose.model<ICollege>('College', CollegeSchema);
export default College;
