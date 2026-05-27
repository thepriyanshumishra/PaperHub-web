import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import College from '@/models/college';
import Branch from '@/models/branch';
import Subject from '@/models/subject';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const collegeCode = searchParams.get('collegeCode');
    const branchCode = searchParams.get('branchCode');
    const semesterStr = searchParams.get('semester');

    if (!collegeCode || !branchCode) {
      return NextResponse.json({ error: 'Missing required parameters: collegeCode, branchCode' }, { status: 400 });
    }

    // Find the college
    const college = await College.findOne({ code: collegeCode.toUpperCase() });
    if (!college) {
      return NextResponse.json({ error: 'College not found' }, { status: 404 });
    }

    // Find the branch under this college
    const branch = await Branch.findOne({ collegeId: college._id, code: branchCode.toUpperCase() });
    if (!branch) {
      return NextResponse.json({ error: 'Branch not found for this college' }, { status: 404 });
    }

    const query: Record<string, unknown> = { branchIds: branch._id };

    if (semesterStr) {
      const semester = parseInt(semesterStr, 10);
      if (isNaN(semester)) {
        return NextResponse.json({ error: 'Invalid semester parameter' }, { status: 400 });
      }
      query.semester = semester;
    }

    // Find all subjects mapped to this branch (and optionally semester)
    const subjects = await Subject.find(query).sort({ name: 1 });

    return NextResponse.json({ subjects });
  } catch (error) {
    console.error('API Error in /api/subjects:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
