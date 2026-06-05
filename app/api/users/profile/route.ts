import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/user';
import { verifyFirebaseIdToken } from '@/lib/verifyAuth';

export const dynamic = 'force-dynamic';

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
      user = await User.create({
        _id: verifiedUser.uid,
        email: verifiedUser.email,
        displayName: verifiedUser.displayName || '',
        photoURL: verifiedUser.photoURL || '',
        role: 'student',
        onboardingCompleted: false,
        profile: {},
        engagement: {
          streakCount: 0,
          totalXp: 0,
          sessionsCompleted: 0,
        },
      });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('API Error in GET /api/users/profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
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
    const { profile, onboardingCompleted, preferences, bookmarks, incorrectAttempts, personalNotes, engagement } = body;

    await dbConnect();

    const user = await User.findById(verifiedUser.uid);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (profile !== undefined) {
      user.profile = {
        name: profile.name !== undefined ? profile.name : user.profile.name,
        college: profile.college !== undefined ? profile.college : user.profile.college,
        course: profile.course !== undefined ? profile.course : user.profile.course,
        branch: profile.branch !== undefined ? profile.branch : user.profile.branch,
        semester: profile.semester !== undefined ? profile.semester : user.profile.semester,
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
      };
    }

    if (bookmarks !== undefined) {
      user.bookmarks = bookmarks;
    }

    if (incorrectAttempts !== undefined) {
      user.incorrectAttempts = incorrectAttempts;
    }

    if (personalNotes !== undefined) {
      user.personalNotes = new Map(Object.entries(personalNotes));
    }

    if (engagement !== undefined) {
      user.engagement = {
        streakCount: engagement.streakCount !== undefined ? engagement.streakCount : user.engagement.streakCount,
        lastActiveDateStr: engagement.lastActiveDateStr !== undefined ? engagement.lastActiveDateStr : user.engagement.lastActiveDateStr,
        totalXp: engagement.totalXp !== undefined ? engagement.totalXp : user.engagement.totalXp,
        sessionsCompleted: engagement.sessionsCompleted !== undefined ? engagement.sessionsCompleted : user.engagement.sessionsCompleted,
        league: engagement.league !== undefined ? engagement.league : user.engagement.league,
        dailyGoalSolved: engagement.dailyGoalSolved !== undefined ? engagement.dailyGoalSolved : user.engagement.dailyGoalSolved,
        dailyGoalTarget: engagement.dailyGoalTarget !== undefined ? engagement.dailyGoalTarget : user.engagement.dailyGoalTarget,
      };
    }

    await user.save();

    return NextResponse.json({ user });
  } catch (error) {
    console.error('API Error in PUT /api/users/profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
