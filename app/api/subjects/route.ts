import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import College from '@/models/college';
import Course from '@/models/course';
import Branch from '@/models/branch';
import Subject from '@/models/subject';
import { safeErrorResponse } from '@/lib/promptSafety';
import { getOrSetCache } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const collegeCode = searchParams.get('collegeCode');
    const branchCode = searchParams.get('branchCode');
    const semesterStr = searchParams.get('semester');

    if (!collegeCode || !branchCode) {
      return NextResponse.json({ error: 'Missing required parameters: collegeCode, branchCode' }, { status: 400 });
    }

    const cacheKey = `paperhub:v1:subjects:${collegeCode.toUpperCase()}:${branchCode.toUpperCase()}:${semesterStr || 'all'}`;

    const result = await getOrSetCache(cacheKey, async () => {
      await dbConnect();

      // Find the college
      const college = await College.findOne({ code: collegeCode.toUpperCase() });
      if (!college) {
        throw new Error('College not found');
      }

      // Find the courses under this college's university
      const courses = await Course.find({ universityId: college.universityId });
      const courseIds = courses.map(c => c._id);

      // Find the branch under these courses
      const branch = await Branch.findOne({ courseId: { $in: courseIds }, code: branchCode.toUpperCase() });
      if (!branch) {
        throw new Error('Branch not found for this university course');
      }

      const query: Record<string, unknown> = { branchIds: branch._id };

      if (semesterStr) {
        const semester = parseInt(semesterStr, 10);
        if (isNaN(semester)) {
          throw new Error('Invalid semester parameter');
        }
        query.semester = semester;
      }

      // Find all subjects mapped to this branch (and optionally semester)
      const subjects = await Subject.find(query).sort({ name: 1 });

      return { subjects };
    }, 30 * 24 * 60 * 60); // 30 days long-term cache

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API Error in /api/subjects:', error);
    
    // Graceful error responses for expected throws
    if (error.message === 'College not found') {
      return NextResponse.json({ error: 'College not found' }, { status: 404 });
    }
    if (error.message === 'Branch not found for this university course') {
      return NextResponse.json({ error: 'Branch not found for this university course' }, { status: 404 });
    }
    if (error.message === 'Invalid semester parameter') {
      return NextResponse.json({ error: 'Invalid semester parameter' }, { status: 400 });
    }

    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}

