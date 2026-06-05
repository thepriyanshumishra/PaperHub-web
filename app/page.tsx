'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';

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
  const { user, fbUser, loading: authLoading } = useAuth();
  
  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalSubjects: 0,
    totalSolvedSteps: 0,
    totalActiveBranches: 0,
  });

  const [localCollege, setLocalCollege] = useState<string | null>(null);
  const [localBranch, setLocalBranch] = useState<string | null>(null);

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
              <span>Now Live for MMMUT CSE/IT</span>
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
              We transform scattered PDF PYQs, WhatsApp drive links, and university papers into syllabus-mapped practice, timed focus exams, and step-by-step academic explanations.
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
                <span>Solve Demo Paper</span>
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
              <div className="relative rounded-2xl border border-border-primary bg-bg-secondary/50 backdrop-blur-sm p-7 flex flex-col gap-5 h-full overflow-hidden hover:border-accent/30 hover:bg-bg-secondary/80 hover:shadow-lg transition-all duration-200">
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
              <div className="relative rounded-2xl border border-border-primary bg-bg-secondary/50 backdrop-blur-sm p-7 flex flex-col gap-5 h-full overflow-hidden hover:border-accent/30 hover:bg-bg-secondary/80 hover:shadow-lg transition-all duration-200">
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
              <div className="relative rounded-2xl border border-border-primary bg-bg-secondary/50 backdrop-blur-sm p-7 flex flex-col gap-5 h-full overflow-hidden hover:border-accent/30 hover:bg-bg-secondary/80 hover:shadow-lg transition-all duration-200">
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
              <div className="relative rounded-2xl border border-border-primary bg-bg-secondary/50 backdrop-blur-sm p-7 flex flex-col gap-5 h-full overflow-hidden hover:border-accent/30 hover:bg-bg-secondary/80 hover:shadow-lg transition-all duration-200">
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
              <div className="relative rounded-2xl border border-border-primary bg-bg-secondary/50 backdrop-blur-sm p-7 flex flex-col gap-5 h-full overflow-hidden hover:border-accent/30 hover:bg-bg-secondary/80 hover:shadow-lg transition-all duration-200">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[{n:1,title:'Personalise Syllabus',desc:'Select your college (e.g. MMMUT), branch, and semester. Our system instantly parses the matching syllabi and units.'},{n:2,title:'Interactive Practice',desc:'Solve past exam questions with step-by-step model solutions. Hover over transitions to see the math breakdown, or ask AI doubts.'},{n:3,title:'Timed Focus Exams',desc:'Attempt mock minor or major tests in a secure fullscreen solver. Track pacing against exam standards with active anti-cheat logging.'}].map(({n,title,desc}) => (
              <div key={n} className="group relative">
                <div className="relative rounded-2xl border border-border-primary bg-bg-secondary/50 backdrop-blur-sm p-7 pt-9 overflow-hidden hover:border-accent/30 hover:bg-bg-secondary/80 hover:shadow-lg transition-all duration-200">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="absolute -top-3 left-6 w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-display font-black text-sm shadow-md shadow-accent/25">{n}</span>
                  <h3 className="font-display font-bold text-base mb-2 text-text-primary mt-1">{title}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{desc}</p>
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
                  <p className="font-semibold text-accent mb-1">💡 Step 1: Base Case</p>
                  <p className="text-text-secondary">{`If target $T$ matches elements at index $i$, return $i$. Average complexity is $\\mathcal{O}(N)$`}.</p>
                </div>
                <div className="p-3 rounded-lg bg-bg-secondary/70 text-xs border border-border-primary shadow-sm">
                  <p className="font-semibold text-text-primary mb-1">💬 Student Doubt</p>
                  <p className="text-text-secondary">&quot;Why is average complexity $O(N)$ and not $O(1)$?&quot;</p>
                </div>
                <div className="p-3 rounded-lg bg-accent/10 border border-accent/15 text-xs text-accent shadow-sm">
                  <p className="font-semibold mb-1">🤖 Assistant Reply</p>
                  <p className="text-text-secondary">{`"Average complexity accounts for the element being in the middle, requiring $N/2$ checks, which simplifies to $\\mathcal{O}(N)$."`}</p>
                </div>
              </div>
            </div>
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
            <Link
              href="/onboarding?reset=true"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-accent text-white font-semibold hover:bg-accent-hover transition-all shadow-md hover:scale-[1.02] flex items-center justify-center space-x-2 group"
            >
              <span>Launch Practice Solver</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/onboarding?demo=true"
              className="w-full sm:w-auto px-8 py-4 rounded-xl border border-border-primary bg-bg-primary text-text-primary hover:bg-bg-tertiary transition-all flex items-center justify-center hover:scale-[1.02]"
            >
              <span>View Interactive Demo</span>
            </Link>
          </div>
        </section>
      </main>

      {/* Expanded Multi-Column Footer */}
      <footer className="border-t border-border-primary bg-bg-secondary/40 backdrop-blur-sm py-12 md:py-16 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-display font-bold text-lg shadow-md shadow-accent/20">
                P
              </div>
              <span className="font-display font-bold text-xl tracking-tight group-hover:text-accent transition-colors duration-200">PaperHub</span>
            </Link>
            <p className="text-xs text-text-secondary max-w-sm leading-relaxed">
              PaperHub is a descriptive university exam preparation platform localized for MMMUT. We organize syllabi, past papers, and provide step-by-step guidance.
            </p>
            <div className="text-xs text-text-muted flex items-center space-x-1.5">
              <span>Made with ❤️ for the MMMUT community.</span>
            </div>
          </div>
          <div>
            <h5 className="font-display font-semibold text-xs text-text-primary uppercase tracking-wider mb-4">Resources</h5>
            <ul className="space-y-2.5 text-xs text-text-secondary">
              <li><Link href="/onboarding" className="hover:text-accent transition-colors">Syllabus Archive</Link></li>
              <li><Link href="/onboarding?demo=true" className="hover:text-accent transition-colors">Past Exam Papers</Link></li>
              <li><span className="hover:text-accent transition-colors cursor-pointer">Marking Schemes</span></li>
              <li><span className="hover:text-accent transition-colors cursor-pointer">Academic Calendar</span></li>
            </ul>
          </div>
          <div>
            <h5 className="font-display font-semibold text-xs text-text-primary uppercase tracking-wider mb-4">Features</h5>
            <ul className="space-y-2.5 text-xs text-text-secondary">
              <li><a href="#how-it-works" className="hover:text-accent transition-colors">Preparation Blueprint</a></li>
              <li><a href="#ai-solving" className="hover:text-accent transition-colors">AI Step Solver</a></li>
              <li><Link href="/onboarding" className="hover:text-accent transition-colors">Custom Practice Builder</Link></li>
              <li><span className="hover:text-accent transition-colors cursor-pointer">Fullscreen Test Environment</span></li>
            </ul>
          </div>
          <div>
            <h5 className="font-display font-semibold text-xs text-text-primary uppercase tracking-wider mb-4">Community</h5>
            <ul className="space-y-2.5 text-xs text-text-secondary">
              <li><span className="hover:text-accent transition-colors cursor-pointer">Contribute Papers</span></li>
              <li><span className="hover:text-accent transition-colors cursor-pointer">Bug Report</span></li>
              <li><span className="hover:text-accent transition-colors cursor-pointer">Join Student Discord</span></li>
              <li><span className="hover:text-accent transition-colors cursor-pointer">GitHub Repository</span></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-border-primary/50 flex flex-col md:flex-row items-center justify-between text-xs text-text-secondary">
          <p>© 2026 PaperHub. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <span className="hover:text-accent transition-colors cursor-pointer">Terms of Service</span>
            <span className="hover:text-accent transition-colors cursor-pointer">Privacy Policy</span>
            <span className="hover:text-accent transition-colors cursor-pointer">Honor Code</span>
          </div>
        </div>
      </footer>
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
