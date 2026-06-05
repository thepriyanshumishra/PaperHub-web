import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  questionId?: mongoose.Types.ObjectId; // Optional
  userId?: string; // Optional (e.g. system events won't have userId)
  action: string; // E.g. 'verify', 'flag', 'upload_failure', etc.
  targetType?: string; // Optional
  targetId?: string; // Optional
  previousState?: string;
  newState?: string;
  details?: string;
  category?: 'auth' | 'upload' | 'ocr' | 'ai_eval' | 'onboarding' | 'error' | 'moderation' | 'general';
  metadata?: Record<string, any>; // For tracking savings, error rates, stats
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: false },
    userId: { type: String, ref: 'User', required: false },
    action: { type: String, required: true },
    targetType: { type: String, required: false },
    targetId: { type: String, required: false },
    previousState: { type: String },
    newState: { type: String },
    details: { type: String },
    category: {
      type: String,
      enum: ['auth', 'upload', 'ocr', 'ai_eval', 'onboarding', 'error', 'moderation', 'general'],
      default: 'general'
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now }
  }
);

// Indexes for query performance
AuditLogSchema.index({ category: 1, timestamp: -1 });
AuditLogSchema.index({ targetType: 1, targetId: 1 });
AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ timestamp: -1 });

const AuditLog: Model<IAuditLog> = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
export default AuditLog;
