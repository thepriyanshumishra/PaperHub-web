import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/verifyAuth';
import { ROLES, hasPermission } from '@/lib/permissions';
import { DocumentBatch, UploadedDocument } from '@/models/uploadedDocument';
import { safeErrorResponse } from '@/lib/promptSafety';

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
    const batchId = searchParams.get('batchId');

    await dbConnect();

    if (batchId) {
      // Find a specific batch and its associated documents
      const batch = await DocumentBatch.findById(batchId);
      if (!batch) {
        return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
      }

      const documents = await UploadedDocument.find({ batchId }).sort({ createdAt: 1 });
      return NextResponse.json({ batch, documents });
    }

    // List all batches
    const batches = await DocumentBatch.find().sort({ createdAt: -1 }).limit(50);
    return NextResponse.json({ batches });

  } catch (error) {
    console.error('API Error in GET /api/verifier/batches:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
