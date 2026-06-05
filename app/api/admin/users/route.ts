import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/user';
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

    // Only allow absolute admins
    if (user.role !== ROLES.ADMIN) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    await dbConnect();

    // Fetch all user accounts, sorting by newest registration first
    const users = await User.find({}).sort({ createdAt: -1 });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('API Error in GET /api/admin/users:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
