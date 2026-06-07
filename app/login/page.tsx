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
  ArrowRight,
  BookOpen,
  Bot,
  LineChart,
  Bookmark,
  ShieldCheck,
  Zap,
  Cloud,
  GraduationCap
} from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const { user, fbUser, loading, error: globalError, loginWithEmail, registerWithEmail, loginWithGoogle } = useAuth();

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

  const handleGoogleAuth = async () => {
    try {
      setAuthError(null);
      await loginWithGoogle();
    } catch (err: any) {
      setAuthError(err.message || 'Google authentication disabled.');
    }
  };

  if (loading || (fbUser && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-white">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#8B5CF6] animate-spin mx-auto" />
          <p className="text-sm text-gray-400 font-medium">Securing connection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-[#0a0a0f] text-white font-sans selection:bg-[#8B5CF6]/30">
      {/* Background ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[#8B5CF6]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-[#6D28D9]/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="absolute top-0 inset-x-0 z-50 flex items-center justify-between px-6 lg:px-12 py-6">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-9 h-9 rounded-xl bg-[#8B5CF6] flex items-center justify-center text-white font-bold text-lg shadow-[0_0_20px_rgba(139,92,246,0.4)] group-hover:scale-105 transition-transform duration-300">
            P
          </div>
          <span className="font-bold text-xl tracking-tight text-white/90 group-hover:text-white transition-colors duration-200">PaperHub</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col lg:flex-row items-center justify-center w-full max-w-[1400px] mx-auto px-6 lg:px-12 pt-24 pb-12 lg:py-0 gap-12 lg:gap-24 relative z-10">
        
        {/* Left Panel: Branding & Features */}
        <div className="flex-1 w-full flex flex-col justify-center space-y-10 lg:pl-8 relative z-20 hidden md:flex">
          
          <div className="space-y-6">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 text-[#A78BFA] text-[10px] font-bold tracking-[0.2em] uppercase">
              Premium Study Suite
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              Study Smarter.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A78BFA] to-[#8B5CF6]">Score Higher.</span>
            </h1>
            
            <p className="text-lg text-gray-400 max-w-lg leading-relaxed">
              Access your personalized study space and continue your journey towards academic excellence.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
                <BookOpen className="w-5 h-5 text-[#A78BFA]" />
              </div>
              <div>
                <h3 className="font-semibold text-white/90 text-sm">Smart Practice</h3>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed">Topic-wise questions and PYQs</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
                <Bot className="w-5 h-5 text-[#A78BFA]" />
              </div>
              <div>
                <h3 className="font-semibold text-white/90 text-sm">AI Assistant</h3>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed">Get step-by-step explanations</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
                <LineChart className="w-5 h-5 text-[#A78BFA]" />
              </div>
              <div>
                <h3 className="font-semibold text-white/90 text-sm">Track Progress</h3>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed">Analyze and improve your performance</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
                <Bookmark className="w-5 h-5 text-[#A78BFA]" />
              </div>
              <div>
                <h3 className="font-semibold text-white/90 text-sm">Save & Organize</h3>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed">Bookmarks, notes and quick revision</p>
              </div>
            </div>
          </div>

          {/* Trusted Badge */}
          <div className="inline-flex items-center space-x-4 bg-white/[0.03] border border-white/10 rounded-2xl p-4 w-max backdrop-blur-md">
            <div>
              <p className="text-sm font-semibold text-white">Trusted by 10K+ students</p>
              <p className="text-xs text-gray-500 mt-0.5">from top universities across India</p>
            </div>
            <div className="flex items-center -space-x-2">
              <div className="w-8 h-8 rounded-full border-2 border-[#0a0a0f] bg-gray-700 overflow-hidden"><img src="https://i.pravatar.cc/100?img=1" alt="Student" /></div>
              <div className="w-8 h-8 rounded-full border-2 border-[#0a0a0f] bg-gray-700 overflow-hidden"><img src="https://i.pravatar.cc/100?img=2" alt="Student" /></div>
              <div className="w-8 h-8 rounded-full border-2 border-[#0a0a0f] bg-gray-700 overflow-hidden"><img src="https://i.pravatar.cc/100?img=3" alt="Student" /></div>
              <div className="w-8 h-8 rounded-full border-2 border-[#0a0a0f] bg-[#8B5CF6] flex items-center justify-center text-[10px] font-bold">+10K</div>
            </div>
          </div>
        </div>

        {/* Center Graphic Absolute Positioned */}
        <div className="absolute left-[45%] top-[55%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none hidden lg:block opacity-[0.35] z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.15)_0%,transparent_50%)]" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-white/10 rounded-full border-dashed animate-[spin_60s_linear_infinite]" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-[#8B5CF6]/20 rounded-full border-dashed animate-[spin_90s_linear_infinite_reverse]" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 bg-gradient-to-br from-[#A78BFA] to-[#6D28D9] rounded-[2rem] rotate-12 flex items-center justify-center shadow-[0_0_80px_rgba(139,92,246,0.8)] border border-white/20">
             <span className="text-white text-6xl font-black -rotate-12 drop-shadow-md">P</span>
          </div>
        </div>

        {/* Right Panel: Auth Form */}
        <div className="w-full max-w-[440px] shrink-0 z-30">
          <div className="bg-[#12121A]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            
            {/* Form Glow Line */}
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#8B5CF6]/50 to-transparent" />

            <div className="text-center space-y-2 mb-8">
              <h2 className="text-2xl font-bold text-white">Welcome back!</h2>
              <p className="text-sm text-gray-400">Sign in to continue your learning journey</p>
            </div>

            {/* Toggle Pill */}
            <div className="flex bg-black/40 rounded-xl p-1 mb-8 border border-white/5 relative">
              <button
                onClick={() => { setActiveTab('login'); setAuthError(null); }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all z-10 ${activeTab === 'login' ? 'text-white' : 'text-gray-500 hover:text-white/70'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setActiveTab('register'); setAuthError(null); }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all z-10 ${activeTab === 'register' ? 'text-white' : 'text-gray-500 hover:text-white/70'}`}
              >
                Create Account
              </button>
              
              <motion.div 
                className="absolute inset-y-1 w-[calc(50%-4px)] bg-[#8B5CF6]/80 backdrop-blur-md rounded-lg shadow-lg border border-white/10"
                initial={false}
                animate={{ left: activeTab === 'login' ? '4px' : 'calc(50%)' }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            </div>

            <button 
              onClick={handleGoogleAuth}
              className="w-full flex items-center justify-center space-x-3 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white text-sm font-medium transition-colors mb-6"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center space-x-4 mb-6">
              <div className="flex-1 h-[1px] bg-white/10" />
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">OR</span>
              <div className="flex-1 h-[1px] bg-white/10" />
            </div>

            <AnimatePresence mode="wait">
              {authError && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{authError}</p>
                  </div>
                </motion.div>
              )}

              {authSuccess && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{authSuccess}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              
              {activeTab === 'register' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-400">Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Enter your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-black/20 focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] outline-none text-sm text-white placeholder:text-gray-600 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-400">Username</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">@</span>
                      <input
                        type="text"
                        placeholder="unique_username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        className="w-full pl-9 pr-4 py-3 rounded-xl border border-white/10 bg-black/20 focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] outline-none text-sm text-white placeholder:text-gray-600 transition-all"
                        required
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400">
                  {activeTab === 'login' ? 'Email Address or Username' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type={activeTab === 'login' ? 'text' : 'email'}
                    placeholder={activeTab === 'login' ? 'name@university.edu' : 'name@university.edu'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-black/20 focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] outline-none text-sm text-white placeholder:text-gray-600 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-black/20 focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] outline-none text-sm text-white placeholder:text-gray-600 transition-all"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              {activeTab === 'login' && (
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <div className="w-4 h-4 rounded border border-white/20 bg-black/20 group-hover:border-[#8B5CF6] flex items-center justify-center transition-colors">
                      <div className="w-2 h-2 rounded-sm bg-[#8B5CF6] opacity-0 group-has-[:checked]:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-xs text-gray-400 group-hover:text-gray-300">Remember me</span>
                  </label>
                  <Link href="#" className="text-xs font-semibold text-[#A78BFA] hover:text-[#8B5CF6] transition-colors">
                    Forgot password?
                  </Link>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 mt-4 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-bold transition-all shadow-lg shadow-[#8B5CF6]/25 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:hover:bg-[#8B5CF6] group"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{activeTab === 'login' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500">
                {activeTab === 'login' ? "New here? " : "Already have an account? "}
                <button 
                  type="button"
                  onClick={() => { setActiveTab(activeTab === 'login' ? 'register' : 'login'); setAuthError(null); }}
                  className="font-bold text-[#A78BFA] hover:text-[#8B5CF6] transition-colors"
                >
                  {activeTab === 'login' ? "Create your account" : "Sign In instead"}
                </button>
              </p>
            </div>
            
          </div>
        </div>

      </main>

      {/* Bottom Features Footer - Hidden on very small screens */}
      <footer className="w-full bg-[#0a0a0f] border-t border-white/5 py-4 hidden md:block z-20">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-[#8B5CF6]" />
            <div><span className="text-white font-medium">Secure & Private</span> <span className="opacity-60 ml-1">Your data is 100% safe</span></div>
          </div>
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-[#8B5CF6]" />
            <div><span className="text-white font-medium">Lightning Fast</span> <span className="opacity-60 ml-1">Optimized for speed</span></div>
          </div>
          <div className="flex items-center space-x-2">
            <Cloud className="w-4 h-4 text-[#8B5CF6]" />
            <div><span className="text-white font-medium">Access Anywhere</span> <span className="opacity-60 ml-1">Study on any device</span></div>
          </div>
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-4 h-4 text-[#8B5CF6]" />
            <div><span className="text-white font-medium">Built for Students</span> <span className="opacity-60 ml-1">University exam focused</span></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
