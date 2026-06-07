'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Navbar } from '@/components/navbar';
import { useAuth } from '@/components/auth-provider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Home as HomeIcon, 
  ChevronRight, 
  BookOpen, 
  Loader2, 
  Book, 
  Sliders, 
  Zap, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  Flame,
  Award,
  // Icons mapping
  Atom,
  Calculator,
  Cpu,
  Code,
  Globe,
  Database,
  FlaskConical,
  Leaf,
  MessageSquare,
  Radio,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Subject Theme Resolver ---
function getSubjectTheme(name: string, code: string = '') {
  const n = name.toLowerCase();
  const c = code.toUpperCase();
  let icon = BookOpen;
  let colorClass = 'text-purple-500 bg-purple-500/10 border-purple-500/20';
  let activeClass = 'border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.15)] bg-purple-500/5';
  let badgeBg = 'bg-purple-500';

  if (n.includes('math') || n.includes('calculus') || n.includes('algebra') || n.includes('statistics') || n.includes('numerical') || c.startsWith('MA') || c.startsWith('MATH') || c === 'M1' || c === 'M2' || c === 'M3' || c === 'M4') {
    icon = Calculator;
    colorClass = 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20';
    activeClass = 'border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.15)] bg-cyan-500/5';
    badgeBg = 'bg-cyan-500';
  } else if (n.includes('physics') || n.includes('quantum') || n.includes('optics') || n.includes('engineering physics') || c.startsWith('PH') || c.startsWith('PHYS')) {
    icon = Atom;
    colorClass = 'text-purple-500 bg-purple-500/10 border-purple-500/20';
    activeClass = 'border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.15)] bg-purple-500/5';
    badgeBg = 'bg-purple-500';
  } else if (n.includes('chemistry') || n.includes('chemical') || n.includes('green chemistry') || c.startsWith('CH') || c.startsWith('CHEM')) {
    icon = FlaskConical;
    colorClass = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    activeClass = 'border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)] bg-emerald-500/5';
    badgeBg = 'bg-emerald-500';
  } else if (n.includes('programming') || n.includes('python') || n.includes('java') || n.includes('c++') || n.includes('c program') || n.includes('object oriented') || c.startsWith('CS') || c.startsWith('CSE') || c === 'PPS') {
    icon = Code;
    colorClass = 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    activeClass = 'border-orange-500/60 shadow-[0_0_15px_rgba(249,115,22,0.15)] bg-orange-500/5';
    badgeBg = 'bg-orange-500';
  } else if (n.includes('environmental') || n.includes('ecology') || n.includes('sustainability') || c.startsWith('EV') || c.startsWith('EVS')) {
    icon = Leaf;
    colorClass = 'text-green-500 bg-green-500/10 border-green-500/20';
    activeClass = 'border-green-500/60 shadow-[0_0_15px_rgba(34,197,94,0.15)] bg-green-500/5';
    badgeBg = 'bg-green-500';
  } else if (n.includes('electrical') || n.includes('circuit') || n.includes('power system') || c.startsWith('EE') || c.startsWith('EEE') || c === 'BEE') {
    icon = Zap;
    colorClass = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    activeClass = 'border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)] bg-amber-500/5';
    badgeBg = 'bg-amber-500';
  } else if (n.includes('web') || n.includes('internet') || n.includes('html')) {
    icon = Globe;
    colorClass = 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    activeClass = 'border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.15)] bg-blue-500/5';
    badgeBg = 'bg-blue-500';
  } else if (n.includes('database') || n.includes('dbms') || n.includes('sql') || c === 'DBMS') {
    icon = Database;
    colorClass = 'text-teal-500 bg-teal-500/10 border-teal-500/20';
    activeClass = 'border-teal-500/60 shadow-[0_0_15px_rgba(20,184,166,0.15)] bg-teal-500/5';
    badgeBg = 'bg-teal-500';
  } else if (n.includes('technical writing') || n.includes('communication skill') || n.includes('english') || n.includes('professional communication')) {
    icon = MessageSquare;
    colorClass = 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    activeClass = 'border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.15)] bg-rose-500/5';
    badgeBg = 'bg-rose-500';
  }

  return { icon, colorClass, activeClass, badgeBg };
}

export default function PracticePage() {
  const router = useRouter();
  const { user, fbUser, loading: authLoading } = useAuth();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  
  const [startingSession, setStartingSession] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync parameters & validation guards
  const activeBranch = user?.profile?.branch || (typeof window !== 'undefined' ? localStorage.getItem('selectedBranch') : '') || '';
  const activeSemester = user?.profile?.semester || (typeof window !== 'undefined' ? Number(localStorage.getItem('selectedSemester') || 1) : 1);
  const activeCollege = user?.profile?.college || (typeof window !== 'undefined' ? localStorage.getItem('selectedCollege') : '') || 'MMMUT';
  const hasLocalParams = !!(activeCollege && activeBranch);

  useEffect(() => {
    if (!authLoading) {
      if (!fbUser && !hasLocalParams) {
        router.push('/login');
      } else if (fbUser && user && user.role === 'student' && !user.onboardingCompleted) {
        router.push('/onboarding');
      }
    }
  }, [user, fbUser, authLoading, hasLocalParams, router]);

  // Load subjects
  useEffect(() => {
    if (!mounted || authLoading) return;
    const fetchSubjects = async () => {
      try {
        setLoadingSubjects(true);
        const res = await fetch(`/api/subjects?collegeCode=${activeCollege}&branchCode=${activeBranch || 'CSE'}&semester=${activeSemester || 1}`);
        if (res.ok) {
          const data = await res.json();
          setSubjects(data.subjects || []);
          if (data.subjects && data.subjects.length > 0) {
            setSelectedSubjectId(data.subjects[0]._id);
          }
        }
      } catch (err) {
        console.error('Failed to load active subjects:', err);
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, [mounted, authLoading, activeCollege, activeBranch, activeSemester]);

  // Fetch real analytics for progress
  useEffect(() => {
    if (!fbUser) return;
    fbUser.getIdToken()
      .then((token: string) => fetch('/api/users/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      }))
      .then((res: any) => res.ok ? res.json() : null)
      .then((data: any) => {
        if (data) setAnalytics(data);
      })
      .catch((err: any) => console.error('Failed to load user analytics:', err));
  }, [fbUser]);

  // Quick solving full syllabus mock session
  const startFullSyllabusPractice = async (subj: any) => {
    if (!subj) return;
    const isLocalFallback = localStorage.getItem('useLocalFallback') === 'true';
    if (isLocalFallback) {
      router.push(`/subjects/${subj._id}/practice/solve?type=syllabus&units=all`);
    } else {
      try {
        setStartingSession(true);
        const token = fbUser ? await fbUser.getIdToken() : '';
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            userId: localStorage.getItem('anonymousUserId') || 'guest',
            subjectId: subj._id,
            type: 'practice',
            subType: 'syllabus',
            config: {
              units: subj.syllabus ? subj.syllabus.map((u: any) => u.unitNumber) : [],
              topics: [],
              questionCount: 5
            }
          })
        });
        const data = await res.json();
        if (data.session) {
          router.push(`/subjects/${subj._id}/practice/solve?sessionId=${data.session._id}`);
        } else {
          router.push(`/subjects/${subj._id}/practice/solve?type=syllabus&units=all`);
        }
      } catch {
        router.push(`/subjects/${subj._id}/practice/solve?type=syllabus&units=all`);
      } finally {
        setStartingSession(false);
      }
    }
  };

  const selectedSubject = subjects.find(s => s._id === selectedSubjectId);

  // Daily statistics metrics
  const dailySolved = user?.engagement?.dailyGoalSolved ?? analytics?.metrics?.dailyGoalSolved ?? 0;
  const dailyTarget = user?.engagement?.dailyGoalTarget ?? analytics?.metrics?.dailyGoalTarget ?? 30;
  const progressPercent = dailyTarget > 0 ? Math.min(100, Math.round((dailySolved / dailyTarget) * 100)) : 0;
  const streakCount = analytics?.metrics?.streakCount ?? user?.engagement?.streakCount ?? 0;

  if (authLoading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <div className="text-center space-y-3">
          <Loader2 className="w-7 h-7 text-purple-500 animate-spin mx-auto" />
          <p className="text-xs text-text-secondary">Loading Practice Arena...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary overflow-hidden relative">
      {/* Ambient glow in dark mode */}
      <div className="hidden dark:block fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[550px] rounded-full bg-purple-900/10 blur-[180px] pointer-events-none -z-10" />

      {/* Sidebar navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        streakCount={streakCount}
        streakDays={analytics?.metrics?.streakDays}
      />

      <div className="flex-grow flex flex-col h-full overflow-y-auto z-10">
        
        {/* Top Header Bar */}
        <Navbar onMenuToggle={() => setSidebarOpen(true)} />

        {/* Practice Main Layout */}
        <main className="flex-grow max-w-5xl w-full mx-auto px-6 sm:px-8 py-8 space-y-8">
          
          {/* Breadcrumbs */}
          <div className="flex items-center space-x-1.5 text-xs text-text-secondary font-medium">
            <Link href="/dashboard" className="hover:text-text-primary flex items-center gap-1 transition-colors">
              <HomeIcon className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-text-muted" />
            <span className="text-text-primary font-bold">Practice</span>
          </div>

          {/* Title Section */}
          <div className="space-y-1 text-left">
            <h1 className="font-display font-black text-2xl tracking-tight">Practice Arena</h1>
            <p className="text-xs text-text-secondary">Improve subject clarity through step-by-step AI solutions</p>
          </div>

          {/* Quick Stats Banner */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Daily Goal card */}
            <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary flex flex-col justify-between h-28">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Today's Goal</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-xl font-display font-black text-text-primary">{dailySolved} / {dailyTarget}</span>
                  <span className="text-[10px] text-purple-400 font-bold">{progressPercent}%</span>
                </div>
                <div className="h-1.5 bg-bg-tertiary border border-border-primary/50 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </div>

            {/* Streak card */}
            <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary flex flex-col justify-between h-28">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Active Streak</span>
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xl font-display font-black text-text-primary">{streakCount} Days</h3>
                <p className="text-[9px] text-text-muted">Keep practicing daily to grow your streak!</p>
              </div>
            </div>

            {/* Accuracy card */}
            <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary flex flex-col justify-between h-28">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Prep Status</span>
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xl font-display font-black text-text-primary">
                  {analytics?.metrics?.accuracy ? `${analytics.metrics.accuracy}%` : 'Good'}
                </h3>
                <p className="text-[9px] text-text-muted">Calculated based on solved attempts</p>
              </div>
            </div>
          </section>

          {/* Subject Picker Section */}
          <section className="space-y-4 text-left">
            <div className="space-y-1">
              <h2 className="text-xs uppercase font-black tracking-wider text-text-secondary">1. Choose a Subject</h2>
              <p className="text-[10px] text-text-muted">Select from your enrolled semester subjects to practice</p>
            </div>

            {loadingSubjects ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5].map(n => (
                  <div key={n} className="animate-pulse h-32 bg-bg-tertiary border border-border-primary/50 rounded-2xl" />
                ))}
              </div>
            ) : subjects.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {subjects.map((sub) => {
                  const themeProps = getSubjectTheme(sub.name, sub.code);
                  const Icon = themeProps.icon;
                  const isSelected = sub._id === selectedSubjectId;

                  return (
                    <button
                      key={sub._id}
                      onClick={() => setSelectedSubjectId(sub._id)}
                      className={`p-4 rounded-2xl border flex flex-col justify-between items-start h-32 text-left transition-all duration-200 group relative
                        ${isSelected
                          ? themeProps.activeClass + ' border-accent ring-1 ring-accent/35 scale-[1.02]'
                          : 'bg-bg-secondary/40 border-border-primary hover:bg-bg-tertiary/20'
                        }`}
                    >
                      <div className={`p-2 rounded-lg ${themeProps.colorClass} flex items-center justify-center shrink-0`}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="w-full min-w-0 space-y-0.5">
                        <h4 className="text-xs font-black text-text-primary leading-tight truncate group-hover:text-accent transition-colors">
                          {sub.name}
                        </h4>
                        <p className="text-[9px] text-text-muted font-bold">
                          {sub.syllabus?.length || 0} Units
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center border border-dashed border-border-primary rounded-2xl bg-bg-secondary/20 text-xs text-text-muted">
                No active subjects found for this semester. Make sure your onboarding details are correct.
              </div>
            )}
          </section>

          {/* Mode Selection Section */}
          <AnimatePresence mode="wait">
            {selectedSubject && (
              <motion.section
                key={selectedSubject._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-5 text-left border-t border-border-primary/40 pt-6"
              >
                <div className="space-y-1">
                  <h2 className="text-xs uppercase font-black tracking-wider text-text-secondary">2. Select Practice Mode for {selectedSubject.code}</h2>
                  <p className="text-[10px] text-text-muted">Pick a practice style to generated your session questions</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-4xl">
                  
                  {/* Option 1: Full Syllabus Set */}
                  <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-xs flex flex-col justify-between items-start gap-4 hover:border-accent/40 transition-all duration-300 relative group overflow-hidden h-48">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-accent/5 to-transparent rounded-bl-full pointer-events-none group-hover:from-accent/12 transition-all duration-300" />
                    
                    <div className="space-y-3 relative z-10 flex-grow">
                      <div className="w-10 h-10 rounded-xl bg-accent/5 border border-accent/20 flex items-center justify-center text-accent">
                        <Book className="w-5 h-5 group-hover:scale-105 transition-transform" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-display font-bold text-sm text-text-primary group-hover:text-accent transition-colors flex items-center gap-1">
                          Full Syllabus Set
                          <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        </h3>
                        <p className="text-[10px] text-text-secondary leading-relaxed">
                          Generate a fast 5-question mock paper compiled across all syllabus units. Ideal for end-of-semester practice.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => startFullSyllabusPractice(selectedSubject)}
                      disabled={startingSession}
                      className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 relative z-10 disabled:opacity-50"
                    >
                      {startingSession ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating Session...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          <span>Start Quick Practice</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Option 2: Custom Builder */}
                  <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-xs flex flex-col justify-between items-start gap-4 hover:border-accent/40 transition-all duration-300 relative group overflow-hidden h-48">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-accent/5 to-transparent rounded-bl-full pointer-events-none group-hover:from-accent/12 transition-all duration-300" />
                    
                    <div className="space-y-3 relative z-10 flex-grow">
                      <div className="w-10 h-10 rounded-xl bg-accent/5 border border-accent/20 flex items-center justify-center text-accent">
                        <Sliders className="w-5 h-5 group-hover:scale-105 transition-transform" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-display font-bold text-sm text-text-primary group-hover:text-accent transition-colors flex items-center gap-1">
                          Custom Practice Builder
                          <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        </h3>
                        <p className="text-[10px] text-text-secondary leading-relaxed">
                          Manually select specific units, filter target topics, and customize your question count to focus on weak areas.
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/subjects/${selectedSubject._id}/practice/custom`}
                      className="w-full py-2.5 rounded-xl border border-border-primary bg-bg-secondary hover:border-accent/30 hover:text-accent hover:bg-bg-tertiary/20 text-text-secondary text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 relative z-10"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Open Custom Builder</span>
                    </Link>
                  </div>

                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Footer Text */}
          <div className="py-6 text-center text-text-muted text-[10px] font-bold flex items-center justify-center gap-1.5 select-none">
            <span>Choose practice style to load the dynamic exam preparation interface.</span>
          </div>

        </main>
      </div>
    </div>
  );
}
