import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBranch extends Document {
  collegeId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema = new Schema<IBranch>(
  {
    collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true },
    name: { type: String, required: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Unique compound index so branches are unique per college
BranchSchema.index({ collegeId: 1, code: 1 }, { unique: true });

const Branch: Model<IBranch> = mongoose.models.Branch || mongoose.model<IBranch>('Branch', BranchSchema);
export default Branch;
