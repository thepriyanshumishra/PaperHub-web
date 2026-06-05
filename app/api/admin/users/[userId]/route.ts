import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/user';
import AuditLog from '@/models/auditLog';
import { getAuthenticatedUser } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';
import { ROLES, hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: User profile mismatch' }, { status: 401 });
    }

    if (user.role !== ROLES.ADMIN) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { userId } = params;
    
    // Prevent admin self-modification to ensure at least one active admin
    if (userId === user._id) {
      return NextResponse.json({ error: 'Security safety: Cannot modify your own role or status.' }, { status: 400 });
    }

    const body = await req.json();
    const { role, accountStatus, reason } = body;

    await dbConnect();

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const previousRole = targetUser.role;
    const previousStatus = targetUser.accountStatus;
    let loggedAction: 'role_change' | 'suspend' | 'ban' | 'reactivate' | null = null;
    let auditDetails = reason || '';

    // Apply role change
    if (role !== undefined) {
      if (!['student', 'verifier', 'moderator', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role value' }, { status: 400 });
      }
      if (role !== previousRole) {
        targetUser.role = role as any;
        loggedAction = 'role_change';
        auditDetails += ` Changed role from ${previousRole} to ${role}.`;
      }
    }

    // Apply status change
    if (accountStatus !== undefined) {
      if (!['active', 'suspended', 'banned'].includes(accountStatus)) {
        return NextResponse.json({ error: 'Invalid accountStatus value' }, { status: 400 });
      }
      if (accountStatus !== previousStatus) {
        targetUser.accountStatus = accountStatus as any;
        
        if (accountStatus === 'suspended') {
          loggedAction = 'suspend';
        } else if (accountStatus === 'banned') {
          loggedAction = 'ban';
        } else if (accountStatus === 'active') {
          loggedAction = 'reactivate';
        }
        
        auditDetails += ` Changed status from ${previousStatus} to ${accountStatus}.`;
      }
    }

    if (!loggedAction) {
      return NextResponse.json({ message: 'No modifications made', user: targetUser });
    }

    await targetUser.save();

    // Log the curation event
    await AuditLog.create({
      userId: user._id,
      action: loggedAction,
      targetType: 'user',
      targetId: userId,
      previousState: JSON.stringify({ role: previousRole, accountStatus: previousStatus }),
      newState: JSON.stringify({ role: targetUser.role, accountStatus: targetUser.accountStatus }),
      details: auditDetails.trim(),
      timestamp: new Date()
    });

    return NextResponse.json({ user: targetUser });
  } catch (error) {
    console.error(`API Error in PATCH /api/admin/users/${params.userId}:`, error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
