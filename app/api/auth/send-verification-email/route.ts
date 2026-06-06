import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { verifySessionToken } from '@/lib/verifyAuth';

export const dynamic = 'force-dynamic';

// Rate limit: max 3 verification email requests per hour per email address.
// Tracked in Redis with a 1-hour TTL.
const MAX_RESENDS_PER_HOUR = 3;
const RESEND_WINDOW_SECONDS = 60 * 60; // 1 hour

export async function POST(req: NextRequest) {
  try {
    // ── Authentication ──────────────────────────────────────────────────────────
    // The user must be logged in (has a session) to request a resend.
    // We accept a Bearer token from the verify-email page.
    const authHeader = req.headers.get('authorization');
    let token: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      const cookieHeader = req.headers.get('cookie');
      if (cookieHeader) {
        const match = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
        if (match) token = match[1];
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: No active session found.' },
        { status: 401 }
      );
    }

    // Verify the session token (do NOT require emailVerified here — that's the point)
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or expired session.' },
        { status: 401 }
      );
    }

    // If already verified, no action needed
    if (session.user.emailVerified) {
      return NextResponse.json(
        { message: 'Email is already verified. You can log in normally.' },
        { status: 200 }
      );
    }

    const email = session.user.email;

    // ── Redis Rate Limiting ─────────────────────────────────────────────────────
    // Throttle by email address: max 3 resend attempts per hour.
    // This prevents Resend API quota exhaustion and inbox flooding.
    try {
      const { redis } = require('@/lib/redis');
      if (redis) {
        const rateLimitKey = `paperhub:resend-verify:${email.toLowerCase()}`;
        const currentCount = await redis.get(rateLimitKey);
        const count = currentCount ? parseInt(currentCount, 10) : 0;

        if (count >= MAX_RESENDS_PER_HOUR) {
          const ttl = await redis.ttl(rateLimitKey);
          const minutesLeft = Math.ceil(ttl / 60);
          return NextResponse.json(
            {
              error: `Too many verification email requests. Please wait ${minutesLeft} minute(s) before trying again.`,
              retryAfterSeconds: ttl,
            },
            { status: 429 }
          );
        }

        // Increment counter, set TTL only on first request in window
        if (count === 0) {
          await redis.set(rateLimitKey, '1', 'EX', RESEND_WINDOW_SECONDS);
        } else {
          await redis.incr(rateLimitKey);
          // Don't reset TTL on subsequent requests — window started at first request
        }
      }
    } catch (redisErr) {
      // If Redis is unavailable, allow the request through (degrade gracefully)
      console.warn('[send-verification-email] Redis rate limit check failed:', redisErr);
    }

    // ── Send Verification Email ─────────────────────────────────────────────────
    // Delegate to Better Auth's built-in email verification flow.
    await auth.api.sendVerificationEmail({
      body: { email, callbackURL: `${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/dashboard` },
    });

    return NextResponse.json(
      { message: 'Verification email sent. Check your inbox and spam folder.' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[send-verification-email] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification email. Please try again shortly.' },
      { status: 500 }
    );
  }
}
