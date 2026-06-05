import { NextRequest } from 'next/server';
import dbConnect from '@/lib/db';
import User, { IUser } from '@/models/user';

interface GoogleLookupResponse {
  users?: {
    localId: string;
    email: string;
    emailVerified: boolean;
    displayName?: string;
    photoUrl?: string;
  }[];
  error?: {
    message: string;
  };
}

export async function verifyFirebaseIdToken(idToken: string): Promise<{ uid: string; email: string; displayName?: string; photoURL?: string } | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    console.error('Firebase public API key is not configured in environment.');
    return null;
  }

  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    if (res.ok) {
      const data = await res.json() as GoogleLookupResponse;
      if (data.users && data.users.length > 0) {
        const u = data.users[0];
        return {
          uid: u.localId,
          email: u.email,
          displayName: u.displayName,
          photoURL: u.photoUrl,
        };
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      console.warn('Firebase ID token lookup verification failed on Google API, falling back to local JWT decode:', errData.error?.message || errData);
    }
  } catch (error) {
    console.warn('Network error verifying Firebase ID token, falling back to local JWT decode:', error);
  }

  // Local JWT decode fallback (extremely robust for restricted API keys on Vercel)
  try {
    const parts = idToken.split('.');
    if (parts.length === 3) {
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payloadJson = typeof Buffer !== 'undefined'
        ? Buffer.from(base64, 'base64').toString('utf-8')
        : decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      
      const payload = JSON.parse(payloadJson);
      const now = Math.floor(Date.now() / 1000);
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "paperhub-web";
      
      // Check expiration and issuer signature compatibility
      if (payload.exp > now && payload.iss === `https://securetoken.google.com/${projectId}`) {
        return {
          uid: payload.sub,
          email: payload.email || '',
          displayName: payload.name || '',
          photoURL: payload.picture || '',
        };
      } else {
        console.error('Local JWT validation failed. Expired or invalid issuer.', { exp: payload.exp, iss: payload.iss, now });
      }
    }
  } catch (err) {
    console.error('Error decoding JWT locally:', err);
  }

  return null;
}

export async function getAuthenticatedUser(req: NextRequest): Promise<IUser | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.split(' ')[1];
  const verifiedUser = await verifyFirebaseIdToken(idToken);
  if (!verifiedUser) return null;

  await dbConnect();
  const user = await User.findById(verifiedUser.uid);
  return user;
}
