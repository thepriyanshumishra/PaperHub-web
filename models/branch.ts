import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBranch extends Document {
  courseId: mongoose.Types.ObjectId; // Reference to Course
  name: string;
  code: string;                      // e.g. "CSE", "IT"
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema = new Schema<IBranch>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    name: { type: String, required: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Unique compound index so branches are unique per course
BranchSchema.index({ courseId: 1, code: 1 }, { unique: true });

const Branch: Model<IBranch> = mongoose.models.Branch || mongoose.model<IBranch>('Branch', BranchSchema);
export default Branch;
