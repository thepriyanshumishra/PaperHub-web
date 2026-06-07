import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IQuestionReport extends Document {
  questionId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  studentName: string;
  reasons: string[];
  comment?: string;
  status: 'pending' | 'resolved';
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionReportSchema = new Schema<IQuestionReport>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    studentName: { type: String, required: true },
    reasons: [{ type: String, required: true }],
    comment: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'resolved'], default: 'pending' },
    resolvedBy: { type: String },
    resolvedAt: { type: Date }
  },
  { timestamps: true }
);

const QuestionReport: Model<IQuestionReport> = mongoose.models.QuestionReport || mongoose.model<IQuestionReport>('QuestionReport', QuestionReportSchema);
export default QuestionReport;
