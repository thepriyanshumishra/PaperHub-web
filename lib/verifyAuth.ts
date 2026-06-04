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

    if (!res.ok) {
      const errData = await res.json() as GoogleLookupResponse;
      console.error('Firebase ID token lookup verification failed:', errData.error?.message);
      return null;
    }

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
    return null;
  } catch (error) {
    console.error('Network error verifying Firebase ID token:', error);
    return null;
  }
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
