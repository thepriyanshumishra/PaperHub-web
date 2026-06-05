import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEvaluationMetric extends Document {
  sessionId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  evaluationMode: 'exact_match' | 'numerical' | 'formula' | 'semantic' | 'programming' | 'manual_review';
  confidence: number;
  isEscalated: boolean;
  originalScore: number;
  finalScore: number;
  isOverridden: boolean;
  isAppealed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EvaluationMetricSchema = new Schema<IEvaluationMetric>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
    evaluationMode: {
      type: String,
      enum: ['exact_match', 'numerical', 'formula', 'semantic', 'programming', 'manual_review'],
      required: true,
      index: true
    },
    confidence: { type: Number, required: true },
    isEscalated: { type: Boolean, default: false, index: true },
    originalScore: { type: Number, required: true },
    finalScore: { type: Number, required: true },
    isOverridden: { type: Boolean, default: false, index: true },
    isAppealed: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

const EvaluationMetric: Model<IEvaluationMetric> = mongoose.models.EvaluationMetric || mongoose.model<IEvaluationMetric>('EvaluationMetric', EvaluationMetricSchema);
export default EvaluationMetric;
