import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import University from '@/models/university';
import College from '@/models/college';
import Course from '@/models/course';
import Branch from '@/models/branch';
import { safeErrorResponse } from '@/lib/promptSafety';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const step = searchParams.get('step');

    if (step === 'universities') {
      const universities = await University.find({ isActive: true }).sort({ name: 1 });
      return NextResponse.json({ universities });
    }

    if (step === 'colleges') {
      const universityId = searchParams.get('universityId');
      if (!universityId || !mongoose.Types.ObjectId.isValid(universityId)) {
        return NextResponse.json({ error: 'Missing or invalid universityId parameter' }, { status: 400 });
      }
      const colleges = await College.find({ universityId, isActive: true }).sort({ name: 1 });
      return NextResponse.json({ colleges });
    }

    if (step === 'courses') {
      const universityId = searchParams.get('universityId');
      if (!universityId || !mongoose.Types.ObjectId.isValid(universityId)) {
        return NextResponse.json({ error: 'Missing or invalid universityId parameter' }, { status: 400 });
      }
      const courses = await Course.find({ universityId, isActive: true }).sort({ name: 1 });
      return NextResponse.json({ courses });
    }

    if (step === 'branches') {
      const courseId = searchParams.get('courseId');
      if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
        return NextResponse.json({ error: 'Missing or invalid courseId parameter' }, { status: 400 });
      }
      const branches = await Branch.find({ courseId, isActive: true }).sort({ name: 1 });
      return NextResponse.json({ branches });
    }

    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
  } catch (error) {
    console.error('API Error in /api/onboarding:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
