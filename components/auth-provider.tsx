'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signOut, 
  onIdTokenChanged 
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

export interface IUserProfile {
  name?: string;
  college?: string;
  course?: string;
  branch?: string;
  semester?: number;
}

export interface IUserEngagement {
  streakCount: number;
  lastActiveDateStr?: string;
  totalXp: number;
  sessionsCompleted: number;
  league: 'beginner' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'elite';
  dailyGoalSolved: number;
  dailyGoalTarget: number;
}

export interface IDbUser {
  _id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'student' | 'verifier' | 'moderator' | 'admin';
  onboardingCompleted: boolean;
  profile: IUserProfile;
  engagement: IUserEngagement;
  preferences: {
    playSounds: boolean;
    autoTimer: boolean;
    delayAnswer: boolean;
    textSize: 'small' | 'medium' | 'large' | 'extra-large';
  };
  bookmarks: string[];
  incorrectAttempts: string[];
  personalNotes: Record<string, string>;
}

interface AuthContextType {
  user: IDbUser | null;
  fbUser: FirebaseUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<FirebaseUser>;
  registerWithEmail: (email: string, password: string, name: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<IDbUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (firebaseUser: FirebaseUser) => {
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Error fetching database user profile:', err);
      setUser(null);
    }
  };

  const refreshProfile = async () => {
    if (fbUser) {
      await fetchUserProfile(fbUser);
    }
  };

  useEffect(() => {
    // Handle redirect result if coming back from signInWithRedirect
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          setLoading(true);
          await fetchUserProfile(result.user);
        }
      } catch (err: any) {
        console.error('Error handling redirect result:', err);
      } finally {
        setLoading(false);
      }
    };
    handleRedirect();

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      setFbUser(firebaseUser);
      if (firebaseUser) {
        // If email password provider is used, require email verification
        const isEmailProvider = firebaseUser.providerData.some(p => p.providerId === 'password');
        if (isEmailProvider && !firebaseUser.emailVerified) {
          setUser(null);
          setLoading(false);
          return;
        }

        await fetchUserProfile(firebaseUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await fetchUserProfile(result.user);
    } catch (err: any) {
      console.warn('signInWithPopup failed, checking fallback to signInWithRedirect:', err);
      // Fall back to redirect if popup is blocked, closed, or denied
      if (
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/cancelled-popup-request' ||
        err.code === 'auth/popup-closed-by-user' ||
        err.message?.includes('popup')
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return; // The browser will redirect, so we do not call setLoading(false)
        } catch (redirectErr) {
          console.error('signInWithRedirect also failed:', redirectErr);
          setLoading(false);
          throw redirectErr;
        }
      }
      setLoading(false);
      throw err;
    } finally {
      // setLoading(false) is handled in try/catch dynamically
    }
  };

  const loginWithEmail = async (email: string, password: string): Promise<FirebaseUser> => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!cred.user.emailVerified) {
        await signOut(auth);
        setLoading(false);
        throw new Error('Please verify your email address before logging in. A verification link has been sent.');
      }
      return cred.user;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const registerWithEmail = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Set display name in Firebase Auth
      await updateProfile(cred.user, { displayName: name });
      // Send verification email (completely free)
      await sendEmailVerification(cred.user);
      // Instantly sign out to force verification login wall
      await signOut(auth);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const sendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setFbUser(null);
    } catch (err) {
      console.error('Sign-out error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      fbUser, 
      loading, 
      loginWithGoogle, 
      loginWithEmail, 
      registerWithEmail, 
      sendVerificationEmail, 
      logout, 
      refreshProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
