import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICourse extends Document {
  universityId: mongoose.Types.ObjectId; // Reference to University
  name: string;                          // e.g. "Bachelor of Technology"
  code: string;                          // e.g. "B.TECH", "MCA", "MBA"
  durationYears: number;                 // e.g. 4, 2
  maxSemesters: number;                  // e.g. 8, 4 (derived from durationYears * 2 or custom)
  isBranchRequired: boolean;             // e.g. true for B.Tech, false for MBA
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    name: { type: String, required: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    durationYears: { type: Number, required: true },
    maxSemesters: { type: Number, required: true },
    isBranchRequired: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Enforce unique course code per university
CourseSchema.index({ universityId: 1, code: 1 }, { unique: true });

const Course: Model<ICourse> = mongoose.models.Course || mongoose.model<ICourse>('Course', CourseSchema);
export default Course;
