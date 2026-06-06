import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CollegeRequest from '@/models/collegeRequest';
import College from '@/models/college';
import User from '@/models/user';
import { requireAuthorizedUser } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';
import { logger } from '@/lib/logger';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const { errorResponse } = await requireAuthorizedUser(req, { allowedRoles: ['admin'] });
    if (errorResponse) return errorResponse;

    await dbConnect();

    const requests = await CollegeRequest.find({ status: 'pending' })
      .populate('universityId', 'name code')
      .sort({ createdAt: -1 });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('API Error in GET /api/admin/college-requests:', safeErrorResponse(error));
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user: adminUser, errorResponse } = await requireAuthorizedUser(req, { allowedRoles: ['admin'] });
    if (errorResponse) return errorResponse;

    await dbConnect();

    const body = await req.json();
    const { requestId, action, mergeCollegeId, adminNotes } = body;

    if (!requestId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Missing or invalid parameters' }, { status: 400 });
    }

    const request = await CollegeRequest.findById(requestId);
    if (!request) {
      return NextResponse.json({ error: 'College request not found' }, { status: 404 });
    }

    if (request.status !== 'pending') {
      return NextResponse.json({ error: 'Request has already been processed' }, { status: 400 });
    }

    // Find the placeholder college by name and universityId
    const collegePlaceholder = await College.findOne({
      universityId: request.universityId,
      name: request.collegeName,
      isPendingVerification: true
    });

    if (action === 'approve') {
      // Approve: mark request as approved and remove isPendingVerification on College
      request.status = 'approved';
      request.adminNotes = adminNotes || 'Approved by admin.';
      await request.save();

      if (collegePlaceholder) {
        collegePlaceholder.isPendingVerification = false;
        await collegePlaceholder.save();
      }

      logger.info('Admin approved college request', adminUser._id, { requestId, collegeName: request.collegeName });
      return NextResponse.json({ message: 'College request approved successfully' });
    } else {
      // Reject: mark request as rejected. If mergeCollegeId is provided, merge users.
      request.status = 'rejected';
      request.adminNotes = adminNotes || 'Rejected by admin.';
      await request.save();

      if (collegePlaceholder) {
        if (mergeCollegeId && mongoose.Types.ObjectId.isValid(mergeCollegeId)) {
          // Verify merge college exists
          const mergeCollege = await College.findById(mergeCollegeId);
          if (!mergeCollege) {
            return NextResponse.json({ error: 'Target merge college not found' }, { status: 404 });
          }

          // Migrate users who are on the placeholder college
          const updateResult = await User.updateMany(
            { 'profile.collegeId': collegePlaceholder._id },
            { $set: { 'profile.collegeId': mergeCollege._id } }
          );

          // Deactivate/delete the temporary college placeholder
          await College.findByIdAndDelete(collegePlaceholder._id);

          logger.info('Admin rejected and merged college request', adminUser._id, {
            requestId,
            collegeName: request.collegeName,
            mergedTo: mergeCollege.name,
            usersMigrated: updateResult.modifiedCount
          });

          return NextResponse.json({
            message: `College request rejected. Placeholder deleted and ${updateResult.modifiedCount} users merged.`
          });
        } else {
          // No merge ID provided: just delete college placeholder and reject users back to empty/null or keep them
          // Standard reject behavior: let's delete the college placeholder and unset it on users so they re-onboard if needed
          const updateResult = await User.updateMany(
            { 'profile.collegeId': collegePlaceholder._id },
            { $set: { 'profile.collegeId': null, onboardingCompleted: false } }
          );
          await College.findByIdAndDelete(collegePlaceholder._id);

          logger.info('Admin rejected college request and reset users', adminUser._id, {
            requestId,
            collegeName: request.collegeName,
            usersReset: updateResult.modifiedCount
          });

          return NextResponse.json({
            message: `College request rejected. Placeholder deleted and ${updateResult.modifiedCount} users reset.`
          });
        }
      }

      logger.info('Admin rejected college request', adminUser._id, { requestId, collegeName: request.collegeName });
      return NextResponse.json({ message: 'College request rejected successfully' });
    }
  } catch (error) {
    console.error('API Error in PATCH /api/admin/college-requests:', safeErrorResponse(error));
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
