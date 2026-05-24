import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import College from '@/models/college';
import Branch from '@/models/branch';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const step = searchParams.get('step');

    if (step === 'colleges') {
      const colleges = await College.find({}).sort({ name: 1 });
      return NextResponse.json({ colleges });
    }

    if (step === 'branches') {
      const collegeCode = searchParams.get('collegeCode');
      if (!collegeCode) {
        return NextResponse.json({ error: 'Missing collegeCode parameter' }, { status: 400 });
      }

      const college = await College.findOne({ code: collegeCode.toUpperCase() });
      if (!college) {
        return NextResponse.json({ error: 'College not found' }, { status: 404 });
      }

      const branches = await Branch.find({ collegeId: college._id }).sort({ name: 1 });
      return NextResponse.json({ branches });
    }

    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
  } catch (error) {
    console.error('API Error in /api/onboarding:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
