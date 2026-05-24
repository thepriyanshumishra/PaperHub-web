import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Subject from '@/models/subject';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { subjectId: string } }) {
  try {
    await dbConnect();
    const { subjectId } = params;

    if (!subjectId) {
      return NextResponse.json({ error: 'Missing subjectId parameter' }, { status: 400 });
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    return NextResponse.json({ subject });
  } catch (error) {
    console.error(`API Error in /api/subjects/${params.subjectId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
