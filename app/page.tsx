'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { useAuth } from '@/components/auth-provider';
import { 
  BookOpen, 
  Sparkles, 
  Layers, 
  Award, 
  Clock, 
  ChevronRight, 
  ArrowRight,
  ArrowUpRight,
  TrendingUp,
  Loader2,
  AlertTriangle,
  Map
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Footer } from '@/components/footer';
import { BetaBadge } from '@/components/BetaBadge';
import { PLANS, PLAN_ORDER, FEATURE_LABELS, formatFeatureValue } from '@/lib/pricing';
import { Check, X, ShieldAlert, Zap, Building, HelpCircle, Bot, ChevronDown, ChevronUp } from 'lucide-react';


function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const start = displayValue;
    const end = value;
    if (start === end) return;

    const duration = 800; // 0.8 seconds count up
    const startTime = performance.now();

    let animationFrameId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (easeOutQuad)
      const easeProgress = progress * (2 - progress);
      
      const currentVal = Math.round(start + (end - start) * easeProgress);
      setDisplayValue(currentVal);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{displayValue.toLocaleString()}</>;
}

export default function Home() {
  const router = useRouter();
  const { user, fbUser, loading: authLoading, logout, refreshProfile, error: authError } = useAuth();

  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalSubjects: 0,
    totalSolvedSteps: 0,
    totalActiveBranches: 0,
  });

  const [localCollege, setLocalCollege] = useState<string | null>(null);
  const [localBranch, setLocalBranch] = useState<string | null>(null);

  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free': return <Zap className="w-5 h-5 text-text-muted" />;
      case 'plus': return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case 'pro': return <Sparkles className="w-5 h-5 text-accent" />;
      case 'institution': return <Building className="w-5 h-5 text-emerald-500" />;
      default: return <Sparkles className="w-5 h-5 text-accent" />;
    }
  };


  // Retrieve fallback settings from local storage to check for guest dashboard availability
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLocalCollege(localStorage.getItem('selectedCollege'));
      setLocalBranch(localStorage.getItem('selectedBranch'));
    }
  }, []);

  // Fetch real-time ecosystem stats
  useEffect(() => {
    const fetchStats = () => {
      fetch('/api/stats')
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((data) => {
          setStats({
            totalQuestions: data.totalQuestions,
            totalSubjects: data.totalSubjects,
            totalSolvedSteps: data.totalSolvedSteps,
            totalActiveBranches: data.totalActiveBranches,
          });
        })
        .catch((err) => console.error('Failed to load real-time stats:', err));
    };

    fetchStats();
    
    // Poll for real-time updates every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // Redirect logged-in users to the dashboard or onboarding
  useEffect(() => {
    if (!authLoading && fbUser) {
      if (user?.onboardingCompleted) {
        router.push('/dashboard');
      } else if (user) {
        router.push('/onboarding');
      }
    }
  }, [fbUser, user, authLoading, router]);

  // Handle error case: user has active fbUser but user record failed to sync
  if (!authLoading && fbUser && !user) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6 text-center text-text-primary">
        <div className="max-w-md w-full bg-bg-secondary border border-border-primary rounded-2xl shadow-xl p-8 space-y-6">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display font-bold text-lg text-text-primary">Unable to Sync Profile</h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              We couldn't connect to your PaperHub profile. This might be due to a temporary database issue or network interruption.
            </p>
            {authError && (
              <p className="text-[10px] text-red-400 bg-red-500/5 py-1.5 px-2.5 rounded border border-red-500/10 font-mono inline-block max-w-full truncate">
                Error: {authError}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => refreshProfile()}
              className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-colors flex items-center justify-center space-x-2 shadow-sm"
            >
              <span>Retry Connection</span>
            </button>
            <button
              onClick={() => logout()}
              className="px-5 py-2.5 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-xs font-semibold transition-colors text-text-primary"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Prevent flash of landing page for logged-in users while checking auth
  if (authLoading || fbUser) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const hasLocalParams = !!(localCollege && localBranch);
  const isDashboardVisible = (user && user.onboardingCompleted) || (!fbUser && hasLocalParams);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
      },
    },
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col bg-bg-primary text-text-primary transition-all duration-300">
      {/* Background ambient space glows */}
      <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-accent/5 blur-[150px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/3 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[10%] w-[500px] h-[500px] rounded-full bg-[#7c66ff]/4 blur-[140px] pointer-events-none" />

      <Navbar />

      {/* Hero / Workspace Dynamic Main Panel */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-12 md:py-16 flex flex-col justify-center relative z-10">
        
        {/* Onboarding Incomplete Warning Box */}
        {fbUser && user && !user.onboardingCompleted && (
          <div className="max-w-md w-full mx-auto mb-16 p-8 rounded-3xl border border-accent/20 bg-accent/5 backdrop-blur-md shadow-lg text-center space-y-6">
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mx-auto animate-bounce">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="font-display font-extrabold text-lg text-text-primary">Personalize Your Syllabus</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                You are registered! Let&apos;s map your college syllabus, subjects, and custom PYQ practice workspace in 30 seconds.
              </p>
            </div>
            <Link 
              href="/onboarding"
              className="w-full py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all flex items-center justify-center space-x-2"
            >
              <span>Complete Profile Onboarding</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Dashboard Content Link OR General Hero */}
        {isDashboardVisible ? (
          /* Logged In Premium Landing Hero */
          <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24 space-y-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-accent/25 bg-accent/5 text-accent text-xs font-semibold mb-2 tracking-wide shadow-sm"
            >
              <span>Welcome back, {user?.profile?.name || user?.displayName || 'Explorer'}!</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </motion.div>
            
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-text-primary leading-tight sm:leading-none mb-6"
            >
              Ready to continue your <span className="text-accent dark:gradient-heading">exam preparation?</span>
            </motion.h1>
            
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-lg md:text-xl text-text-secondary leading-relaxed mb-10 font-normal"
            >
              Launch your customized dashboard to access syllabus-mapped past papers, step-by-step AI doubt clearing, and timed focus tests.
            </motion.p>
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex items-center justify-center"
            >
              <Link
                href="/dashboard"
                className="px-8 py-4 rounded-xl bg-accent text-white font-semibold hover:bg-accent-hover transition-all shadow-md hover:scale-[1.02] flex items-center justify-center space-x-2 group"
              >
                <span>Go to Your Dashboard</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </div>
        ) : (
          /* Normal Marketing Hero for Anonymous Guests */
          <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-accent/20 bg-accent/5 text-accent text-xs font-semibold mb-6 tracking-wide shadow-sm"
            >
              <span>Public Beta Live for MMMUT — All Features Free</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </motion.div>

            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-text-primary leading-tight sm:leading-none mb-6"
            >
              Master University Exams, <span className="text-accent dark:gradient-heading">Concept by Concept.</span>
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-lg md:text-xl text-text-secondary leading-relaxed mb-10 font-normal"
            >
              All your university PYQs and syllabus-mapped study materials in a single, premium preparation platform.
            </motion.p>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-accent text-white font-semibold hover:bg-accent-hover transition-all shadow-md hover:scale-[1.02] flex items-center justify-center space-x-2 group"
              >
                <span>Get Started Now</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/onboarding?demo=true"
                className="w-full sm:w-auto px-8 py-4 rounded-xl border border-border-primary bg-bg-secondary/50 backdrop-blur-sm text-text-primary hover:bg-bg-tertiary transition-all flex items-center justify-center space-x-2 hover:scale-[1.02]"
              >
                <span>Try Guest Sandbox</span>
              </Link>
            </motion.div>
          </div>
        )}


        {/* Bento Grid Features */}
        <section id="features" className="scroll-mt-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display text-3xl font-bold text-text-primary mb-4">Core Ecosystem</h2>
            <p className="text-sm text-text-secondary">Designed specifically for the challenges of descriptive examinations.</p>
          </div>
          
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-20 md:mb-28"
          >
            {/* Card 1: Structured PYQs */}
            <motion.div variants={itemVariants} whileHover={{ y: -3 }} className="group relative">
              <div className="relative rounded-2xl border border-border-primary bg-bg-secondary/50 backdrop-blur-sm p-7 flex flex-col gap-5 h-full overflow-hidden hover:border-accent/30 hover:bg-bg-secondary/80 hover:shadow-lg transition-all duration-200 min-h-[160px] flex flex-col justify-center break-words">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <ArrowUpRight className="absolute top-5 right-5 w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                <div className="w-10 h-10 rounded-xl bg-accent/8 border border-accent/15 flex items-center justify-center text-accent">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base mb-1.5 text-text-primary">Structured PYQs</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">No more scrolling random drives. Access past papers neatly organised by units and topics.</p>
                </div>
              </div>
            </motion.div>

            {/* Card 2: Exam-like Tests */}
            <motion.div variants={itemVariants} whileHover={{ y: -3 }} className="group relative">
              <div className="relative rounded-2xl border border-border-primary bg-bg-secondary/50 backdrop-blur-sm p-7 flex flex-col gap-5 h-full overflow-hidden hover:border-accent/30 hover:bg-bg-secondary/80 hover:shadow-lg transition-all duration-200 min-h-[160px] flex flex-col justify-center break-words">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <ArrowUpRight className="absolute top-5 right-5 w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                <div className="w-10 h-10 rounded-xl bg-accent/8 border border-accent/15 flex items-center justify-center text-accent">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base mb-1.5 text-text-primary">Exam-like Tests</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">Simulate actual minor and major exam patterns with custom duration timers and strict focus modes.</p>
                </div>
              </div>
            </motion.div>

            {/* Card 3: AI Step Explanations */}
            <motion.div variants={itemVariants} whileHover={{ y: -3 }} className="group relative">
              <div className="relative rounded-2xl border border-border-primary bg-bg-secondary/50 backdrop-blur-sm p-7 flex flex-col gap-5 h-full overflow-hidden hover:border-accent/30 hover:bg-bg-secondary/80 hover:shadow-lg transition-all duration-200 min-h-[160px] flex flex-col justify-center break-words">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <ArrowUpRight className="absolute top-5 right-5 w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                <div className="w-10 h-10 rounded-xl bg-accent/8 border border-accent/15 flex items-center justify-center text-accent">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base mb-1.5 text-text-primary">AI Step Explanations</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">Hover over any complex derivation or transition step to get a simplified popover explanation.</p>
                </div>
              </div>
            </motion.div>

            {/* Card 4: Topic-wise Practice */}
            <motion.div variants={itemVariants} whileHover={{ y: -3 }} className="group relative">
              <div className="relative rounded-2xl border border-border-primary bg-bg-secondary/50 backdrop-blur-sm p-7 flex flex-col gap-5 h-full overflow-hidden hover:border-accent/30 hover:bg-bg-secondary/80 hover:shadow-lg transition-all duration-200 min-h-[160px] flex flex-col justify-center break-words">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <ArrowUpRight className="absolute top-5 right-5 w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                <div className="w-10 h-10 rounded-xl bg-accent/8 border border-accent/15 flex items-center justify-center text-accent">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base mb-1.5 text-text-primary">Topic-wise Practice</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">Target your weak areas directly by filtering questions by unit and individual syllabus topics.</p>
                </div>
              </div>
            </motion.div>

            {/* Card 5: Most Repeated Questions */}
            <motion.div variants={itemVariants} whileHover={{ y: -3 }} className="group relative">
              <div className="relative rounded-2xl border border-border-primary bg-bg-secondary/50 backdrop-blur-sm p-7 flex flex-col gap-5 h-full overflow-hidden hover:border-accent/30 hover:bg-bg-secondary/80 hover:shadow-lg transition-all duration-200 min-h-[160px] flex flex-col justify-center break-words">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <ArrowUpRight className="absolute top-5 right-5 w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                <div className="w-10 h-10 rounded-xl bg-accent/8 border border-accent/15 flex items-center justify-center text-accent">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base mb-1.5 text-text-primary">Most Repeated Questions</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">Prioritise your prep by tracking question recurrence statistics across multiple exam terms.</p>
                </div>
              </div>
            </motion.div>

            {/* Card 6: Night Before Exam — Coming Soon */}
            <motion.div variants={itemVariants} className="group relative opacity-55">
              <div className="relative rounded-2xl border border-dashed border-border-primary bg-bg-secondary/30 backdrop-blur-sm p-7 flex flex-col gap-5 h-full overflow-hidden cursor-not-allowed">
                <div className="w-10 h-10 rounded-xl bg-border-primary/40 border border-border-primary flex items-center justify-center text-text-muted">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="font-display font-bold text-base text-text-secondary">Night Before Exam</h3>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-500">Soon</span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">A highly curated hyper-focused revision set of the most important concepts to review in the final 12 hours.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="mb-20 md:mb-28 scroll-mt-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display text-3xl font-bold text-text-primary mb-4">Preparation Blueprint</h2>
            <p className="text-sm text-text-secondary">How PaperHub transforms standard university study material into structural exam readiness in three simple steps.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                n: '01',
                title: 'Personalise Syllabus',
                desc: 'Select your college, branch, and semester. Our system instantly parses the matching syllabi and units.',
                icon: Map,
                color: 'from-blue-500/10 to-indigo-500/10'
              },
              {
                n: '02',
                title: 'Interactive Practice',
                desc: 'Solve past exam questions with step-by-step model solutions. Hover over transitions to see the math breakdown, or ask AI doubts.',
                icon: BookOpen,
                color: 'from-accent/10 to-purple-500/10'
              },
              {
                n: '03',
                title: 'Timed Focus Exams',
                desc: 'Attempt mock minor or major tests in a secure fullscreen solver. Track pacing against exam standards with active anti-cheat logging.',
                icon: Clock,
                color: 'from-emerald-500/10 to-teal-500/10'
              }
            ].map(({ n, title, desc, icon: Icon, color }) => (
              <div key={n} className="group relative">
                <div className="relative rounded-[2rem] border border-border-primary bg-bg-secondary/40 backdrop-blur-md p-8 flex flex-col justify-between h-full overflow-hidden hover:border-accent/30 hover:bg-bg-secondary/80 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  {/* Top-right watermark number */}
                  <span className="absolute top-4 right-6 font-display font-black text-4xl text-text-muted/10 tracking-tighter select-none transition-colors group-hover:text-accent/10">{n}</span>
                  
                  <div className="space-y-6">
                    {/* Icon container */}
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} border border-border-primary/50 flex items-center justify-center text-text-primary group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-5 h-5 text-accent" />
                    </div>
                    
                    <div className="space-y-2 text-left">
                      <h3 className="font-display font-extrabold text-lg text-text-primary">{title}</h3>
                      <p className="text-xs text-text-secondary leading-relaxed font-normal">{desc}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Context-Aware AI Assistant Section */}
        <section id="ai-solving" className="mb-20 md:mb-28 scroll-mt-20">
          <div className="p-8 md:p-12 rounded-3xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm flex flex-col lg:flex-row items-center gap-10 shadow-xl shadow-black/10">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-accent/20 bg-accent/5 text-accent text-xs font-semibold shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Llama-3.3 Powered</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-text-primary leading-tight">
                Contextual AI built for Descriptive University Grading.
              </h2>
              <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
                Descriptive university exams are graded on step marking schemes. Unlike generic AI models that just output the final answer or employ unapproved shortcuts, PaperHub AI is explicitly conditioned on your university&apos;s syllabus.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-accent mt-0.5 text-xs font-bold border border-accent/20">✓</div>
                  <div>
                    <h4 className="font-display font-semibold text-sm text-text-primary">Grading Step Marks</h4>
                    <p className="text-xs text-text-secondary mt-0.5">Ensures solutions follow standard textbook derivations required by local examiners.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-accent mt-0.5 text-xs font-bold border border-accent/20">✓</div>
                  <div>
                    <h4 className="font-display font-semibold text-sm text-text-primary">LaTeX Formatting</h4>
                    <p className="text-xs text-text-secondary mt-0.5">All equations and math expressions are beautifully rendered in standard LaTeX block and inline formats.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full lg:w-96 p-6 rounded-2xl border border-border-primary bg-bg-primary/60 backdrop-blur-sm relative overflow-hidden flex-shrink-0 shadow-lg border-border-primary/80">
              <div className="flex items-center justify-between border-b border-border-primary pb-3 mb-4">
                <span className="text-xs font-semibold text-text-secondary">Solution Preview (Linear Search)</span>
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              </div>
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-bg-secondary/70 text-xs border border-border-primary shadow-sm">
                  <p className="font-semibold text-accent mb-1">Q: Write a program to search an element in an array.</p>
                  <p className="text-text-secondary">To perform linear search, we iterate through the index range $[0, N-1]$...</p>
                </div>
                <div className="p-3 rounded-lg bg-accent/5 border border-accent/25 text-xs shadow-sm">
                  <p className="font-semibold text-accent mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Step 1: Base Case</span>
                  </p>
                  <p className="text-text-secondary">{`If target $T$ matches elements at index $i$, return $i$. Average complexity is $\\mathcal{O}(N)$`}.</p>
                </div>
                <div className="p-3 rounded-lg bg-bg-secondary/70 text-xs border border-border-primary shadow-sm">
                  <p className="font-semibold text-text-primary mb-1 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-text-muted" />
                    <span>Student Doubt</span>
                  </p>
                  <p className="text-text-secondary">&quot;Why is average complexity $O(N)$ and not $O(1)$?&quot;</p>
                </div>
                <div className="p-3 rounded-lg bg-accent/10 border border-accent/15 text-xs text-accent shadow-sm">
                  <p className="font-semibold mb-1 flex items-center gap-1.5 text-accent">
                    <Bot className="w-3.5 h-3.5" />
                    <span>Assistant Reply</span>
                  </p>
                  <p className="text-text-secondary">{`"Average complexity accounts for the element being in the middle, requiring $N/2$ checks, which simplifies to $\\mathcal{O}(N)$."`}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="mb-20 md:mb-28 scroll-mt-20">
          <div className="text-center space-y-6 max-w-3xl mx-auto relative mb-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-bold tracking-wide uppercase shadow-[0_0_15px_rgba(139,92,246,0.1)]"
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>Public Beta Launch Offer</span>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="font-display text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-text-primary"
            >
              Invest in your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-hover">academic success.</span>
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-sm md:text-base text-text-secondary leading-relaxed max-w-2xl mx-auto"
            >
              Unlock university sessional mock exams, AI vision evaluation, and detailed student metrics. Get started today with no credit card required.
            </motion.p>
          </div>

          {/* Beta Mode Notice Box */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="p-6 md:p-8 rounded-3xl border border-accent/30 bg-gradient-to-r from-accent/10 via-bg-primary to-accent/10 max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-6 relative overflow-hidden backdrop-blur-xl shadow-2xl mb-12"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent pointer-events-none" />
            <div className="p-4 rounded-2xl bg-accent/20 text-accent shrink-0 shadow-[0_0_30px_rgba(139,92,246,0.2)] border border-accent/30">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="text-center md:text-left space-y-2 relative z-10 flex-grow">
              <h4 className="text-lg font-bold text-text-primary flex items-center justify-center md:justify-start gap-3">
                All Pro Features are Currently Free <BetaBadge size="sm" />
              </h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                We are in launch-readiness mode. All users are automatically granted <strong className="text-accent">Beta Pro</strong> level quotas. No billing profile or subscription setup is required during the beta period. Enjoy unlimited preparation!
              </p>
            </div>
          </motion.div>

          {/* Billing Toggle (Visual only for now) */}
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="flex justify-center mb-12"
          >
            <div className="inline-flex items-center p-1.5 rounded-full bg-bg-secondary border border-border-primary backdrop-blur-md">
              <button 
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${billingCycle === 'monthly' ? 'bg-accent text-white shadow-lg' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-accent text-white shadow-lg' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Yearly <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-400">Save 20%</span>
              </button>
            </div>
          </motion.div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 relative z-20 max-w-7xl mx-auto">
            {PLAN_ORDER.map((planId, index) => {
              const plan = PLANS[planId];
              const isPro = planId === 'pro';
              const isInst = planId === 'institution';
              const isPlus = planId === 'plus';
              
              return (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + (index * 0.1) }}
                  key={planId}
                  className={`relative p-6 rounded-[2rem] flex flex-col justify-between transition-all duration-300 group hover:-translate-y-2 backdrop-blur-xl ${
                    isPro 
                      ? 'border-2 border-accent bg-accent/5 shadow-[0_0_40px_rgba(139,92,246,0.15)]' 
                      : isPlus
                      ? 'border border-blue-500/30 bg-blue-500/5 hover:border-blue-500/50'
                      : 'border border-border-primary bg-bg-secondary/50 hover:border-border-primary/80 hover:bg-bg-secondary'
                  }`}
                >
                  {isPro && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-accent to-accent-hover text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg whitespace-nowrap">
                      Highly Recommended
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* Icon & Plan details */}
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-2xl ${isPro ? 'bg-accent/20' : isPlus ? 'bg-blue-500/20' : 'bg-bg-tertiary'} group-hover:scale-110 transition-transform duration-300`}>
                        {getPlanIcon(planId)}
                      </div>
                    </div>

                    <div className="space-y-2 text-left">
                      <h3 className="text-xl font-bold text-text-primary capitalize">{plan.name}</h3>
                      <p className="text-xs text-text-secondary leading-relaxed min-h-[40px]">{plan.description}</p>
                    </div>

                    {/* Price */}
                    <div className="py-2 text-left">
                      {plan.price === 0 ? (
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-text-primary">₹0</span>
                          <span className="text-xs text-text-muted font-medium">/ forever</span>
                        </div>
                      ) : plan.price === -1 ? (
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-text-primary">Custom</span>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-text-primary">
                            ₹{billingCycle === 'yearly' ? Math.floor(plan.price * 0.8) : plan.price}
                          </span>
                          <span className="text-xs text-text-muted font-medium">/ month</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border-primary pt-6 space-y-4 text-left">
                      <h5 className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted">What's included</h5>
                      <ul className="space-y-3">
                        {FEATURE_LABELS.map(({ key, label, format }) => {
                          const val = plan.features[key];
                          const hasFeature = typeof val === 'boolean' ? val : val !== 0;
                          return (
                            <li key={key} className="flex items-start gap-2.5 text-xs">
                              {hasFeature ? (
                                <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                              ) : (
                                <X className="w-4 h-4 text-text-muted/60 shrink-0 mt-0.5" />
                              )}
                              <span className={hasFeature ? 'text-text-primary' : 'text-text-muted'}>
                                {label}
                                {format !== 'boolean' && (
                                  <>: <strong className={hasFeature ? 'text-text-primary font-bold' : 'text-text-muted font-normal'}>{formatFeatureValue(val)}</strong></>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>

                  {/* CTA button */}
                  <div className="pt-8 mt-auto">
                    <button
                      disabled
                      className={`w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 group-hover:shadow-lg ${
                        isPro
                          ? 'bg-accent text-white shadow-[0_0_20px_rgba(139,92,246,0.2)] cursor-not-allowed opacity-90'
                          : isInst
                          ? 'bg-text-primary text-bg-primary cursor-not-allowed opacity-90'
                          : 'bg-bg-tertiary border border-border-primary text-text-primary cursor-not-allowed'
                      }`}
                    >
                      {isInst ? 'Contact Sales' : 'Active (Beta Free)'}
                      <ArrowRight className="w-4 h-4 opacity-50" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Why Plans Exist Notice */}
          <div className="max-w-4xl mx-auto py-12 text-center space-y-6 mt-8">
            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-accent to-transparent mx-auto opacity-50" />
            <h3 className="text-xl font-bold text-text-primary">Why are we introducing paid plans?</h3>
            <p className="text-text-secondary leading-relaxed text-xs sm:text-sm max-w-3xl mx-auto">
              At PaperHub, we are committed to providing flawlessly verified academic content. To achieve this, we rely on a massive infrastructure ecosystem. This includes immense computing costs for our AI vision evaluation models, fast databases, and secure document storage. <br/><br/>
              Most importantly, it supports our dedicated team of human verifiers, subject-matter experts, question uploaders, and moderators who work tirelessly behind the scenes to curate every single PYQ. Paid plans allow us to sustain these operational costs and keep the platform ad-free, fast, and academically rigorous.
            </p>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="mb-20 md:mb-28 scroll-mt-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display text-3xl font-bold text-text-primary mb-4">Frequently Asked Questions</h2>
            <p className="text-sm text-text-secondary">Everything you need to know about the PaperHub platform.</p>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            <FaqItem 
              question="What is PaperHub?" 
              answer="PaperHub is localized and syllabus-mapped. It is explicitly aligned with the Madan Mohan Malaviya University of Technology syllabus, including standard minor and major descriptive exam formats, repeated questions, and grading styles."
            />
            <FaqItem 
              question="Is PaperHub free for students?" 
              answer="Yes! In the MVP phase, PaperHub is 100% free and utilizes anonymous sessions stored in your browser's local storage so you can start practicing instantly without creating a password or registering."
            />
            <FaqItem 
              question="How does the anti-cheat system work?" 
              answer="During timed mock tests, the solve interface monitors browser visibility, focus losses, and fullscreen status. Swapping tabs or minimizing the browser logs warning counts. These metrics are summarized on your final report sheet for self-assessment."
            />
            <FaqItem 
              question="Can I contribute old exam papers?" 
              answer="Absolutely. We encourage student contributions to expand the static seed files. Reach out using the links in the footer to upload descriptive questions for Maths, C-Programming, or other subjects."
            />
          </div>
        </section>

        {/* Statistics Section */}
        <section className="py-12 border border-border-primary bg-bg-secondary/40 backdrop-blur-sm rounded-2xl px-8 mb-20 shadow-md">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <h4 className="font-display text-3xl md:text-4xl font-bold text-accent mb-1">
                <AnimatedNumber value={stats.totalQuestions} />
              </h4>
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-text-secondary font-semibold">Questions Mapped</p>
            </div>
            <div>
              <h4 className="font-display text-3xl md:text-4xl font-bold text-accent mb-1">
                <AnimatedNumber value={stats.totalSubjects} />
              </h4>
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-text-secondary font-semibold">Subjects Configured</p>
            </div>
            <div>
              <h4 className="font-display text-3xl md:text-4xl font-bold text-accent mb-1">
                <AnimatedNumber value={stats.totalSolvedSteps} />
              </h4>
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-text-secondary font-semibold">Solved Steps Explained</p>
            </div>
            <div>
              <h4 className="font-display text-3xl md:text-4xl font-bold text-accent mb-1">
                <AnimatedNumber value={stats.totalActiveBranches} />
              </h4>
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-text-secondary font-semibold">Active Branches Mapped</p>
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="mb-20 text-center relative rounded-3xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm p-8 md:p-12 overflow-hidden shadow-lg border-border-primary/80">
          <div className="absolute inset-0 bg-accent/5 opacity-40 blur-3xl pointer-events-none"></div>
          <h2 className="font-display text-3xl font-bold text-text-primary mb-4 relative z-10">Ready to Ace Your Exams?</h2>
          <p className="text-sm text-text-secondary max-w-lg mx-auto mb-8 relative z-10 font-normal">Get instant access to MMMUT past papers, syllabus topic filters, and AI assistance. Start practicing in under 30 seconds.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
            <button
              onClick={() => {
                if (fbUser) {
                  router.push('/onboarding?reset=true');
                } else {
                  router.push('/login');
                }
              }}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-accent text-white font-semibold hover:bg-accent-hover transition-all shadow-md hover:scale-[1.02] flex items-center justify-center space-x-2 group"
            >
              <span>Launch Practice Solver</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <Link
              href="/onboarding?demo=true"
              className="w-full sm:w-auto px-8 py-4 rounded-xl border border-border-primary bg-bg-primary text-text-primary hover:bg-bg-tertiary transition-all flex items-center justify-center hover:scale-[1.02]"
            >
              <span>View Interactive Demo</span>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

// Collapsible FAQ Item Component
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-border-primary rounded-xl bg-bg-secondary overflow-hidden transition-colors duration-300">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 text-left font-display font-semibold text-sm sm:text-base flex items-center justify-between hover:text-accent transition-colors"
      >
        <span>{question}</span>
        <span className={`text-xl transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}>+</span>
      </button>
      {isOpen && (
        <div className="px-6 pb-4 text-sm text-text-secondary border-t border-border-primary/50 pt-3">
          {answer}
        </div>
      )}
    </div>
  );
}
