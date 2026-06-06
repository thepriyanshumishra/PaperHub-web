import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/user';
import Playlist from '@/models/playlist';
import { requireAuthorizedUser } from '@/lib/verifyAuth';
import { safeErrorResponse, sanitizeText } from '@/lib/promptSafety';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> }
) {
  try {
    const { user, errorResponse } = await requireAuthorizedUser(req);
    if (errorResponse) return errorResponse;

    const { playlistId } = await params;
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
      return NextResponse.json({ error: 'Invalid playlist ID' }, { status: 400 });
    }

    const playlist = await Playlist.findOne({ _id: playlistId, userId: user._id });
    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found or access denied' }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, isPrivate, icon, color, questions, questionId, action } = body;

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = sanitizeText(name, 100);
    if (description !== undefined) updateData.description = sanitizeText(description, 500);
    if (isPrivate !== undefined) updateData.isPrivate = !!isPrivate;
    if (icon !== undefined) updateData.icon = sanitizeText(icon, 50);
    if (color !== undefined) updateData.color = sanitizeText(color, 50);

    // Apply main field updates
    if (Object.keys(updateData).length > 0) {
      await Playlist.findByIdAndUpdate(playlistId, { $set: updateData });
    }

    // Handle question array updates
    if (questions !== undefined && Array.isArray(questions)) {
      const validIds = questions.filter(id => mongoose.Types.ObjectId.isValid(id));
      await Playlist.findByIdAndUpdate(playlistId, { $set: { questions: validIds } });
    } else if (questionId && mongoose.Types.ObjectId.isValid(questionId) && action) {
      if (action === 'add') {
        await Playlist.findByIdAndUpdate(playlistId, { $addToSet: { questions: new mongoose.Types.ObjectId(questionId) } });
      } else if (action === 'remove') {
        await Playlist.findByIdAndUpdate(playlistId, { $pull: { questions: new mongoose.Types.ObjectId(questionId) } });
      }
    }

    const updatedPlaylist = await Playlist.findById(playlistId).populate('questions').lean();
    return NextResponse.json({ playlist: updatedPlaylist, message: 'Updated successfully.' });
  } catch (error) {
    console.error('API Error in PUT /api/playlists/[playlistId]:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> }
) {
  try {
    const { user, errorResponse } = await requireAuthorizedUser(req);
    if (errorResponse) return errorResponse;

    const { playlistId } = await params;
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
      return NextResponse.json({ error: 'Invalid playlist ID' }, { status: 400 });
    }

    const result = await Playlist.deleteOne({ _id: playlistId, userId: user._id });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Playlist not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Playlist deleted successfully.' });
  } catch (error) {
    console.error('API Error in DELETE /api/playlists/[playlistId]:', error);
    return NextResponse.json({ error: safeErrorResponse(error) }, { status: 500 });
  }
}
