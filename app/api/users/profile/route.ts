import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import User from '@/models/user';
import Note from '@/models/note';
import University from '@/models/university';
import College from '@/models/college';
import Course from '@/models/course';
import Branch from '@/models/branch';
import { verifyFirebaseIdToken } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';

export const dynamic = 'force-dynamic';

// Helper to append legacy fields for backward compatibility with frontend pages
async function populateUserCompat(user: any) {
  const userObj = user.toObject();

  // 1. Fetch user notes and populate personalNotes map
  const notes = await Note.find({ userId: user._id }).lean();
  const personalNotesMap: Record<string, string> = {};
  for (const note of notes) {
    personalNotesMap[note.questionId] = note.noteText;
  }
  userObj.personalNotes = personalNotesMap;

  // 2. Fetch and populate legacy college/branch/course codes for backward compatibility
  if (user.profile) {
    const profileCompat: any = { ...userObj.profile };
    
    const [col, course, branch] = await Promise.all([
      user.profile.collegeId ? College.findById(user.profile.collegeId).lean() : null,
      user.profile.courseId ? Course.findById(user.profile.courseId).lean() : null,
      user.profile.branchId ? Branch.findById(user.profile.branchId).lean() : null,
    ]);

    profileCompat.college = col ? col.code : undefined;
    profileCompat.course = course ? course.code : undefined;
    profileCompat.branch = branch ? branch.code : undefined;

    userObj.profile = profileCompat;
  }

  return userObj;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing Authorization Bearer token' }, { status: 401 });
    }

    const idToken = authHeader.split(' ')[1];
    const verifiedUser = await verifyFirebaseIdToken(idToken);
    if (!verifiedUser) {
      return NextResponse.json({ error: 'Unauthorized: Invalid ID token signature' }, { status: 401 });
    }

    await dbConnect();

    // Query or create default user in MongoDB
    let user = await User.findById(verifiedUser.uid);
    if (!user) {
      try {
        user = await User.create({
          _id: verifiedUser.uid,
          email: verifiedUser.email,
          displayName: verifiedUser.displayName || '',
          photoURL: verifiedUser.photoURL || '',
          role: 'student',
          accountStatus: 'active',
          onboardingCompleted: false,
          profile: {},
          engagement: {
            streakCount: 0,
            totalXp: 0,
            sessionsCompleted: 0,
          },
        });
      } catch (createError: any) {
        if (createError.code === 11000 || createError.message?.includes('E11000') || createError.message?.includes('duplicate key')) {
          user = await User.findById(verifiedUser.uid);
          if (!user) {
            throw createError;
          }
        } else {
          throw createError;
        }
      }
    }

    if (user.accountStatus !== 'active') {
      return NextResponse.json({ error: 'Unauthorized: Account is suspended or banned' }, { status: 403 });
    }

    const userObj = await populateUserCompat(user);
    return NextResponse.json({ user: userObj });
  } catch (error) {
    console.error('API Error in GET /api/users/profile:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing Authorization Bearer token' }, { status: 401 });
    }

    const idToken = authHeader.split(' ')[1];
    const verifiedUser = await verifyFirebaseIdToken(idToken);
    if (!verifiedUser) {
      return NextResponse.json({ error: 'Unauthorized: Invalid ID token signature' }, { status: 401 });
    }

    const body = await req.json();
    const { profile, onboardingCompleted, preferences, engagement, bookmarks, incorrectAttempts, personalNotes, migrationData } = body;

    await dbConnect();

    const user = await User.findById(verifiedUser.uid);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.accountStatus !== 'active') {
      return NextResponse.json({ error: 'Unauthorized: Account is suspended or banned' }, { status: 403 });
    }

    // Enforce strict academic hierarchy validation if onboarding is completed or is being set to completed
    if (onboardingCompleted === true || (onboardingCompleted === undefined && user.onboardingCompleted)) {
      const p = profile || user.profile || {};
      
      if (!p.name || !p.name.trim()) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      }
      if (!p.universityId || !mongoose.Types.ObjectId.isValid(p.universityId)) {
        return NextResponse.json({ error: 'Valid University ID is required' }, { status: 400 });
      }
      if (!p.collegeId || !mongoose.Types.ObjectId.isValid(p.collegeId)) {
        return NextResponse.json({ error: 'Valid College ID is required' }, { status: 400 });
      }
      if (!p.courseId || !mongoose.Types.ObjectId.isValid(p.courseId)) {
        return NextResponse.json({ error: 'Valid Course ID is required' }, { status: 400 });
      }

      // Fetch models to verify existence and relationships
      const [univ, col, course] = await Promise.all([
        University.findById(p.universityId),
        College.findById(p.collegeId),
        Course.findById(p.courseId)
      ]);

      if (!univ || !univ.isActive) {
        return NextResponse.json({ error: 'Selected University is invalid or inactive' }, { status: 400 });
      }
      if (!col || !col.isActive) {
        return NextResponse.json({ error: 'Selected College is invalid or inactive' }, { status: 400 });
      }
      if (String(col.universityId) !== String(univ._id)) {
        return NextResponse.json({ error: 'Selected College is not affiliated with the selected University' }, { status: 400 });
      }
      if (!course || !course.isActive) {
        return NextResponse.json({ error: 'Selected Course is invalid or inactive' }, { status: 400 });
      }
      if (String(course.universityId) !== String(univ._id)) {
        return NextResponse.json({ error: 'Selected Course is not offered by the selected University' }, { status: 400 });
      }

      // Validate Branch requirements
      if (course.isBranchRequired) {
        if (!p.branchId || !mongoose.Types.ObjectId.isValid(p.branchId)) {
          return NextResponse.json({ error: 'Branch is required for this course' }, { status: 400 });
        }
        const branch = await Branch.findById(p.branchId);
        if (!branch || !branch.isActive) {
          return NextResponse.json({ error: 'Selected Branch is invalid or inactive' }, { status: 400 });
        }
        if (String(branch.courseId) !== String(course._id)) {
          return NextResponse.json({ error: 'Selected Branch is not offered under the selected Course' }, { status: 400 });
        }
      }

      // Validate Semester range based on Course
      if (typeof p.semester !== 'number' || p.semester < 1 || p.semester > course.maxSemesters) {
        return NextResponse.json({ error: `Semester must be between 1 and ${course.maxSemesters}` }, { status: 400 });
      }
    }

    // Update User Profile Fields
    if (profile !== undefined) {
      user.profile = {
        name: profile.name !== undefined ? profile.name : user.profile?.name,
        universityId: profile.universityId !== undefined ? profile.universityId : user.profile?.universityId,
        collegeId: profile.collegeId !== undefined ? profile.collegeId : user.profile?.collegeId,
        courseId: profile.courseId !== undefined ? profile.courseId : user.profile?.courseId,
        branchId: profile.branchId !== undefined ? profile.branchId : user.profile?.branchId,
        semester: profile.semester !== undefined ? profile.semester : user.profile?.semester,
      };
    }

    if (onboardingCompleted !== undefined) {
      user.onboardingCompleted = onboardingCompleted;
    }

    if (preferences !== undefined) {
      user.preferences = {
        playSounds: preferences.playSounds !== undefined ? preferences.playSounds : user.preferences.playSounds,
        autoTimer: preferences.autoTimer !== undefined ? preferences.autoTimer : user.preferences.autoTimer,
        delayAnswer: preferences.delayAnswer !== undefined ? preferences.delayAnswer : user.preferences.delayAnswer,
        textSize: preferences.textSize !== undefined ? preferences.textSize : user.preferences.textSize,
        theme: preferences.theme !== undefined ? preferences.theme : user.preferences.theme,
        leaderboardVisible: preferences.leaderboardVisible !== undefined ? preferences.leaderboardVisible : user.preferences.leaderboardVisible,
        goalNotificationsEnabled: preferences.goalNotificationsEnabled !== undefined ? preferences.goalNotificationsEnabled : user.preferences.goalNotificationsEnabled,
        streakNotificationsEnabled: preferences.streakNotificationsEnabled !== undefined ? preferences.streakNotificationsEnabled : user.preferences.streakNotificationsEnabled,
        leaderboardNotificationsEnabled: preferences.leaderboardNotificationsEnabled !== undefined ? preferences.leaderboardNotificationsEnabled : user.preferences.leaderboardNotificationsEnabled,
      };
    }

    if (engagement !== undefined) {
      if (engagement.dailyGoalTarget !== undefined && typeof engagement.dailyGoalTarget === 'number') {
        user.engagement.dailyGoalTarget = engagement.dailyGoalTarget;
      }
    }

    // Secure bookmarks update against bulk manipulation
    if (bookmarks !== undefined) {
      const currentBookmarks = user.bookmarks || [];
      if (Array.isArray(bookmarks)) {
        const newBookmarks = bookmarks.filter(id => typeof id === 'string');
        if (Math.abs(newBookmarks.length - currentBookmarks.length) > 1) {
          const added = newBookmarks.filter(id => !currentBookmarks.includes(id));
          const removed = currentBookmarks.filter(id => !newBookmarks.includes(id));
          if (added.length > 0) {
            user.bookmarks = [...currentBookmarks, added[0]];
          } else if (removed.length > 0) {
            user.bookmarks = currentBookmarks.filter(id => id !== removed[0]);
          }
        } else {
          user.bookmarks = newBookmarks;
        }
      }
    }

    // Secure incorrect attempts against bulk forgery
    if (incorrectAttempts !== undefined) {
      const currentIncorrect = user.incorrectAttempts || [];
      if (Array.isArray(incorrectAttempts)) {
        const newIncorrect = incorrectAttempts.filter(id => typeof id === 'string');
        if (newIncorrect.length > currentIncorrect.length + 1) {
          const newlyAdded = newIncorrect.filter(id => !currentIncorrect.includes(id));
          if (newlyAdded.length > 0) {
            user.incorrectAttempts = [...currentIncorrect, newlyAdded[0]];
          }
        } else {
          user.incorrectAttempts = newIncorrect;
        }
      }
    }

    // Update Personal Notes (write to separate Note collection)
    if (personalNotes !== undefined) {
      for (const [qId, noteText] of Object.entries(personalNotes)) {
        if (typeof noteText === 'string') {
          if (noteText.trim()) {
            await Note.findOneAndUpdate(
              { userId: user._id, questionId: qId },
              { noteText: noteText.trim() },
              { upsert: true, new: true }
            );
          } else {
            await Note.deleteOne({ userId: user._id, questionId: qId });
          }
        }
      }
    }

    // Transaction-safe Guest Data Migration
    if (migrationData) {
      const { bookmarks: guestBookmarks, notes: guestNotes, incorrectAttempts: guestIncorrect } = migrationData;

      const runMigration = async (opts?: { session?: mongoose.ClientSession }) => {
        if (Array.isArray(guestBookmarks) && guestBookmarks.length > 0) {
          const validBookmarks = guestBookmarks.filter(id => typeof id === 'string');
          const currentBookmarks = user.bookmarks || [];
          user.bookmarks = Array.from(new Set([...currentBookmarks, ...validBookmarks]));
        }

        if (Array.isArray(guestIncorrect) && guestIncorrect.length > 0) {
          const validIncorrect = guestIncorrect.filter(id => typeof id === 'string');
          const currentIncorrect = user.incorrectAttempts || [];
          user.incorrectAttempts = Array.from(new Set([...currentIncorrect, ...validIncorrect]));
        }

        if (Array.isArray(guestNotes) && guestNotes.length > 0) {
          for (const noteItem of guestNotes) {
            const { questionId, noteText } = noteItem;
            if (typeof questionId === 'string' && typeof noteText === 'string' && noteText.trim()) {
              await Note.findOneAndUpdate(
                { userId: user._id, questionId },
                { noteText: noteText.trim() },
                { upsert: true, new: true, ...opts }
              );
            }
          }
        }
      };

      try {
        const session = await mongoose.startSession();
        try {
          session.startTransaction();
          await runMigration({ session });
          await session.commitTransaction();
        } catch (txErr) {
          await session.abortTransaction();
          throw txErr;
        } finally {
          session.endSession();
        }
      } catch (err: any) {
        if (err.message?.includes('replica set') || err.message?.includes('transaction') || err.message?.includes('Session')) {
          console.warn('[Profile Sync] Transactions not supported by environment. Falling back to normal execution.');
          await runMigration();
        } else {
          throw err;
        }
      }
    }

    await user.save();

    const userObj = await populateUserCompat(user);
    return NextResponse.json({ user: userObj });
  } catch (error) {
    console.error('API Error in PUT /api/users/profile:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
