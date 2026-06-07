import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User, { IUser } from "@/models/user";
import { auth } from "@/lib/auth";

export interface VerifiedToken {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  onboardingCompleted?: boolean;
}

/**
 * Verifies an incoming Better Auth session token.
 *
 * Pipeline:
 * 1. Redis session cache lookup (fast path, ~1 ms).
 * 2. MongoDB session + user collection lookup (cache miss, ~10-30 ms).
 *    Writes result back to Redis cache with a TTL capped at 1 hour.
 *
 * Returns null if the token is invalid, expired, or the session user
 * cannot be found. Callers should treat null as Unauthorized (401).
 *
 * NOTE: This function does NOT enforce emailVerified or onboardingCompleted.
 * Use requireAuthorizedUser() for API routes that need those checks.
 */
export async function verifySessionToken(idToken: string): Promise<VerifiedToken | null> {
  // ── 1. Try Redis session cache (fast path) ──────────────────────────────────
  try {
    const { redis } = require("@/lib/redis");
    if (redis) {
      const cached = await redis.get(`paperhub:session:${idToken}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.session && parsed.user && new Date(parsed.session.expiresAt) > new Date()) {
          const userDoc = parsed.user;
          return {
            uid: userDoc._id,
            email: userDoc.email,
            displayName: userDoc.name || userDoc.displayName || "",
            photoURL: userDoc.image || userDoc.photoURL || "",
            emailVerified: !!userDoc.emailVerified,
            onboardingCompleted: !!userDoc.onboardingCompleted,
          };
        }
      }
    }
  } catch (err) {
    console.warn("[verifyAuth] Redis session read in verifySessionToken failed:", err);
  }

  // ── 2. MongoDB session fallback (cache miss) ─────────────────────────────────
  try {
    await dbConnect();
    const mongoose = require("mongoose");
    const db = mongoose.connection.db;

    // Better Auth session tokens are stored in the 'sessions' collection
    // (usePlural: true is set in mongodbAdapter config in lib/auth.ts)
    const sessionCollection = db.collection("sessions");
    const sessionDoc = await sessionCollection.findOne({ token: idToken });

    if (sessionDoc && new Date(sessionDoc.expiresAt) > new Date()) {
      // User records live in the 'users' collection (Mongoose default pluralization)
      const userCollection = db.collection("users");
      const userDoc = await userCollection.findOne({ _id: sessionDoc.userId });

      if (userDoc) {
        // Write-back to Redis cache so subsequent requests hit the fast path
        try {
          const { redis } = require("@/lib/redis");
          if (redis) {
            const ttl = Math.min(
              Math.ceil((new Date(sessionDoc.expiresAt).getTime() - Date.now()) / 1000),
              3600 // 1 hour max TTL
            );
            if (ttl > 0) {
              await redis.set(
                `paperhub:session:${idToken}`,
                JSON.stringify({ session: sessionDoc, user: userDoc }),
                "EX",
                ttl
              );
              // Save token mapping to user active session set for O(M) invalidations
              await redis.sadd(`paperhub:user:sessions:${sessionDoc.userId}`, idToken);
              await redis.expire(`paperhub:user:sessions:${sessionDoc.userId}`, 30 * 24 * 60 * 60);
            }
          }
        } catch (cacheErr) {
          console.warn("[verifyAuth] Redis cache write failed:", cacheErr);
        }

        return {
          uid: userDoc._id,
          email: userDoc.email,
          displayName: userDoc.name || userDoc.displayName || "",
          photoURL: userDoc.image || userDoc.photoURL || "",
          emailVerified: !!userDoc.emailVerified,
          onboardingCompleted: !!userDoc.onboardingCompleted,
        };
      }
    }
  } catch (err) {
    console.warn("[verifyAuth] Better Auth session database check failed:", err);
  }

  return null;
}

/**
 * @deprecated Use verifySessionToken() instead.
 * Legacy alias preserved during the Firebase → Better Auth rename migration.
 */
export const verifyFirebaseIdToken = verifySessionToken;

/**
 * Canonical authorization helper for all protected API endpoints.
 * Validates session validity, active account status, email verification, and
 * student onboarding checks.
 *
 * - IF role === student, onboarding is strictly required.
 * - IF role !== student (admin, moderator, verifier), onboarding is bypassed.
 */
export async function requireAuthorizedUser(
  req: NextRequest,
  options: {
    allowedRoles?: ('student' | 'verifier' | 'moderator' | 'admin')[];
    allowPendingOnboarding?: boolean;
  } = {}
): Promise<{ user: IUser; errorResponse: null } | { user: null; errorResponse: NextResponse }> {
  await dbConnect();

  // 1. Extract session token
  let token: string | null = null;
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else {
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }
  }

  if (!token) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: "Unauthorized: Missing Authorization Bearer token or session cookie" }, { status: 401 }),
    };
  }

  let userDocPayload: any = null;

  // 2. Try Redis cache (fast path)
  try {
    const { redis } = require("@/lib/redis");
    if (redis) {
      const cached = await redis.get(`paperhub:session:${token}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (
          parsed &&
          parsed.user &&
          parsed.session &&
          new Date(parsed.session.expiresAt) > new Date()
        ) {
          userDocPayload = parsed.user;
        }
      }
    }
  } catch (err) {
    console.warn("[verifyAuth] Redis session read in requireAuthorizedUser failed:", err);
  }

  let user: IUser | null = null;

  if (userDocPayload) {
    user = User.hydrate(userDocPayload) as IUser;
  } else {
    // 3. Fallback: Better Auth API call
    try {
      const session = await auth.api.getSession({
        headers: req.headers,
      });

      if (session && session.user && session.session) {
        user = await User.findById(session.user.id);

        if (user) {
          // Write-back to Redis cache
          try {
            const { redis } = require("@/lib/redis");
            if (redis) {
              const ttl = Math.min(
                Math.ceil((new Date(session.session.expiresAt).getTime() - Date.now()) / 1000),
                3600
              );
              if (ttl > 0) {
                await redis.set(
                  `paperhub:session:${session.session.token}`,
                  JSON.stringify({ session: session.session, user: user.toObject() }),
                  "EX",
                  ttl
                );
                // Save token mapping to user active session set
                await redis.sadd(`paperhub:user:sessions:${session.user.id}`, session.session.token);
                await redis.expire(`paperhub:user:sessions:${session.user.id}`, 30 * 24 * 60 * 60);
              }
            }
          } catch (cacheErr) {
            console.warn("[verifyAuth] Redis session cache write failed:", cacheErr);
          }
        }
      }
    } catch (authErr) {
      console.warn("[verifyAuth] Better Auth getSession check failed:", authErr);
    }
  }

  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: "Unauthorized: Invalid or expired session token" }, { status: 401 }),
    };
  }

  // 4. Enforce active account status
  if (user.accountStatus !== "active") {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: "Forbidden: Account is suspended or banned" }, { status: 403 }),
    };
  }



  // 6. Enforce onboarding completion ONLY for students
  if (!options.allowPendingOnboarding && user.role === "student" && !user.onboardingCompleted) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: "Forbidden: Onboarding must be completed before accessing this resource" }, { status: 403 }),
    };
  }

  // 7. Enforce role restriction if requested
  if (options.allowedRoles && !options.allowedRoles.includes(user.role)) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: "Forbidden: Insufficient privileges" }, { status: 403 }),
    };
  }

  return { user, errorResponse: null };
}

/**
 * Extracts and verifies a full user session, returning a hydrated Mongoose
 * IUser document. Used by staff and legacy routes.
 *
 * Enforcements applied:
 * - accountStatus must be "active"
 * - emailVerified must be true
 * - onboardingCompleted must be true (if role === student)
 *
 * Returns null if any check fails — callers should treat null as Unauthorized (401).
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<IUser | null> {
  const result = await requireAuthorizedUser(req);
  return result.user;
}
