import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/user';
import Subject from '@/models/subject';
import Question from '@/models/question';
import Playlist from '@/models/playlist';
import { requireAuthorizedUser } from '@/lib/verifyAuth';
import { safeErrorResponse, sanitizeText } from '@/lib/promptSafety';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthorizedUser(req);
    if (errorResponse) return errorResponse;

    const type = 'bookmark';

    // 1. Fetch user's semester subjects based on profile
    const subjectQuery: Record<string, any> = {};
    if (user.profile?.branchId) {
      subjectQuery.branchIds = user.profile.branchId;
    }
    if (user.profile?.semester) {
      subjectQuery.semester = user.profile.semester;
    }
    const subjects = await Subject.find(subjectQuery).sort({ name: 1 }).lean();

    // 2. Fetch playlists of this type for the user
    let playlists = await Playlist.find({ userId: user._id, type })
      .populate('questions')
      .lean();

    // 3. Seed default playlists for subjects if none exist in the system
    const seededPlaylists: any[] = [];
    const subjectsToSeed = subjects.filter(
      subj => !playlists.some(pl => String(pl.subjectId) === String(subj._id))
    );

    if (subjectsToSeed.length > 0) {
      // Find user flat bookmarks if type is bookmark
      let userBookmarks: string[] = [];
      if (type === 'bookmark') {
        userBookmarks = user.bookmarks || [];
      }

      for (const subj of subjectsToSeed) {
        const subjectIdStr = String(subj._id);

        if (type === 'bookmark') {
          // Find questions under this subject that are bookmarked
          const subjBookmarkedQuestions = await Question.find({
            _id: { $in: userBookmarks },
            subjectId: subj._id
          }).select('_id').lean();
          
          const bookmarkedIds = subjBookmarkedQuestions.map(q => q._id);

          const defaultPlaylistsData = [
            {
              name: 'Last Time Revision Needed',
              description: 'Urgent topics to revise before exam',
              icon: 'clock',
              color: 'purple',
              questions: []
            },
            {
              name: 'Do One More Time',
              description: 'Requires another round of practice',
              icon: 'refresh-cw',
              color: 'blue',
              questions: []
            },
            {
              name: 'Important For Exams',
              description: 'Highly repeating past year questions',
              icon: 'star',
              color: 'yellow',
              // Put existing bookmarks here by default
              questions: bookmarkedIds
            },
            {
              name: 'Weak Topics',
              description: 'Practice questions from challenging units',
              icon: 'bookmark',
              color: 'green',
              questions: []
            }
          ];

          for (const item of defaultPlaylistsData) {
            const pl = await Playlist.create({
              name: item.name,
              description: item.description,
              type: 'bookmark',
              userId: user._id,
              subjectId: subj._id,
              questions: item.questions,
              isPrivate: true,
              icon: item.icon,
              color: item.color
            });
            seededPlaylists.push(pl);
          }
        }
      }

      // Re-fetch playlists if seeded
      if (seededPlaylists.length > 0) {
        playlists = await Playlist.find({ userId: user._id, type })
          .populate('questions')
          .lean();
      }
    }

    // Format subjects to include count of playlists belonging to each subject
    const subjectsWithPlaylistCount = subjects.map(subj => {
      const count = playlists.filter(pl => String(pl.subjectId) === String(subj._id)).length;
      return {
        ...subj,
        playlistCount: count
      };
    });

    return NextResponse.json({
      subjects: subjectsWithPlaylistCount,
      playlists
    });
  } catch (error) {
    console.error('API Error in GET /api/playlists:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuthorizedUser(req);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { name, description, type, subjectId, icon, color } = body;

    if (!name || !type || !subjectId) {
      return NextResponse.json({ error: 'Missing required fields: name, type, subjectId' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return NextResponse.json({ error: 'Invalid subject ID' }, { status: 400 });
    }

    const newPlaylist = await Playlist.create({
      name: sanitizeText(name, 100),
      description: description ? sanitizeText(description, 500) : '',
      type,
      userId: user._id,
      subjectId,
      questions: [],
      isPrivate: true,
      icon: icon || 'bookmark',
      color: color || 'purple'
    });

    return NextResponse.json({ playlist: newPlaylist, message: 'Created successfully!' }, { status: 201 });
  } catch (error) {
    console.error('API Error in POST /api/playlists:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
