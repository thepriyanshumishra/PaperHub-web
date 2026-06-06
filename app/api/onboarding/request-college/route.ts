import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import College from '@/models/college';
import CollegeRequest from '@/models/collegeRequest';
import University from '@/models/university';
import { requireAuthorizedUser } from '@/lib/verifyAuth';
import { sanitizeText, safeErrorResponse } from '@/lib/promptSafety';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthorizedUser(req, { allowPendingOnboarding: true });
    if (errorResponse) return errorResponse;

    await dbConnect();
    const body = await req.json();
    const { universityId, collegeName } = body;

    if (!universityId || !collegeName) {
      return NextResponse.json({ error: 'Missing universityId or collegeName' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(universityId)) {
      return NextResponse.json({ error: 'Invalid universityId format' }, { status: 400 });
    }

    // Check if university exists
    const university = await University.findById(universityId);
    if (!university) {
      return NextResponse.json({ error: 'University not found' }, { status: 404 });
    }

    const cleanCollegeName = sanitizeText(collegeName, 150).trim();
    if (cleanCollegeName.length < 3) {
      return NextResponse.json({ error: 'College name is too short' }, { status: 400 });
    }

    // Check if a college with the same name already exists in this university (case-insensitive)
    const existingCollege = await College.findOne({
      universityId,
      name: { $regex: new RegExp(`^${cleanCollegeName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
    });

    if (existingCollege) {
      return NextResponse.json({
        collegeId: existingCollege._id,
        message: 'College already exists.',
        alreadyExists: true,
      });
    }

    // Generate a temporary unique code
    const tempCode = `TEMP_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Create the College placeholder
    const college = await College.create({
      universityId,
      name: cleanCollegeName,
      code: tempCode,
      isActive: true, // Mark active so they can proceed
      isPendingVerification: true,
    });

    // Log the request
    await CollegeRequest.create({
      userId: user._id,
      userEmail: user.email,
      universityId,
      collegeName: cleanCollegeName,
      status: 'pending',
    });

    logger.info('User requested new college onboarding bypass', user._id, {
      collegeId: college._id,
      collegeName: cleanCollegeName,
    });

    return NextResponse.json({
      collegeId: college._id,
      message: 'College request logged and placeholder created successfully.',
      alreadyExists: false,
    }, { status: 201 });
  } catch (error) {
    console.error('API Error in POST /api/onboarding/request-college:', safeErrorResponse(error));
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
