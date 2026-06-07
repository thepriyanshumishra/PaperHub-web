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
        setAuthSuccess('Registration successful! Setting up your workspace...');
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
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#8B5CF6] animate-spin mx-auto" />
          <p className="text-sm text-text-muted font-medium">Securing connection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-bg-primary text-text-primary font-sans selection:bg-accent/30">
      {/* Background ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-[#6D28D9]/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="absolute top-0 inset-x-0 z-50 flex items-center justify-between px-6 lg:px-12 py-6">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center text-text-primary font-bold text-lg shadow-[0_0_20px_rgba(139,92,246,0.4)] group-hover:scale-105 transition-transform duration-300">
            P
          </div>
          <span className="font-bold text-xl tracking-tight text-text-primary/90 group-hover:text-text-primary transition-colors duration-200">PaperHub</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col lg:flex-row items-center justify-center w-full max-w-[1400px] mx-auto px-6 lg:px-12 pt-24 pb-12 lg:py-0 gap-12 lg:gap-24 relative z-10">
        
        {/* Left Panel: Branding & Features */}
        <div className="flex-1 w-full flex flex-col justify-center space-y-10 lg:pl-8 relative z-20 hidden md:flex">
          
          <div className="space-y-6">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-accent/10 border border-[#8B5CF6]/20 text-[#A78BFA] text-[10px] font-bold tracking-[0.2em] uppercase">
              Premium Study Suite
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight text-text-primary leading-[1.1]">
              Study Smarter.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A78BFA] to-[#8B5CF6]">Score Higher.</span>
            </h1>
            
            <p className="text-lg text-text-muted max-w-lg leading-relaxed">
              Access your personalized study space and continue your journey towards academic excellence.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 rounded-xl bg-bg-secondary border border-border-primary flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
                <BookOpen className="w-5 h-5 text-[#A78BFA]" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary/90 text-sm">Smart Practice</h3>
                <p className="text-text-secondary text-xs mt-1 leading-relaxed">Topic-wise questions and PYQs</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 rounded-xl bg-bg-secondary border border-border-primary flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
                <Bot className="w-5 h-5 text-[#A78BFA]" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary/90 text-sm">AI Assistant</h3>
                <p className="text-text-secondary text-xs mt-1 leading-relaxed">Get step-by-step explanations</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 rounded-xl bg-bg-secondary border border-border-primary flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
                <LineChart className="w-5 h-5 text-[#A78BFA]" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary/90 text-sm">Track Progress</h3>
                <p className="text-text-secondary text-xs mt-1 leading-relaxed">Analyze and improve your performance</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 rounded-xl bg-bg-secondary border border-border-primary flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
                <Bookmark className="w-5 h-5 text-[#A78BFA]" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary/90 text-sm">Save & Organize</h3>
                <p className="text-text-secondary text-xs mt-1 leading-relaxed">Bookmarks, notes and quick revision</p>
              </div>
            </div>
          </div>

          {/* Beta Access Badge */}
          <div className="inline-flex items-center space-x-4 bg-bg-secondary border border-border-primary rounded-2xl p-4 w-max backdrop-blur-md">
            <div>
              <p className="text-sm font-semibold text-text-primary">Join the exclusive Beta</p>
              <p className="text-xs text-text-secondary mt-0.5">Secure your early access spot today</p>
            </div>
            <div className="flex items-center -space-x-2">
              <div className="w-8 h-8 rounded-full border-2 border-[#0a0a0f] bg-gray-700 overflow-hidden"><img src="https://i.pravatar.cc/100?img=1" alt="Student" /></div>
              <div className="w-8 h-8 rounded-full border-2 border-[#0a0a0f] bg-gray-700 overflow-hidden"><img src="https://i.pravatar.cc/100?img=2" alt="Student" /></div>
              <div className="w-8 h-8 rounded-full border-2 border-[#0a0a0f] bg-gray-700 overflow-hidden"><img src="https://i.pravatar.cc/100?img=3" alt="Student" /></div>
              <div className="w-8 h-8 rounded-full border-2 border-[#0a0a0f] bg-accent flex items-center justify-center text-[8px] font-bold tracking-wider">EARLY</div>
            </div>
          </div>
        </div>

        {/* Center Graphic Absolute Positioned */}
        <div className="absolute left-[45%] top-[55%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none hidden lg:block opacity-[0.35] z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.15)_0%,transparent_50%)]" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-border-primary rounded-full border-dashed animate-[spin_60s_linear_infinite]" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-[#8B5CF6]/20 rounded-full border-dashed animate-[spin_90s_linear_infinite_reverse]" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 bg-gradient-to-br from-[#A78BFA] to-[#6D28D9] rounded-[2rem] rotate-12 flex items-center justify-center shadow-[0_0_80px_rgba(139,92,246,0.8)] border border-white/20">
             <span className="text-text-primary text-6xl font-black -rotate-12 drop-shadow-md">P</span>
          </div>
        </div>

        {/* Right Panel: Auth Form */}
        <div className="w-full max-w-[440px] shrink-0 z-30">
          <div className="bg-[#12121A]/80 backdrop-blur-2xl border border-border-primary rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            
            {/* Form Glow Line */}
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#8B5CF6]/50 to-transparent" />

            <div className="text-center space-y-2 mb-8">
              <h2 className="text-2xl font-bold text-text-primary">Welcome back!</h2>
              <p className="text-sm text-text-muted">Sign in to continue your learning journey</p>
            </div>

            {/* Toggle Pill */}
            <div className="flex bg-black/40 rounded-xl p-1 mb-8 border border-white/5 relative">
              <button
                onClick={() => { setActiveTab('login'); setAuthError(null); }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all z-10 ${activeTab === 'login' ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary/70'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setActiveTab('register'); setAuthError(null); }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all z-10 ${activeTab === 'register' ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary/70'}`}
              >
                Create Account
              </button>
              
              <motion.div 
                className="absolute inset-y-1 w-[calc(50%-4px)] bg-accent/80 backdrop-blur-md rounded-lg shadow-lg border border-border-primary"
                initial={false}
                animate={{ left: activeTab === 'login' ? '4px' : 'calc(50%)' }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
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
                    <label className="text-xs font-semibold text-text-muted">Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                      <input
                        type="text"
                        placeholder="Enter your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-border-primary bg-black/20 focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] outline-none text-sm text-text-primary placeholder:text-gray-600 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-muted">Username</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary text-sm font-bold">@</span>
                      <input
                        type="text"
                        placeholder="unique_username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        className="w-full pl-9 pr-4 py-3 rounded-xl border border-border-primary bg-black/20 focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] outline-none text-sm text-text-primary placeholder:text-gray-600 transition-all"
                        required
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-muted">
                  {activeTab === 'login' ? 'Email Address or Username' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                  <input
                    type={activeTab === 'login' ? 'text' : 'email'}
                    placeholder={activeTab === 'login' ? 'name@university.edu' : 'name@university.edu'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border-primary bg-black/20 focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] outline-none text-sm text-text-primary placeholder:text-gray-600 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-muted">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                  <input
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border-primary bg-black/20 focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] outline-none text-sm text-text-primary placeholder:text-gray-600 transition-all"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              {activeTab === 'login' && (
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <div className="w-4 h-4 rounded border border-white/20 bg-black/20 group-hover:border-[#8B5CF6] flex items-center justify-center transition-colors">
                      <div className="w-2 h-2 rounded-sm bg-accent opacity-0 group-has-[:checked]:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-xs text-text-muted group-hover:text-gray-300">Remember me</span>
                  </label>
                  <Link href="#" className="text-xs font-semibold text-[#A78BFA] hover:text-[#8B5CF6] transition-colors">
                    Forgot password?
                  </Link>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 mt-4 rounded-xl bg-accent hover:bg-[#7C3AED] text-text-primary text-sm font-bold transition-all shadow-lg shadow-[#8B5CF6]/25 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:hover:bg-accent group"
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
              <p className="text-xs text-text-secondary">
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
      <footer className="w-full bg-bg-primary border-t border-white/5 py-4 hidden md:block z-20">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-[#8B5CF6]" />
            <div><span className="text-text-primary font-medium">Secure & Private</span> <span className="opacity-60 ml-1">Your data is 100% safe</span></div>
          </div>
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-[#8B5CF6]" />
            <div><span className="text-text-primary font-medium">Lightning Fast</span> <span className="opacity-60 ml-1">Optimized for speed</span></div>
          </div>
          <div className="flex items-center space-x-2">
            <Cloud className="w-4 h-4 text-[#8B5CF6]" />
            <div><span className="text-text-primary font-medium">Access Anywhere</span> <span className="opacity-60 ml-1">Study on any device</span></div>
          </div>
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-4 h-4 text-[#8B5CF6]" />
            <div><span className="text-text-primary font-medium">Built for Students</span> <span className="opacity-60 ml-1">University exam focused</span></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
