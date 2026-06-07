'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/auth-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { Mail, Loader2, CheckCircle2, AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { fbUser, user, loading, logout } = useAuth();

  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // If user is logged in, redirect to dashboard
  useEffect(() => {
    if (!loading) {
      if (!fbUser) {
        router.push('/login');
      } else if (fbUser && user) {
        router.push('/dashboard');
      }
    }
  }, [fbUser, user, loading, router]);

  // Cooldown timer for resend button
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResendEmail = async () => {
    if (cooldown > 0 || !fbUser) return;
    setResendLoading(true);
    setResendError(null);
    setResendSuccess(null);

    try {
      // Call Better Auth's sendVerificationEmail endpoint
      const token = await fbUser.getIdToken();
      const res = await fetch('/api/auth/send-verification-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email: fbUser.email }),
      });

      if (res.ok) {
        setResendSuccess('Verification email sent! Check your inbox and spam folder.');
        setCooldown(60); // 60-second cooldown before next resend
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          setResendError(data.error || 'Too many requests. Please wait before requesting another email.');
          setCooldown(120);
        } else {
          setResendError(data.error || 'Failed to send verification email. Please try again.');
        }
      }
    } catch {
      setResendError('Network error. Please check your connection and try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* Topbar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-bg-primary/80 backdrop-blur-md border-b border-border-subtle">
        <Link href="/" className="flex items-center gap-2.5 text-text-primary font-semibold">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <span className="text-white text-xs font-bold">P</span>
          </div>
          PaperHub
        </Link>
        <ThemeToggle />
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 pt-20 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Card */}
          <div className="bg-bg-secondary rounded-2xl border border-border-subtle p-8 shadow-lg">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-accent" />
              </div>
            </div>

            {/* Heading */}
            <h1 className="text-2xl font-bold text-text-primary text-center mb-2">
              Verify Your Email
            </h1>
            <p className="text-text-secondary text-sm text-center mb-1">
              We sent a verification link to:
            </p>
            <p className="text-accent font-medium text-center text-sm mb-6 break-all">
              {fbUser?.email || 'your email address'}
            </p>

            <p className="text-text-secondary text-sm text-center mb-8 leading-relaxed">
              Click the link in your email to activate your account.
              If you don&apos;t see it, check your spam or junk folder.
            </p>

            {/* Status messages */}
            {resendSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2.5 p-3 mb-4 rounded-xl bg-green-500/10 border border-green-500/20"
              >
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <p className="text-green-400 text-sm">{resendSuccess}</p>
              </motion.div>
            )}
            {resendError && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2.5 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20"
              >
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-red-400 text-sm">{resendError}</p>
              </motion.div>
            )}

            {/* Resend button */}
            <button
              id="resend-verification-btn"
              onClick={handleResendEmail}
              disabled={resendLoading || cooldown > 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent text-white font-medium text-sm transition-all hover:bg-accent/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mb-3"
            >
              {resendLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {cooldown > 0
                ? `Resend in ${cooldown}s`
                : resendLoading
                ? 'Sending…'
                : 'Resend Verification Email'}
            </button>

            {/* Back to login */}
            <button
              id="back-to-login-btn"
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border-subtle text-text-secondary text-sm font-medium transition-all hover:border-accent/30 hover:text-text-primary"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>
          </div>

          {/* Help text */}
          <p className="text-center text-text-muted text-xs mt-5">
            Having trouble?{' '}
            <Link href="/login" className="text-accent hover:underline">
              Try a different email
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
