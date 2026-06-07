'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/auth-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { 
  Sparkles, 
  Loader2, 
  Mail, 
  Lock, 
  User as UserIcon,
  CheckCircle2, 
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const { user, fbUser, loading, error: globalError, loginWithEmail, registerWithEmail } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Redirect if logged in & profile loaded
  useEffect(() => {
    if (!loading && fbUser && user) {
      if (!user.onboardingCompleted) {
        router.push('/onboarding');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, fbUser, loading, router]);

  // Sync global auth error to the login page UI
  useEffect(() => {
    if (globalError) {
      setAuthError(globalError);
    }
  }, [globalError]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (!email || !password) {
      setAuthError('Please fill in all required fields.');
      return;
    }

    if (activeTab === 'register' && (!name || !username)) {
      setAuthError('Please enter your name and a username.');
      return;
    }

    setSubmitting(true);
    try {
      if (activeTab === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password, name, username);
        setAuthSuccess('Registration successful! A verification link has been sent to your email. Please verify your email to log in.');
        setEmail('');
        setUsername('');
        setPassword('');
        setName('');
        setActiveTab('login');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || (fbUser && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
          <p className="text-xs text-text-secondary">Securing connection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-hidden bg-bg-primary text-text-primary">
      {/* Background ambient space glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[140px] pointer-events-none dark:block hidden" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] bg-[#7c66ff]/4 rounded-full blur-[140px] pointer-events-none dark:block hidden" />

      {/* Header */}
      <header className="border-b border-border-primary/50 bg-bg-primary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-display font-bold text-lg shadow-md shadow-accent/20 group-hover:scale-105 transition-transform duration-200">
              P
            </div>
            <span className="font-display font-bold text-xl tracking-tight group-hover:text-accent transition-colors duration-200">PaperHub</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Authentication Grid */}
      <main className="flex-grow flex items-center justify-center px-6 py-12 relative z-10">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* Left Panel: Value Affirmations & Visual Orbits */}
          <div className="md:col-span-5 space-y-8 text-center md:text-left">
            <div className="space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded badge-premium text-accent bg-accent/10 border border-accent/20">
                Premium Study Suite
              </span>
              <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight text-text-primary leading-tight">
                Welcome to the new way to prep & learn
              </h1>
              <p className="text-xs text-text-secondary leading-relaxed">
                Unlock topic-wise past year questions, verified step-by-step solutions, and automatic AI handwritten paper checking.
              </p>
            </div>

            {/* University Orbits Visualization mockup */}
            <div className="relative w-48 h-48 mx-auto md:mx-0 flex items-center justify-center border border-dashed border-border-primary/60 rounded-full bg-bg-secondary/20 shadow-inner">
              <div className="absolute w-24 h-24 rounded-full bg-accent/5 border border-accent/20 flex items-center justify-center text-accent">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
              {/* College seals tags orbited */}
              <span className="absolute -top-1.5 px-2.5 py-0.5 rounded-full border border-border-primary bg-bg-secondary text-[8px] font-extrabold tracking-wide uppercase shadow-sm">MMMUT</span>
              <span className="absolute -bottom-1.5 px-2.5 py-0.5 rounded-full border border-border-primary bg-bg-secondary text-[8px] font-extrabold tracking-wide uppercase shadow-sm">AKTU</span>
              <span className="absolute -left-3 px-2.5 py-0.5 rounded-full border border-border-primary bg-bg-secondary text-[8px] font-extrabold tracking-wide uppercase shadow-sm">HBTU</span>
            </div>

            <ul className="space-y-3 text-xs text-text-secondary text-left max-w-xs mx-auto md:mx-0">
              <li className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                <span>Save all your practice progress</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                <span>Complete university-syllabus mappings</span>
              </li>
            </ul>
          </div>

          {/* Right Panel: Authentication Form Card */}
          <div className="md:col-span-7 max-w-md w-full mx-auto bg-bg-secondary/60 backdrop-blur-md border border-border-primary/80 rounded-2xl shadow-xl p-6 md:p-8 space-y-6">
            
            {/* Form Tabs */}
            <div className="flex border-b border-border-primary/60 pb-1">
              <button
                onClick={() => { setActiveTab('login'); setAuthError(null); }}
                className={`flex-1 text-center pb-2 text-xs font-bold uppercase tracking-wider transition-colors relative ${
                  activeTab === 'login' ? 'text-accent' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Sign In
                {activeTab === 'login' && (
                  <motion.div layoutId="auth-tab-line" className="absolute bottom-0 inset-x-0 h-0.5 bg-accent" />
                )}
              </button>
              <button
                onClick={() => { setActiveTab('register'); setAuthError(null); }}
                className={`flex-1 text-center pb-2 text-xs font-bold uppercase tracking-wider transition-colors relative ${
                  activeTab === 'register' ? 'text-accent' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Create Account
                {activeTab === 'register' && (
                  <motion.div layoutId="auth-tab-line" className="absolute bottom-0 inset-x-0 h-0.5 bg-accent" />
                )}
              </button>
            </div>

            {/* Response notifications */}
            <AnimatePresence mode="wait">
              {authError && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }} 
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-xs flex items-start space-x-2.5"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{authError}</p>
                </motion.div>
              )}

              {authSuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }} 
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3.5 rounded-xl border border-green-500/20 bg-green-500/5 text-green-500 text-xs flex items-start space-x-2.5"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{authSuccess}</p>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Credentials Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              
              {activeTab === 'register' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input
                        type="text"
                        placeholder="Enter your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-primary bg-bg-secondary/40 focus:border-accent text-xs transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Username</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-xs font-bold">@</span>
                      <input
                        type="text"
                        placeholder="unique_username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border-primary bg-bg-secondary/40 focus:border-accent text-xs transition-colors"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">
                  {activeTab === 'login' ? 'Email or Username' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type={activeTab === 'login' ? 'text' : 'email'}
                    placeholder={activeTab === 'login' ? 'Email or Username' : 'name@university.edu'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-primary bg-bg-secondary/40 focus:border-accent text-xs transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-primary bg-bg-secondary/40 focus:border-accent text-xs transition-colors"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all flex items-center justify-center space-x-2 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{activeTab === 'login' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-primary/50 bg-bg-secondary/20 py-4 text-center text-[10px] text-text-secondary">
        <p>PaperHub SSL Shielded Access • Google OAuth credentials encrypted.</p>
      </footer>
    </div>
  );
}
