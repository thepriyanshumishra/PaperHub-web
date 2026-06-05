import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICollege extends Document {
  universityId: mongoose.Types.ObjectId; // Reference to University board
  name: string;
  code: string;
  isActive: boolean;
  logoUrl?: string;
  isPendingVerification?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CollegeSchema = new Schema<ICollege>(
  {
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    isActive: { type: Boolean, default: false },
    logoUrl: { type: String },
    isPendingVerification: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const College: Model<ICollege> = mongoose.models.College || mongoose.model<ICollege>('College', CollegeSchema);
export default College;
