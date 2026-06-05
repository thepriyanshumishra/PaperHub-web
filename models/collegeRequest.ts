import mongoose, { Schema, Model } from 'mongoose';

export interface ICollegeRequest {
  userId: string;
  userEmail: string;
  universityId: mongoose.Types.ObjectId;
  collegeName: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CollegeRequestSchema = new Schema<ICollegeRequest>(
  {
    userId: { type: String, required: true },
    userEmail: { type: String, required: true },
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    collegeName: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    adminNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

const CollegeRequest: Model<ICollegeRequest> = mongoose.models.CollegeRequest || mongoose.model<ICollegeRequest>('CollegeRequest', CollegeRequestSchema);
export default CollegeRequest;
