'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Navbar } from '@/components/navbar';
import { useAuth } from '@/components/auth-provider';
import {
  BookOpen,
  ChevronRight,
  Flame,
  Zap,
  Loader2,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  Search,
  Mic,
  GraduationCap,
  Sparkles,
  Layers,
  ChevronLeft,
  FileCheck2,
  Send,
  BookMarked
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const router = useRouter();
  const { user, fbUser, loading: authLoading } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [localCollege, setLocalCollege] = useState<string | null>(null);
  const [localBranch, setLocalBranch] = useState<string | null>(null);
  const [localSemester, setLocalSemester] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [formulaTab, setFormulaTab] = useState<'physics' | 'chemistry' | 'math'>('physics');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLocalCollege(localStorage.getItem('selectedCollege'));
      setLocalBranch(localStorage.getItem('selectedBranch'));
      setLocalSemester(localStorage.getItem('selectedSemester'));
    }
  }, []);

  const hasLocalParams = !!(localCollege && localBranch);

  useEffect(() => {
    if (!authLoading) {
      if (!fbUser && !hasLocalParams) {
        router.push('/login');
      } else if (fbUser && user && !user.onboardingCompleted) {
        router.push('/onboarding');
      }
    }
  }, [user, fbUser, authLoading, hasLocalParams, router]);

  useEffect(() => {
    if (authLoading) return;
    const college = user?.profile?.college || localCollege;
    const branch = user?.profile?.branch || localBranch;
    const semester = user?.profile?.semester || (localSemester ? Number(localSemester) : null);

    if (college && branch) {
      setLoadingSubjects(true);
      const semQuery = semester ? `&semester=${semester}` : '';
      fetch(`/api/subjects?collegeCode=${college}&branchCode=${branch}${semQuery}`)
        .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
        .then((data) => setSubjects(data.subjects || []))
        .catch(() => setSubjects([]))
        .finally(() => setLoadingSubjects(false));
    } else {
      setSubjects([]);
    }
  }, [user, authLoading, localCollege, localBranch, localSemester]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <div className="text-center space-y-3">
          <Loader2 className="w-7 h-7 text-accent animate-spin mx-auto" />
          <p className="text-xs text-text-secondary">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  const activeCollege  = user?.profile?.college  || localCollege  || 'MMMUT';
  const activeBranch   = user?.profile?.branch   || localBranch   || 'CSE';
  const activeSemester = user?.profile?.semester || (localSemester ? Number(localSemester) : 1);
  const activeName     = user?.profile?.name     || user?.displayName || 'Explorer';
  const isCollegeInactive = activeCollege.toUpperCase() !== 'MMMUT';

  // Gamification stats
  const streak = user?.engagement?.streakCount || 2;
  const xp = user?.engagement?.totalXp || 120;
  const sessions = user?.engagement?.sessionsCompleted || 4;
  const dailySolved = user?.engagement?.dailyGoalSolved || 0;
  const dailyTarget = user?.engagement?.dailyGoalTarget || 30;

  // Ordinal helper
  const ordinal = (n: number) => {
    const s = ['th','st','nd','rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const mockFormulaChapters = {
    physics: [
      { name: 'Current Electricity', cards: 39, color: 'border-blue-500/20 bg-blue-500/5 text-blue-400' },
      { name: 'Semiconductors', cards: 51, color: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' },
      { name: 'Alternating Current', cards: 11, color: 'border-pink-500/20 bg-pink-500/5 text-pink-400' },
      { name: 'Rotational Motion', cards: 33, color: 'border-purple-500/20 bg-purple-500/5 text-purple-400' },
      { name: 'Oscillations', cards: 33, color: 'border-sky-500/20 bg-sky-500/5 text-sky-400' },
    ],
    chemistry: [
      { name: 'Chemical Kinetics', cards: 24, color: 'border-amber-500/20 bg-amber-500/5 text-amber-400' },
      { name: 'Coordination Compounds', cards: 42, color: 'border-red-500/20 bg-red-500/5 text-red-400' },
      { name: 'Electrochemistry', cards: 18, color: 'border-indigo-500/20 bg-indigo-500/5 text-indigo-400' },
      { name: 'Solutions', cards: 30, color: 'border-teal-500/20 bg-teal-500/5 text-teal-400' },
    ],
    math: [
      { name: 'Matrices & Determinants', cards: 45, color: 'border-violet-500/20 bg-violet-500/5 text-violet-400' },
      { name: 'Definite Integrals', cards: 62, color: 'border-orange-500/20 bg-orange-500/5 text-orange-400' },
      { name: 'Probability', cards: 37, color: 'border-cyan-500/20 bg-cyan-500/5 text-cyan-400' },
      { name: 'Vector Algebra', cards: 29, color: 'border-rose-500/20 bg-rose-500/5 text-rose-400' },
    ]
  };

  const container = {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };
  const cardVariants = {
    hidden:  { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100, damping: 15 } },
  };

  return (
    <div className="flex min-h-screen bg-bg-primary text-text-primary overflow-hidden relative">
      {/* Background ambient light */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-accent/4 blur-[200px] pointer-events-none" />

      {/* Collapsible Left Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Panel Content */}
      <div className="flex-grow flex flex-col min-h-screen overflow-y-auto z-10">
        {/* Global Navbar */}
        <Navbar onMenuToggle={() => setSidebarOpen(true)} />

        <main className="flex-grow max-w-5xl w-full mx-auto px-6 sm:px-8 py-8 space-y-8">
          {/* Header Row */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-6"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md bg-accent/10 border border-accent/20 text-accent">
                  {activeCollege}
                </span>
                <ChevronRight className="w-3 h-3 text-text-muted" />
                <span className="inline-flex items-center text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md bg-bg-tertiary border border-border-primary text-text-secondary">
                  {activeBranch}
                </span>
                <ChevronRight className="w-3 h-3 text-text-muted" />
                <span className="inline-flex items-center text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md bg-bg-tertiary border border-border-primary text-text-secondary">
                  {ordinal(activeSemester)} Semester
                </span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight leading-none">
                Welcome back, <span className="text-accent">{activeName.split(' ')[0]}</span>! 👋
              </h2>
              <p className="text-xs text-text-secondary leading-relaxed max-w-sm">
                Pick your active course unit or review subject formulas to complete daily challenges.
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="flex items-center gap-2.5 shrink-0">
              {[
                { icon: Flame, label: 'Streak', value: streak, color: 'text-orange-400 bg-orange-400/8 border-orange-400/15' },
                { icon: Zap, label: 'XP Points', value: xp, color: 'text-yellow-400 bg-yellow-400/8 border-yellow-400/15' },
                { icon: TrendingUp, label: 'Sessions', value: sessions, color: 'text-accent bg-accent/8 border-accent/15' },
              ].map(({ icon: Icon, label, value, color }) => (
                <motion.div
                  key={label}
                  whileHover={{ scale: 1.03, y: -1 }}
                  className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl border ${color} min-w-[80px] shadow-sm`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="font-display font-black text-sm leading-none">{value}</span>
                  <span className="text-[8px] uppercase tracking-widest font-black opacity-70">{label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Inactive college warning banner */}
          {isCollegeInactive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-3.5 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-amber-400 text-xs shadow-xs"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">{activeCollege} </span>
                university syllabus configuration is mapping. Switch to <span className="font-bold">MMMUT</span> for full workspaces.{' '}
                <Link href="/onboarding?reset=true" className="underline underline-offset-2 font-bold hover:text-amber-300">Switch Now →</Link>
              </div>
            </motion.div>
          )}

          {/* Daily Goal Progression Line */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-primary flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent" />
                <span>Your Daily Goal ({dailySolved}/{dailyTarget} Questions)</span>
              </h3>
              <span className="text-[10px] font-bold text-text-muted">Almost there! Solve {dailyTarget - dailySolved} more questions to finish.</span>
            </div>
            {/* Visual Milestones Tracker bar */}
            <div className="relative pt-4 pb-2 px-2">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-bg-tertiary -translate-y-1/2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${Math.min(100, (dailySolved / dailyTarget) * 100)}%` }}
                />
              </div>
              <div className="relative flex justify-between items-center z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border text-xs shadow-sm transition-all duration-300 ${dailySolved >= 1 ? 'bg-accent border-transparent text-white' : 'bg-bg-secondary border-border-primary text-text-secondary'}`}>
                  🚀
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border text-xs shadow-sm transition-all duration-300 ${dailySolved >= 15 ? 'bg-accent border-transparent text-white' : 'bg-bg-secondary border-border-primary text-text-secondary'}`}>
                  🏃
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border text-xs shadow-sm transition-all duration-300 ${dailySolved >= 30 ? 'bg-accent border-transparent text-white' : 'bg-bg-secondary border-border-primary text-text-secondary'}`}>
                  🏁
                </div>
              </div>
            </div>
          </motion.div>

          {/* Subjects Directory */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-accent" />
                <h3 className="font-display font-bold text-base">Chapters & Subjects</h3>
                {subjects.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/25">
                    {subjects.length}
                  </span>
                )}
              </div>
              <Link href="/onboarding?reset=true" className="text-[11px] font-semibold text-text-muted hover:text-accent flex items-center gap-0.5">
                Redo Setup <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loadingSubjects ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="animate-pulse h-[140px] rounded-2xl bg-bg-secondary/40 border border-border-primary" />
                ))}
              </div>
            ) : subjects.length > 0 ? (
              <motion.div
                variants={container}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {subjects.map((sub, idx) => (
                  <motion.div key={sub._id} variants={cardVariants} whileHover={{ y: -3 }} className="group">
                    <Link href={`/subjects/${sub._id}`}>
                      <div className="relative h-[140px] rounded-2xl border border-border-primary bg-bg-secondary/50 backdrop-blur-sm p-5 shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        {/* watermark index */}
                        <span className="absolute bottom-4 right-5 font-display font-black text-5xl text-border-primary/40 select-none leading-none group-hover:text-accent/10 transition-colors">
                          {String(idx + 1).padStart(2, '0')}
                        </span>

                        <div className="flex items-start justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-accent/8 border border-accent/15 text-accent">
                            {sub.code}
                          </span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-all duration-200" />
                        </div>

                        <div className="space-y-1 relative z-10">
                          <h4 className="font-display font-extrabold text-sm text-text-primary group-hover:text-accent transition-colors leading-snug line-clamp-2">
                            {sub.name}
                          </h4>
                          <span className="text-[10px] font-semibold text-text-muted">{sub.syllabus?.length || 4} units Mapped</span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="py-16 text-center border border-dashed border-border-primary rounded-2xl bg-bg-secondary/10 space-y-3.5">
                <BookOpen className="w-8 h-8 text-text-muted mx-auto" />
                <p className="text-sm font-bold text-text-secondary">No subjects seeded for this semester</p>
                <Link href="/onboarding?reset=true" className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline">
                  Change Setup <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>

          {/* Formula Cards tabbed sheets section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="font-display font-bold text-base">Formula Cards</h3>
              <span className="text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/15">NEW</span>
            </div>

            <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-5">
              {/* Category tabs */}
              <div className="flex items-center gap-2 border-b border-border-primary/45 pb-3">
                {[
                  { id: 'physics', label: 'Physics', color: 'text-orange-400 bg-orange-400/8 border-orange-400/15' },
                  { id: 'chemistry', label: 'Chemistry', color: 'text-green-400 bg-green-400/8 border-green-400/15' },
                  { id: 'math', label: 'Mathematics', color: 'text-blue-400 bg-blue-400/8 border-blue-400/15' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFormulaTab(tab.id as any)}
                    className={`
                      px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border
                      ${formulaTab === tab.id 
                        ? 'bg-accent/10 border-accent/25 text-accent' 
                        : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/40'
                      }
                    `}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Chapters cheat card slider */}
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
                {mockFormulaChapters[formulaTab].map((ch, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ y: -3 }}
                    className={`flex-shrink-0 w-44 p-4 rounded-xl border flex flex-col justify-between h-28 cursor-pointer transition-all ${ch.color}`}
                  >
                    <h5 className="font-display font-extrabold text-xs leading-snug line-clamp-2">{ch.name}</h5>
                    <div className="flex items-center justify-between text-[9px] font-bold opacity-80">
                      <span>{ch.cards} cards</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Concept search bar & NCERT Toolbox */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Concept notes search block */}
            <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-primary">Concept-wise Notes</h3>
              <p className="text-[10px] text-text-secondary leading-relaxed">Search definitions, mathematical derivations, or concept breakdowns.</p>
              <div className="relative">
                <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Get clarity on any topic..." 
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border-primary bg-bg-primary/50 text-xs font-semibold focus:border-accent transition-colors"
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-accent text-text-muted">
                  <Mic className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Toolbox equivalent */}
            <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-primary">Syllabus Toolbox</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: 'Unit Checklist', emoji: '📝', path: '#' },
                  { name: 'Solved QA Bank', emoji: '📖', path: '#' },
                  { name: 'Weightage Map', emoji: '📊', path: '#' }
                ].map((item, idx) => (
                  <button 
                    key={idx}
                    className="p-3 rounded-xl border border-border-primary bg-bg-primary/40 hover:bg-bg-primary hover:border-accent/25 hover:shadow-xs transition-all flex flex-col items-center justify-center text-center gap-1.5"
                  >
                    <span className="text-sm">{item.emoji}</span>
                    <span className="text-[9px] font-bold text-text-secondary leading-snug">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Assignments promo banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 p-6 rounded-2xl bg-accent text-white flex items-center justify-between relative overflow-hidden group shadow-md">
              {/* Background styling elements */}
              <div className="absolute top-1/2 right-12 -translate-y-1/2 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform" />
              
              <div className="space-y-2 z-10 relative text-left">
                <h3 className="font-display font-black text-lg">PaperHub Assignments</h3>
                <p className="text-xs text-white/80 max-w-sm leading-relaxed">Attempt direct assignments published by college tutors and compare rankings with classmates.</p>
                <button className="px-4 py-2 mt-2 rounded-xl bg-white text-accent hover:bg-white/90 text-xs font-bold transition-all">
                  View Assignments
                </button>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm flex flex-col justify-between h-40">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-accent" />
                <h4 className="font-display font-extrabold text-sm">PaperHub For Teachers</h4>
              </div>
              <p className="text-[10px] text-text-secondary leading-relaxed">Create customized college exam sets, assign mock tests, and track your students' success indices.</p>
              <button className="w-full py-2.5 rounded-xl border border-border-primary hover:bg-bg-tertiary hover:border-accent/35 text-text-primary text-xs font-bold transition-all">
                Explore Now →
              </button>
            </div>
          </div>

          {/* Social media connections footer grid */}
          <div className="pt-6 border-t border-border-primary/50 space-y-4">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-muted text-center">Join our communities</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
              {[
                { 
                  name: 'YouTube', 
                  color: 'hover:text-red-500 hover:bg-red-500/5 hover:border-red-500/20',
                  svg: (
                    <svg className="w-4 h-4 shrink-0 fill-current text-red-500" viewBox="0 0 24 24">
                      <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.516 0-9.387.507A3.003 3.003 0 0 0 .502 6.163C0 8.07 0 12 0 12s0 3.93.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.507 9.387.507 9.387.507s7.517 0 9.387-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.93 24 12 24 12s0-3.93-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  )
                },
                { 
                  name: 'Telegram', 
                  color: 'hover:text-sky-500 hover:bg-sky-500/5 hover:border-sky-500/20',
                  svg: (
                    <svg className="w-4 h-4 shrink-0 fill-current text-sky-400" viewBox="0 0 24 24">
                      <path d="M11.944 0C5.337 0 0 5.337 0 11.944c0 6.608 5.337 11.944 11.944 11.944 6.608 0 11.944-5.336 11.944-11.944C23.888 5.337 18.552 0 11.944 0zm5.83 8.358l-1.99 9.379c-.15.669-.546.832-1.109.516l-3.037-2.238-1.465 1.409c-.162.162-.298.298-.612.298l.218-3.092 5.628-5.084c.245-.218-.053-.339-.38-.122l-6.958 4.382-2.996-.938c-.651-.204-.664-.651.136-.964l11.713-4.514c.542-.197 1.016.128.802.968z"/>
                    </svg>
                  )
                },
                { 
                  name: 'Instagram', 
                  color: 'hover:text-pink-500 hover:bg-pink-500/5 hover:border-pink-500/20',
                  svg: (
                    <svg className="w-4 h-4 shrink-0 stroke-current fill-none stroke-[2] text-pink-400" viewBox="0 0 24 24">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                    </svg>
                  )
                },
                { 
                  name: 'Twitter', 
                  color: 'hover:text-blue-400 hover:bg-blue-400/5 hover:border-blue-400/20',
                  svg: (
                    <svg className="w-4 h-4 shrink-0 fill-current text-blue-400" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  )
                }
              ].map((soc, idx) => (
                <button 
                  key={idx}
                  className={`flex items-center justify-center gap-2.5 py-3 rounded-xl border border-border-primary/65 bg-bg-secondary/45 text-text-secondary text-xs font-bold transition-all ${soc.color}`}
                >
                  {soc.svg}
                  <span>{soc.name}</span>
                </button>
              ))}
            </div>
          </div>
        </main>

        <footer className="border-t border-border-primary/50 py-6 bg-bg-secondary/15 text-center space-y-1">
          <p className="font-display text-[10px] font-black tracking-widest text-text-muted uppercase">Padho chahe kahise, Practice karo PaperHub se</p>
          <p className="text-[10px] text-text-muted">© 2026 Scoremarks Technologies Private Limited</p>
        </footer>
      </div>
    </div>
  );
}
