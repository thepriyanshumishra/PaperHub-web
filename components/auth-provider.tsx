"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { authClient } from "@/lib/auth-client";

export interface IUserProfile {
  name?: string;
  universityId?: string;
  collegeId?: string;
  courseId?: string;
  branchId?: string;
  semester?: number;
  college?: string;
  course?: string;
  branch?: string;
}

export interface IUserEngagement {
  streakCount: number;
  lastActiveDateStr?: string;
  totalXp: number;
  sessionsCompleted: number;
  league: "beginner" | "bronze" | "silver" | "gold" | "diamond" | "elite";
  dailyGoalSolved: number;
  dailyGoalTarget: number;
}

export interface IDbUser {
  _id: string;
  email: string;
  name?: string;
  image?: string;
  displayName?: string;
  photoURL?: string;
  role: "student" | "verifier" | "moderator" | "admin";
  onboardingCompleted: boolean;
  profile: IUserProfile;
  engagement: IUserEngagement;
  preferences: {
    playSounds: boolean;
    autoTimer: boolean;
    delayAnswer: boolean;
    textSize: "small" | "medium" | "large" | "extra-large";
  };
  bookmarks: string[];
  incorrectAttempts: string[];
  personalNotes: Record<string, string>;
  plan?: "free" | "pro" | "institution" | "beta_pro";
  planExpiresAt?: string | null;
  betaAccess?: {
    joined: boolean;
    joinedAt: string | null;
    inviteCode: string | null;
    referredBy: string | null;
  };
  usageMetrics?: {
    daily: {
      aiChats: number;
      evaluations: number;
      date: string;
    };
    monthly: {
      mockTests: number;
      month: string;
    };
    lifetime: {
      totalSessions: number;
      totalQuestionsSolved: number;
      totalMockTests: number;
      totalAiChats: number;
      totalFeedbackSubmitted: number;
    };
  };
}

interface AuthContextType {
  user: IDbUser | null;
  fbUser: any | null; // Emulated active session object for page compatibility
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<any>;
  registerWithEmail: (email: string, password: string, name: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [fbUser, setFbUser] = useState<any | null>(null);
  const [user, setUser] = useState<IDbUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeFetchTokenRef = useRef<string | null>(null);

  const { data: sessionData, isPending } = authClient.useSession();

  const fetchUserProfile = async (token: string) => {
    if (activeFetchTokenRef.current === token) {
      return;
    }
    activeFetchTokenRef.current = token;

    try {
      const res = await fetch("/api/users/profile", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setError(null);

        // Guest data migration synchronizer
        if (data.user && data.user.onboardingCompleted && typeof window !== "undefined") {
          try {
            const guestBookmarksStr = localStorage.getItem("guest_bookmarks");
            const guestNotesStr = localStorage.getItem("guest_notes");
            const guestIncorrectStr = localStorage.getItem("guest_incorrect");

            const hasBookmarks = guestBookmarksStr && JSON.parse(guestBookmarksStr).length > 0;
            const hasIncorrect = guestIncorrectStr && JSON.parse(guestIncorrectStr).length > 0;
            const hasNotes = guestNotesStr && (
              (Array.isArray(JSON.parse(guestNotesStr)) && JSON.parse(guestNotesStr).length > 0) ||
              (typeof JSON.parse(guestNotesStr) === "object" && Object.keys(JSON.parse(guestNotesStr)).length > 0)
            );

            if (hasBookmarks || hasIncorrect || hasNotes) {
              const bookmarks = guestBookmarksStr ? JSON.parse(guestBookmarksStr) : [];
              const incorrectAttempts = guestIncorrectStr ? JSON.parse(guestIncorrectStr) : [];
              let notes = [];
              if (guestNotesStr) {
                const parsedNotes = JSON.parse(guestNotesStr);
                if (Array.isArray(parsedNotes)) {
                  notes = parsedNotes;
                } else if (typeof parsedNotes === "object") {
                  notes = Object.entries(parsedNotes).map(([questionId, noteText]) => ({
                    questionId,
                    noteText,
                  }));
                }
              }

              const migrationRes = await fetch("/api/users/profile", {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                  migrationData: { bookmarks, notes, incorrectAttempts },
                }),
              });

              if (migrationRes.ok) {
                const migrationData = await migrationRes.json();
                setUser(migrationData.user);
                localStorage.removeItem("guest_bookmarks");
                localStorage.removeItem("guest_notes");
                localStorage.removeItem("guest_incorrect");
              }
            }
          } catch (migrationErr) {
            console.warn("Background guest migration failed:", migrationErr);
          }
        }

        return data.user;
      } else {
        let msg = `Profile API error (${res.status})`;
        try {
          const errData = await res.json();
          if (errData.error) msg = errData.error;
        } catch (_) {}
        setUser(null);
        setError(msg);
        throw new Error(msg);
      }
    } catch (err: any) {
      console.error("Error fetching database user profile:", err);
      setUser(null);
      setError(err.message || "Error syncing with database profile.");
      throw err;
    } finally {
      setTimeout(() => {
        if (activeFetchTokenRef.current === token) {
          activeFetchTokenRef.current = null;
        }
      }, 2000);
    }
  };

  const refreshProfile = async () => {
    if (fbUser) {
      const token = await fbUser.getIdToken();
      await fetchUserProfile(token);
    }
  };

  // Sync Better Auth session state with emulated fbUser and load database profile
  useEffect(() => {
    if (isPending) return;

    if (sessionData && sessionData.user && sessionData.session) {
      const token = sessionData.session.token;
      
      setFbUser({
        uid: sessionData.user.id,
        email: sessionData.user.email,
        displayName: sessionData.user.name,
        photoURL: sessionData.user.image || "",
        emailVerified: sessionData.user.emailVerified,
        getIdToken: async () => token,
      });

      // Require email verification gate for standard credentials users
      if (!sessionData.user.emailVerified) {
        setUser(null);
        setLoading(false);
        return;
      }

      fetchUserProfile(token).finally(() => setLoading(false));
    } else {
      setFbUser(null);
      setUser(null);
      setLoading(false);
    }
  }, [sessionData, isPending]);

  const loginWithGoogle = async (): Promise<void> => {
    setError("Social single sign-on is disabled. Please sign in with your email/password or username.");
    throw new Error("OAuth single sign-on is disabled.");
  };

  const loginWithEmail = async (emailOrUsername: string, password: string): Promise<any> => {
    setLoading(true);
    try {
      // Determine if email or username was passed
      const isEmail = emailOrUsername.includes("@");
      
      const payload: any = {
        password,
      };

      if (isEmail) {
        payload.email = emailOrUsername;
      } else {
        payload.username = emailOrUsername;
      }

      const result = await authClient.signIn.email(payload);
      
      if (result.error) {
        throw new Error(result.error.message || "Invalid authentication credentials.");
      }

      const freshSession = await authClient.getSession();
      if (!freshSession.data?.user.emailVerified) {
        await authClient.signOut();
        setLoading(false);
        throw new Error("Please verify your email address before logging in. A verification link has been sent to your email.");
      }

      const token = freshSession.data.session.token;
      const verified = {
        uid: freshSession.data.user.id,
        email: freshSession.data.user.email,
        displayName: freshSession.data.user.name,
        photoURL: freshSession.data.user.image || "",
        emailVerified: freshSession.data.user.emailVerified,
        getIdToken: async () => token,
      };

      setFbUser(verified);
      return verified;
    } catch (err: any) {
      setLoading(false);
      throw err;
    }
  };

  const registerWithEmail = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name,
        username: email.split("@")[0] + "_" + Math.floor(Math.random() * 1000), // Assign a unique default username
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to register user account.");
      }

      // Sign out immediately to block login until email verification is processed
      await authClient.signOut();
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const sendVerificationEmail = async () => {
    // Better Auth handles verification email triggers on user creation,
    // but we can expose it via the auth client if needed.
    try {
      await authClient.sendVerificationEmail({
        email: user?.email || sessionData?.user.email || "",
        callbackURL: window.location.origin + "/login",
      });
    } catch (err) {
      console.error("Failed to re-trigger verification email:", err);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authClient.signOut();
      setUser(null);
      setFbUser(null);
    } catch (err) {
      console.error("Sign-out error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      fbUser,
      loading,
      error,
      setError,
      loginWithGoogle,
      loginWithEmail,
      registerWithEmail,
      sendVerificationEmail,
      logout,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
