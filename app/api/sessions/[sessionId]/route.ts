import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Session, { syncSessionTimer } from '@/models/session';
import User from '@/models/user';
import { requireAuthorizedUser } from '@/lib/verifyAuth';
import { safeErrorResponse } from '@/lib/promptSafety';
import { validateUpload } from '@/lib/uploadValidator';
import { logSystemEvent } from '@/lib/auditLogger';

// V5: Maximum allowed image payload size constants
const MAX_IMAGES_PER_SESSION = 30;
const MAX_IMAGE_BASE64_LENGTH = 14_000_000; // ~10MB binary (base64 ≈ 133% of binary size)

export const dynamic = 'force-dynamic';

function determineLeague(xp: number): 'beginner' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'elite' {
  if (xp >= 5000) return 'elite';
  if (xp >= 2000) return 'diamond';
  if (xp >= 1000) return 'gold';
  if (xp >= 500) return 'silver';
  if (xp >= 200) return 'bronze';
  return 'beginner';
}

export async function GET(req: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const { user, errorResponse } = await requireAuthorizedUser(req);
    if (errorResponse) return errorResponse;

    await dbConnect();
    const { sessionId } = params;

    const session = await Session.findById(sessionId).populate('questions');
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Enforce ownership: users may only read their own sessions
    if (session.userId !== user._id) {
      return NextResponse.json({ error: 'Forbidden: You do not own this session' }, { status: 403 });
    }

    // Server authoritative timer sync
    if (session.isExamMode && session.status === 'active') {
      syncSessionTimer(session);
      await session.save();
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error(`API Error in GET /api/sessions/${params.sessionId}:`, safeErrorResponse(error));
    return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const { user, errorResponse } = await requireAuthorizedUser(req);
    if (errorResponse) return errorResponse;

    await dbConnect();
    const { sessionId } = params;
    const body = await req.json();

    const session = await Session.findById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Enforce ownership: users may only update their own sessions
    if (session.userId !== user._id) {
      return NextResponse.json({ error: 'Forbidden: You do not own this session' }, { status: 403 });
    }

    // Server authoritative timer sync
    if (session.isExamMode && session.status === 'active') {
      syncSessionTimer(session);
      if ((session.status as string) === 'completed') {
        await session.save();
        return NextResponse.json({ session, timeExpired: true });
      }
    }

    // evaluationResult is intentionally excluded from the writable fields here.
    // It must only be written by POST /api/ai/evaluate, which enforces auth +
    // ownership + session state checks. Allowing direct writes here would let
    // any authenticated user set arbitrary grades on their own session.
    const { currentQuestionIndex, history, testAnalytics, status, evaluationMethod, testResponses, uploadedImages } = body;

    if (currentQuestionIndex !== undefined) {
      session.currentQuestionIndex = currentQuestionIndex;
    }
    
    if (history !== undefined) {
      session.history = history;
    }
    
    if (testAnalytics !== undefined) {
      session.testAnalytics = {
        tabSwitches: testAnalytics.tabSwitches !== undefined ? testAnalytics.tabSwitches : session.testAnalytics.tabSwitches,
        focusLosses: testAnalytics.focusLosses !== undefined ? testAnalytics.focusLosses : session.testAnalytics.focusLosses,
        fullscreenExits: testAnalytics.fullscreenExits !== undefined ? testAnalytics.fullscreenExits : session.testAnalytics.fullscreenExits
      };
    }
    
    if (evaluationMethod !== undefined) {
      session.evaluationMethod = evaluationMethod;
    }
    
    if (testResponses !== undefined) {
      session.testResponses = testResponses;
    }
    
    if (uploadedImages !== undefined) {
      if (!Array.isArray(uploadedImages)) {
        return NextResponse.json({ error: 'Invalid payload: uploadedImages must be an array' }, { status: 400 });
      }

      // V5: Count check BEFORE iterating over image contents.
      // This rejects over-count requests before any base64 data is processed.
      const maxPhotos = Math.min(MAX_IMAGES_PER_SESSION, Math.max(1, session.questions.length) * 3);
      if (uploadedImages.length > maxPhotos) {
        return NextResponse.json({ 
          error: `Too many images: For this ${session.questions.length}-question test, you can upload at most ${maxPhotos} pages (3 pages per question, capped at 30 pages).` 
        }, { status: 400 });
      }

      const base64ImageRegex = /^data:image\/(jpeg|jpg|png|webp);base64,/i;

      for (let i = 0; i < uploadedImages.length; i++) {
        const img = uploadedImages[i];

        // Type check first — prevent processing non-string values
        if (typeof img !== 'string') {
          return NextResponse.json({ error: `Invalid image at index ${i}: Must be a base64 string` }, { status: 400 });
        }

        // V5: Size check BEFORE any other processing.
        // Each image is checked immediately after its type is confirmed.
        // This prevents memory pressure from holding large strings while
        // iterating through the rest of the array.
        if (img.length > MAX_IMAGE_BASE64_LENGTH) {
          return NextResponse.json({ 
            error: `File size too large at index ${i}. Uploaded images must be smaller than 10MB each.` 
          }, { status: 400 });
        }

        // Validate MIME type structure
        if (!base64ImageRegex.test(img)) {
          return NextResponse.json({ 
            error: `Invalid file type at index ${i}. Only JPEG, PNG, and WEBP image formats are supported.` 
          }, { status: 400 });
        }

        // Decode base64 and verify binary magic bytes signature
        try {
          const mimeMatch = img.match(/^data:(image\/[a-z]+);base64,/i);
          const claimedMime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
          const ext = claimedMime.split('/')[1] === 'jpeg' ? 'jpg' : (claimedMime.split('/')[1] || 'jpg');
          const base64Data = img.replace(/^data:image\/[a-z]+;base64,/i, '');
          const imgBuffer = Buffer.from(base64Data, 'base64');

          const validation = validateUpload(imgBuffer, `file.${ext}`, claimedMime, 'image');
          if (!validation.isValid) {
            await logSystemEvent({
              action: 'upload_failure',
              userId: user._id,
              category: 'upload',
              details: `Session image at index ${i} failed signature check: ${validation.error}`,
            });
            return NextResponse.json({ 
              error: `Malformed image or invalid signature at index ${i}: ${validation.error}` 
            }, { status: 400 });
          }
        } catch (err) {
          return NextResponse.json({ error: `Failed to decode base64 image at index ${i}` }, { status: 400 });
        }
      }

      session.uploadedImages = uploadedImages;
    }
    
    if (status !== undefined) {
      const oldStatus = session.status;
      session.status = status;
      if (status === 'completed') {
        session.endedAt = new Date();
        
        if (oldStatus !== 'completed') {
          const dbUser = await User.findById(user._id);
          if (dbUser) {
            dbUser.engagement.sessionsCompleted += 1;
            if (session.type === 'practice') {
              dbUser.engagement.totalXp += 50; // +50 XP for completing a practice session
              dbUser.engagement.league = determineLeague(dbUser.engagement.totalXp);
            }
            await dbUser.save();
          }
        }
      }
    }

    await session.save();

    return NextResponse.json({ session });
  } catch (error) {
    console.error(`API Error in PUT /api/sessions/${params.sessionId}:`, safeErrorResponse(error));
    return NextResponse.json({ error: 'An internal error occurred. Please try again.' }, { status: 500 });
  }
}
