import { NextRequest } from 'next/server';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import dbConnect from '@/lib/db';
import User, { IUser } from '@/models/user';

// Firebase public key endpoint for RS256 JWT verification
const FIREBASE_JWK_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

// Cache the JWKS fetcher so keys are cached between requests
const getFirebaseJWKS = createRemoteJWKSet(new URL(FIREBASE_JWK_URL));

export interface VerifiedToken {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
}

/**
 * Cryptographically verifies a Firebase ID token using RS256 signature
 * verification against Google's public JWK endpoint.
 *
 * Security guarantees:
 *  - RS256 signature is verified against Google's live public keys
 *  - Token issuer is verified to be this specific Firebase project
 *  - Token audience is verified to be this specific Firebase project
 *  - Token expiration is verified
 *  - Email claim is extracted from the verified payload only
 *
 * There is NO fallback. If verification fails for any reason, null is returned.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedToken | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    console.error('[verifyAuth] NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set. Cannot verify tokens.');
    return null;
  }

  try {
    const { payload } = await jwtVerify(idToken, getFirebaseJWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ['RS256'],
    });

    // All claims below come from the cryptographically verified payload
    const uid = payload.sub;
    const email = payload['email'] as string | undefined;
    const emailVerified = !!payload['email_verified'];

    if (!uid || !email) {
      console.error('[verifyAuth] Verified token is missing required claims (sub, email).');
      return null;
    }

    return {
      uid,
      email,
      displayName: (payload['name'] as string | undefined) ?? undefined,
      photoURL: (payload['picture'] as string | undefined) ?? undefined,
      emailVerified,
    };
  } catch (err: unknown) {
    // Log the specific jose error for diagnosability without leaking details to client
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[verifyAuth] Firebase ID token cryptographic verification failed:', message);
    return null;
  }
}

/**
 * Extracts and verifies the Bearer token from the Authorization header,
 * then looks up the corresponding user document in MongoDB.
 *
 * Returns null if the token is missing, invalid, or the user does not exist
 * in the database (preventing access by users who have not been registered).
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<IUser | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.split(' ')[1];
  if (!idToken) return null;

  const verifiedUser = await verifyFirebaseIdToken(idToken);
  if (!verifiedUser) return null;

  await dbConnect();
  const user = await User.findById(verifiedUser.uid);
  
  if (!user || user.accountStatus !== 'active') {
    return null;
  }

  return user;
}
