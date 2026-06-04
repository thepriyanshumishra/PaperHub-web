import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Session from '@/models/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    await dbConnect();
    const { sessionId } = params;

    const session = await Session.findById(sessionId).populate('questions');
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error(`API Error in GET /api/sessions/${params.sessionId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    await dbConnect();
    const { sessionId } = params;
    const body = await req.json();

    const session = await Session.findById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { currentQuestionIndex, history, testAnalytics, status, evaluationMethod, testResponses, uploadedImages, evaluationResult } = body;

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

      const maxPhotos = Math.min(30, Math.max(1, session.questions.length) * 3);
      if (uploadedImages.length > maxPhotos) {
        return NextResponse.json({ 
          error: `Too many images: For this ${session.questions.length}-question test, you can upload at most ${maxPhotos} pages (3 pages per question, capped at 30 pages).` 
        }, { status: 400 });
      }

      const base64ImageRegex = /^data:image\/(jpeg|jpg|png|webp);base64,/i;
      const MAX_BASE64_LENGTH = 14500000; // ~10MB (binary size is roughly length * 0.75)

      for (let i = 0; i < uploadedImages.length; i++) {
        const img = uploadedImages[i];
        if (typeof img !== 'string') {
          return NextResponse.json({ error: `Invalid image at index ${i}: Must be a base64 string` }, { status: 400 });
        }

        // Validate MIME type structure
        if (!base64ImageRegex.test(img)) {
          return NextResponse.json({ 
            error: `Invalid file type at index ${i}. Only JPEG, PNG, and WEBP image formats are supported.` 
          }, { status: 400 });
        }

        // Validate file size limit (10MB)
        if (img.length > MAX_BASE64_LENGTH) {
          return NextResponse.json({ 
            error: `File size too large at index ${i}. Uploaded images must be smaller than 10MB each.` 
          }, { status: 400 });
        }
      }

      session.uploadedImages = uploadedImages;
    }
    
    if (evaluationResult !== undefined) {
      session.evaluationResult = evaluationResult;
    }
    
    if (status !== undefined) {
      session.status = status;
      if (status === 'completed') {
        session.endedAt = new Date();
      }
    }

    await session.save();

    return NextResponse.json({ session });
  } catch (error) {
    console.error(`API Error in PUT /api/sessions/${params.sessionId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
