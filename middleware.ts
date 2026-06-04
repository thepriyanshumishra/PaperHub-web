import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory Map to track IP-based request counts and window reset times.
// Edge functions run on individual instances; in-memory tracking is extremely lightweight and fast.
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const LIMIT = 20; // Maximum allowed requests
const WINDOW_MS = 60 * 1000; // Reset window (1 minute)

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Rate-limit AI endpoints to prevent abusive API token consumption and protect backend scalability
  if (url.pathname.startsWith('/api/ai')) {
    // Periodic pruning to prevent memory leak
    if (rateLimitMap.size > 1000) {
      const nowTime = Date.now();
      rateLimitMap.forEach((value, key) => {
        if (nowTime > value.resetTime) {
          rateLimitMap.delete(key);
        }
      });
    }

    const ip = req.ip || req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'global';

    const now = Date.now();
    const clientLimit = rateLimitMap.get(ip);

    if (!clientLimit) {
      // Initialize tracking bucket for this IP
      rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    } else if (now > clientLimit.resetTime) {
      // The previous window expired. Reset count and set a new window.
      rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    } else {
      // The current window is still active. Increment count and check limit.
      clientLimit.count += 1;
      if (clientLimit.count > LIMIT) {
        const secondsRemaining = Math.ceil((clientLimit.resetTime - now) / 1000);
        return new NextResponse(
          JSON.stringify({
            error: 'Too many requests. Please wait a moment before querying the AI again to safeguard resources.',
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': secondsRemaining.toString(),
            },
          }
        );
      }
    }
  }

  return NextResponse.next();
}

// Config to specify the matcher so that the middleware only intercepts AI API calls
export const config = {
  matcher: '/api/ai/:path*',
};
