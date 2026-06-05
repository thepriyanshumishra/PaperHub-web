import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AuditLog from '@/models/auditLog';
import { getAuthenticatedUser } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';
import { ROLES, hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: User profile mismatch' }, { status: 401 });
    }

    if (!hasPermission(user.role, ROLES.VERIFIER)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const targetType = searchParams.get('targetType');
    const actorId = searchParams.get('actorId');

    await dbConnect();

    const query: any = {};

    if (action) {
      query.action = action;
    }
    if (targetType) {
      query.targetType = targetType;
    }
    if (actorId) {
      query.userId = actorId;
    }

    // Retrieve and populate the actor user profile
    const logs = await AuditLog.find(query)
      .populate({ path: 'userId', select: 'displayName email role' })
      .sort({ timestamp: -1 })
      .limit(100);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('API Error in GET /api/staff/audit-logs:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
