import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Feedback from '@/models/feedback';
import User from '@/models/user';
import { verifyFirebaseIdToken } from '@/lib/verifyAuth';
import { sanitizeText, safeErrorResponse } from '@/lib/promptSafety';
import { sanitizeUserContent, sanitizeUrl } from '@/lib/sanitizer';
import { isRateLimited } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';
import { hasPermission } from '@/lib/permissions';
import { incrementLifetimeUsage } from '@/lib/usageTracker';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const verifiedUser = await verifyFirebaseIdToken(authHeader.split(' ')[1]);
    if (!verifiedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = verifiedUser.uid;

    // Rate limit: 5 feedback submissions per hour
    if (isRateLimited(`feedback-${userId}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many feedback submissions. Please wait and try again.' }, { status: 429 });
    }

    await dbConnect();
    const body = await req.json();
    const { category, title, description, page } = body;

    if (!category || !title || !description) {
      return NextResponse.json({ error: 'Missing required fields: category, title, description' }, { status: 400 });
    }

    const validCategories = ['bug', 'feature_request', 'content_quality', 'ui_ux', 'performance', 'other'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const feedback = await Feedback.create({
      userId,
      userEmail: verifiedUser.email || '',
      category,
      // Defence-in-depth: strip HTML tags (sanitizeUserContent) + strip control chars (sanitizeText)
      title: sanitizeText(sanitizeUserContent(title, 250), 200),
      description: sanitizeText(sanitizeUserContent(description, 2500), 2000),
      page: sanitizeUrl(page) || '/',
    });

    // Track lifetime feedback count
    await incrementLifetimeUsage(userId, 'totalFeedbackSubmitted');

    logger.info('User submitted feedback', userId, { feedbackId: feedback._id, category });

    return NextResponse.json({ feedback, message: 'Feedback submitted successfully!' }, { status: 201 });
  } catch (error) {
    console.error('API Error in POST /api/feedback:', safeErrorResponse(error));
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const verifiedUser = await verifyFirebaseIdToken(authHeader.split(' ')[1]);
    if (!verifiedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Check if admin
    const user = await User.findById(verifiedUser.uid);
    if (!user || !hasPermission(user.role, 'admin')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const total = await Feedback.countDocuments(filter);
    const feedbacks = await Feedback.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({
      feedbacks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('API Error in GET /api/feedback:', safeErrorResponse(error));
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
