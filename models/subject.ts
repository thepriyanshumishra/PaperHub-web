import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISyllabusUnit {
  unitNumber: number;
  unitTitle: string;
  topics: string[];
}

export interface ISubject extends Document {
  branchIds: mongoose.Types.ObjectId[];
  semester: number;
  name: string;
  code: string;
  syllabus: ISyllabusUnit[];
  createdAt: Date;
  updatedAt: Date;
}

const SyllabusUnitSchema = new Schema<ISyllabusUnit>({
  unitNumber: { type: Number, required: true },
  unitTitle: { type: String, required: true },
  topics: [{ type: String }],
});

const SubjectSchema = new Schema<ISubject>(
  {
    branchIds: [{ type: Schema.Types.ObjectId, ref: 'Branch', required: true }],
    semester: { type: Number, required: true },
    name: { type: String, required: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    syllabus: [SyllabusUnitSchema],
  },
  { timestamps: true }
);

SubjectSchema.index({ code: 1 });
SubjectSchema.index({ semester: 1 });

const Subject: Model<ISubject> = mongoose.models.Subject || mongoose.model<ISubject>('Subject', SubjectSchema);
export default Subject;
