import dbConnect from './db';
import AuditLog from '@/models/auditLog';

export async function logSystemEvent(params: {
  action: string;
  userId?: string;
  category: 'auth' | 'upload' | 'ocr' | 'ai_eval' | 'onboarding' | 'error' | 'moderation' | 'general';
  details?: string;
  metadata?: Record<string, any>;
}) {
  try {
    await dbConnect();
    await AuditLog.create({
      userId: params.userId,
      action: params.action,
      category: params.category,
      details: params.details,
      metadata: params.metadata || {},
    });
  } catch (error) {
    console.error('Failed to write database audit log:', error);
  }
}
