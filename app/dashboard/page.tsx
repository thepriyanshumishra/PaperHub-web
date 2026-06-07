'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { useAuth } from '@/components/auth-provider';
import { Navbar } from '@/components/navbar';
import {
  Search, ChevronRight,
  BookOpen, CheckCircle2, XCircle, Clock, ArrowRight, Menu, X,
  Loader2, ArrowUpRight, Sparkles,
  // Subject icons — semantically matched
  Atom,           // Physics, Quantum
  Calculator,     // Mathematics
  Zap,            // Electrical, Power, Circuits
  Cpu,            // Microprocessors, Computer Arch, Digital
  Code,           // Programming, C, Java, Python
  Globe,          // Web Design, Internet, Networking
  Database,       // DBMS, SQL, Data
  FlaskConical,   // Chemistry, Environmental Science
  Leaf,           // Environmental, Green
  MessageSquare,  // Technical Writing, Communication, English
  Wrench,         // Mechanics, Manufacturing, Workshop
  Flame,          // Thermodynamics, Heat Transfer
  Droplets,       // Fluid Mechanics, Hydraulics
  Building2,      // Civil, Structures, Construction
  Brain,          // AI, ML, Data Science
  Network,        // Computer Networks, Graph Theory
  BarChart2,      // Economics, Statistics, Management
  Shield,         // Cybersecurity, Ethics, Values
  Binary,         // Digital Electronics, Logic
  Radio,          // Communication Systems, Signals
  Layers,         // Material Science, OS, Stacks
  GitBranch,      // Data Structures, Algorithms
  PenLine,        // Drawing, Engineering Drawing
  Microscope,     // Biotechnology, Applied Science
  Activity,       // Signals & Systems, Biomedical
  FileText,       // General fallback
  Monitor,        // General fallback
  Grid,           // General fallback
} from 'lucide-react';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const { user, fbUser, loading: authLoading } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [localCollege, setLocalCollege] = useState<string | null>(null);
  const [localBranch, setLocalBranch] = useState<string | null>(null);
  const [localSemester, setLocalSemester] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // User Analytics states for real practice progress
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Advanced Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);



  // Trigger search on mount/change if query parameter is present in URL
  useEffect(() => {
    if (queryParam.trim() && fbUser) {
      setSearchQuery(queryParam.trim());
      setSearching(true);
      setShowSearchModal(true);
      fbUser.getIdToken().then((token: string) => {
        fetch(`/api/questions/search?q=${encodeURIComponent(queryParam.trim())}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
          .then((data) => setSearchResults(data.questions || []))
          .catch((err) => console.error(err))
          .finally(() => setSearching(false));
      });
    }
  }, [queryParam, fbUser]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLocalCollege(localStorage.getItem('selectedCollege'));
      setLocalBranch(localStorage.getItem('selectedBranch'));
      setLocalSemester(localStorage.getItem('selectedSemester'));
    }
  }, []);

  // Hash scroll listener for nested overflow layout container
  useEffect(() => {
    const handleHashScroll = () => {
      const hash = window.location.hash;
      if (hash) {
        const id = hash.replace('#', '');
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };

    if (typeof window !== 'undefined') {
      const timer = setTimeout(handleHashScroll, 350);
      window.addEventListener('hashchange', handleHashScroll);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('hashchange', handleHashScroll);
      };
    }
  }, [subjects]);

  const hasLocalParams = !!(localCollege && localBranch);

  useEffect(() => {
    if (!authLoading) {
      if (!fbUser && !hasLocalParams) {
        // No session at all — send to login
        router.push('/login');
      } else if (fbUser && user && user.role === 'student' && !user.onboardingCompleted) {
        // Verified but onboarding not completed (student only)
        router.push('/onboarding');
      }
    }
  }, [user, fbUser, authLoading, hasLocalParams, router]);

  // Load subjects
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

  // Fetch real analytics and topic progress
  useEffect(() => {
    if (!fbUser) return;
    setLoadingAnalytics(true);
    fbUser.getIdToken()
      .then((token: string) => fetch('/api/users/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      }))
      .then((res: any) => res.ok ? res.json() : null)
      .then((data: any) => {
        if (data) setAnalytics(data);
      })
      .catch((err: any) => console.error('Failed to load user analytics:', err))
      .finally(() => setLoadingAnalytics(false));
  }, [fbUser]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !fbUser) return;
    setSearching(true);
    setShowSearchModal(true);

    try {
      const token = await fbUser.getIdToken();
      const res = await fetch(`/api/questions/search?q=${encodeURIComponent(searchQuery.trim())}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.questions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };




  // Gamification Metrics (Derived from User Profile and Analytics)
  const dailySolved = user?.engagement?.dailyGoalSolved ?? analytics?.metrics?.dailyGoalSolved ?? 0;
  const dailyTarget = user?.engagement?.dailyGoalTarget ?? analytics?.metrics?.dailyGoalTarget ?? 30;
  const incorrectCount = user?.incorrectAttempts?.length ?? 0;
  const estimatedTimeSpent = Math.max(0, dailySolved * 2); // 2 minutes average per question solved today
  const progressPercent = dailyTarget > 0 ? Math.min(100, Math.round((dailySolved / dailyTarget) * 100)) : 0;

  // -------------------------------------------------------------
  // Theme and Icon Resolver based on Subject Name
  // -------------------------------------------------------------
  const getSubjectCardStyles = (name: string, code: string) => {
    const n = name.toLowerCase();
    const c = code.toUpperCase();

    // ── Mathematics ─────────────────────────────────────────────
    if (n.includes('math') || n.includes('calculus') || n.includes('algebra') ||
        n.includes('statistics') || n.includes('numerical') || n.includes('discrete math') ||
        c.startsWith('MA') || c.startsWith('MATH') || c === 'M1' || c === 'M2' || c === 'M3' || c === 'M4')
      return { icon: Calculator, colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20', arrowColor: 'border-blue-400/40 text-blue-400 hover:bg-blue-400/10', progressBarColor: 'bg-blue-500' };

    // ── Physics ─────────────────────────────────────────────────
    if (n.includes('physics') || n.includes('quantum') || n.includes('optics') ||
        n.includes('mechanics of solids') || n.includes('engineering physics') ||
        c.startsWith('PH') || c.startsWith('PHYS'))
      return { icon: Atom, colorClass: 'text-violet-400 bg-violet-500/10 border-violet-500/20', arrowColor: 'border-violet-400/40 text-violet-400 hover:bg-violet-400/10', progressBarColor: 'bg-violet-500' };

    // ── Chemistry & Environmental Science ───────────────────────
    if (n.includes('chemistry') || n.includes('chemical') || n.includes('green chemistry') ||
        n.includes('applied chemistry') || c.startsWith('CH') || c.startsWith('CHEM'))
      return { icon: FlaskConical, colorClass: 'text-teal-400 bg-teal-500/10 border-teal-500/20', arrowColor: 'border-teal-400/40 text-teal-400 hover:bg-teal-400/10', progressBarColor: 'bg-teal-500' };

    if (n.includes('environmental') || n.includes('ecology') || n.includes('sustainability') ||
        n.includes('pollution') || c.startsWith('EV') || c.startsWith('EVS'))
      return { icon: Leaf, colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', arrowColor: 'border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10', progressBarColor: 'bg-emerald-500' };

    // ── Electrical & Power ───────────────────────────────────────
    if (n.includes('electrical') || n.includes('circuit') || n.includes('power system') ||
        n.includes('electric machine') || n.includes('emf') || n.includes('electromagnetic') ||
        c.startsWith('EE') || c.startsWith('EEE') || c === 'BEE')
      return { icon: Zap, colorClass: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', arrowColor: 'border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/10', progressBarColor: 'bg-yellow-500' };

    // ── Electronics & Digital ────────────────────────────────────
    if (n.includes('digital') || n.includes('logic design') || n.includes('vlsi') ||
        n.includes('digital signal') || n.includes('boolean') || (c.startsWith('EC') && (n.includes('digital') || n.includes('logic'))))
      return { icon: Binary, colorClass: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', arrowColor: 'border-indigo-400/40 text-indigo-400 hover:bg-indigo-400/10', progressBarColor: 'bg-indigo-500' };

    if (n.includes('electronic') || n.includes('analog') || n.includes('amplifier') ||
        n.includes('semiconductor') || n.includes('diode') || n.includes('transistor') ||
        c.startsWith('EC') || c.startsWith('ECE') || c === 'DEC')
      return { icon: Cpu, colorClass: 'text-sky-400 bg-sky-500/10 border-sky-500/20', arrowColor: 'border-sky-400/40 text-sky-400 hover:bg-sky-400/10', progressBarColor: 'bg-sky-500' };

    // ── Microprocessors & Computer Architecture ──────────────────
    if (n.includes('microprocessor') || n.includes('microcontroller') || n.includes('embedded') ||
        n.includes('computer architecture') || n.includes('computer organization') ||
        c === 'MP' || c === 'MC' || c === 'COA')
      return { icon: Cpu, colorClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', arrowColor: 'border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10', progressBarColor: 'bg-cyan-500' };

    // ── Communication & Signals ──────────────────────────────────
    if (n.includes('communication') || n.includes('signal') || n.includes('wireless') ||
        n.includes('antenna') || n.includes('modulation') || n.includes('satellite'))
      return { icon: Radio, colorClass: 'text-pink-400 bg-pink-500/10 border-pink-500/20', arrowColor: 'border-pink-400/40 text-pink-400 hover:bg-pink-400/10', progressBarColor: 'bg-pink-500' };

    // ── Programming Languages ────────────────────────────────────
    if (n.includes('programming') || n.includes('python') || n.includes('java') ||
        n.includes('c++') || n.includes('c program') || n.includes('coding') ||
        n.includes('object oriented') || n.includes('oop') || c.startsWith('CS') || c.startsWith('CSE') || c === 'PPS')
      return { icon: Code, colorClass: 'text-orange-400 bg-orange-500/10 border-orange-500/20', arrowColor: 'border-orange-400/40 text-orange-400 hover:bg-orange-400/10', progressBarColor: 'bg-orange-500' };

    // ── Web & Internet ───────────────────────────────────────────
    if (n.includes('web') || n.includes('internet') || n.includes('html') ||
        n.includes('css') || n.includes('javascript') || n.includes('full stack'))
      return { icon: Globe, colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20', arrowColor: 'border-blue-400/40 text-blue-400 hover:bg-blue-400/10', progressBarColor: 'bg-blue-400' };

    // ── Data Structures & Algorithms ─────────────────────────────
    if (n.includes('data structure') || n.includes('algorithm') || n.includes('dsa') ||
        n.includes('graph theory') || n.includes('combinatorics') || c === 'DSA')
      return { icon: GitBranch, colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20', arrowColor: 'border-amber-400/40 text-amber-400 hover:bg-amber-400/10', progressBarColor: 'bg-amber-500' };

    // ── Database & Information Systems ───────────────────────────
    if (n.includes('database') || n.includes('dbms') || n.includes('sql') ||
        n.includes('information system') || n.includes('data management') || c === 'DBMS')
      return { icon: Database, colorClass: 'text-lime-400 bg-lime-500/10 border-lime-500/20', arrowColor: 'border-lime-400/40 text-lime-400 hover:bg-lime-400/10', progressBarColor: 'bg-lime-500' };

    // ── Computer Networks ────────────────────────────────────────
    if (n.includes('network') || n.includes('tcp') || n.includes('ip protocol') ||
        n.includes('lan') || n.includes('wan') || n.includes('routing') || c === 'CN')
      return { icon: Network, colorClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', arrowColor: 'border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10', progressBarColor: 'bg-cyan-500' };

    // ── AI / ML / Data Science ───────────────────────────────────
    if (n.includes('artificial intelligence') || n.includes('machine learning') ||
        n.includes('deep learning') || n.includes('neural') || n.includes('data science') ||
        n.includes('natural language') || n.includes('computer vision') || c === 'AI' || c === 'ML')
      return { icon: Brain, colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20', arrowColor: 'border-purple-400/40 text-purple-400 hover:bg-purple-400/10', progressBarColor: 'bg-purple-500' };

    // ── Operating Systems ────────────────────────────────────────
    if (n.includes('operating system') || n.includes('linux') || n.includes('unix') ||
        n.includes('system programming') || n.includes('process') || c === 'OS')
      return { icon: Layers, colorClass: 'text-slate-400 bg-slate-500/10 border-slate-500/20', arrowColor: 'border-slate-400/40 text-slate-400 hover:bg-slate-400/10', progressBarColor: 'bg-slate-500' };

    // ── Cybersecurity & Ethics ───────────────────────────────────
    if (n.includes('security') || n.includes('cryptography') || n.includes('cyber') ||
        n.includes('ethics') || n.includes('values') || n.includes('human value') || c.startsWith('HS') || c.startsWith('HUM'))
      return { icon: Shield, colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', arrowColor: 'border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10', progressBarColor: 'bg-emerald-500' };

    // ── Technical Writing & Communication ────────────────────────
    if (n.includes('technical writing') || n.includes('professional communication') ||
        n.includes('english') || n.includes('communication skill') ||
        n.includes('soft skill') || n.includes('language'))
      return { icon: MessageSquare, colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20', arrowColor: 'border-rose-400/40 text-rose-400 hover:bg-rose-400/10', progressBarColor: 'bg-rose-500' };

    // ── Engineering Drawing & Graphics ───────────────────────────
    if (n.includes('drawing') || n.includes('engineering graphics') || n.includes('cad') ||
        n.includes('autocad') || n.includes('drafting') || c === 'ED' || c === 'EG')
      return { icon: PenLine, colorClass: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20', arrowColor: 'border-fuchsia-400/40 text-fuchsia-400 hover:bg-fuchsia-400/10', progressBarColor: 'bg-fuchsia-500' };

    // ── Thermodynamics & Heat Transfer ───────────────────────────
    if (n.includes('thermodynamics') || n.includes('heat transfer') || n.includes('thermal'))
      return { icon: Flame, colorClass: 'text-red-400 bg-red-500/10 border-red-500/20', arrowColor: 'border-red-400/40 text-red-400 hover:bg-red-400/10', progressBarColor: 'bg-red-500' };

    // ── Fluid Mechanics & Hydraulics ─────────────────────────────
    if (n.includes('fluid') || n.includes('hydraulic') || n.includes('pneumatic') ||
        n.includes('aerodynamics'))
      return { icon: Droplets, colorClass: 'text-sky-400 bg-sky-500/10 border-sky-500/20', arrowColor: 'border-sky-400/40 text-sky-400 hover:bg-sky-400/10', progressBarColor: 'bg-sky-500' };

    // ── Mechanics & Manufacturing ────────────────────────────────
    if (n.includes('mechanic') || n.includes('manufacturing') || n.includes('machine design') ||
        n.includes('workshop') || n.includes('kinematics') || n.includes('dynamics') ||
        n.includes('statics') || n.includes('strength of material') || c.startsWith('ME') || c.startsWith('MECH') || c === 'EME')
      return { icon: Wrench, colorClass: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20', arrowColor: 'border-zinc-400/40 text-zinc-400 hover:bg-zinc-400/10', progressBarColor: 'bg-zinc-400' };

    // ── Civil / Structures / Construction ────────────────────────
    if (n.includes('structure') || n.includes('civil') || n.includes('concrete') ||
        n.includes('soil') || n.includes('geotechnical') || n.includes('surveying') ||
        n.includes('construction') || n.includes('rcc') || n.includes('bridge'))
      return { icon: Building2, colorClass: 'text-stone-400 bg-stone-500/10 border-stone-500/20', arrowColor: 'border-stone-400/40 text-stone-400 hover:bg-stone-400/10', progressBarColor: 'bg-stone-400' };

    // ── Material Science ─────────────────────────────────────────
    if (n.includes('material') || n.includes('metallurgy') || n.includes('polymer') ||
        n.includes('composite') || n.includes('corrosion'))
      return { icon: Layers, colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20', arrowColor: 'border-amber-400/40 text-amber-400 hover:bg-amber-400/10', progressBarColor: 'bg-amber-500' };

    // ── Economics & Management ───────────────────────────────────
    if (n.includes('economics') || n.includes('management') || n.includes('finance') ||
        n.includes('business') || n.includes('accounting') || n.includes('entrepreneurship'))
      return { icon: BarChart2, colorClass: 'text-green-400 bg-green-500/10 border-green-500/20', arrowColor: 'border-green-400/40 text-green-400 hover:bg-green-400/10', progressBarColor: 'bg-green-500' };

    // ── Biotechnology & Life Sciences ────────────────────────────
    if (n.includes('biotech') || n.includes('biology') || n.includes('biochemistry') ||
        n.includes('microbiology') || n.includes('genetics'))
      return { icon: Microscope, colorClass: 'text-lime-400 bg-lime-500/10 border-lime-500/20', arrowColor: 'border-lime-400/40 text-lime-400 hover:bg-lime-400/10', progressBarColor: 'bg-lime-500' };

    // ── Biomedical & Instrumentation ─────────────────────────────
    if (n.includes('biomedical') || n.includes('instrumentation') || n.includes('measurement') ||
        n.includes('control system') || n.includes('automation'))
      return { icon: Activity, colorClass: 'text-pink-400 bg-pink-500/10 border-pink-500/20', arrowColor: 'border-pink-400/40 text-pink-400 hover:bg-pink-400/10', progressBarColor: 'bg-pink-500' };

    // ── Default cycling palette (fallback) ───────────────────────
    const defaults = [
      { icon: Atom,       colorClass: 'text-violet-400 bg-violet-500/10 border-violet-500/20', arrowColor: 'border-violet-400/40 text-violet-400 hover:bg-violet-400/10', progressBarColor: 'bg-violet-500' },
      { icon: Code,       colorClass: 'text-orange-400 bg-orange-500/10 border-orange-500/20', arrowColor: 'border-orange-400/40 text-orange-400 hover:bg-orange-400/10', progressBarColor: 'bg-orange-500' },
      { icon: Database,   colorClass: 'text-lime-400   bg-lime-500/10   border-lime-500/20',   arrowColor: 'border-lime-400/40   text-lime-400   hover:bg-lime-400/10',   progressBarColor: 'bg-lime-500'   },
      { icon: Globe,      colorClass: 'text-blue-400   bg-blue-500/10   border-blue-500/20',   arrowColor: 'border-blue-400/40   text-blue-400   hover:bg-blue-400/10',   progressBarColor: 'bg-blue-500'   },
      { icon: BarChart2,  colorClass: 'text-green-400  bg-green-500/10  border-green-500/20',  arrowColor: 'border-green-400/40  text-green-400  hover:bg-green-400/10',  progressBarColor: 'bg-green-500'  },
      { icon: Layers,     colorClass: 'text-slate-400  bg-slate-500/10  border-slate-500/20',  arrowColor: 'border-slate-400/40  text-slate-400  hover:bg-slate-400/10',  progressBarColor: 'bg-slate-500'  },
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return defaults[Math.abs(hash) % defaults.length];
  };

  // Get the number of units in a subject
  const getSubjectTopicsCount = (sub: any) => {
    if (!sub || !sub.syllabus) return 0;
    return sub.syllabus.length;
  };

  // -------------------------------------------------------------
  // Continue Progress Row generator (Uses real sessional progress)
  // -------------------------------------------------------------
  const getContinueRows = () => {
    // If the user has real practice records, use them
    if (analytics?.mostPracticed && analytics.mostPracticed.length > 0) {
      return analytics.mostPracticed.map((rec: any) => {
        const themeStyles = getSubjectCardStyles(rec.subjectName, '');
        return {
          subjectName: `${rec.subjectName} – Unit ${rec.unit || 1}`,
          chapterTitle: rec.topic,
          progress: rec.accuracy,
          questions: `${rec.correct} / ${rec.attempted} Questions`,
          colorClass: themeStyles.colorClass,
          progressBarColor: themeStyles.progressBarColor,
          subjectId: rec.subjectId || '#'
        };
      });
    }

    // Fallback: render the first unit/topic of each of their enrolled subjects
    if (subjects && subjects.length > 0) {
      return subjects.slice(0, 5).map((sub: any) => {
        const themeStyles = getSubjectCardStyles(sub.name, sub.code);
        const firstUnit = sub.syllabus?.[0];
        const firstTopic = firstUnit?.topics?.[0] || 'Introduction and Concepts';
        return {
          subjectName: `${sub.name} – Unit 1`,
          chapterTitle: firstTopic,
          progress: 0,
          questions: '0 / 10 Questions',
          colorClass: themeStyles.colorClass,
          progressBarColor: themeStyles.progressBarColor,
          subjectId: sub._id
        };
      });
    }

    // Hard fallback if no subjects loaded yet
    return [
      { subjectName: 'Physics – Unit 1', chapterTitle: 'Physical World and Measurement', progress: 0, questions: '0 / 30 Questions', colorClass: 'bg-purple-500/10 text-purple-400', progressBarColor: 'bg-purple-500', subjectId: '#' },
      { subjectName: 'Mathematics – Unit 1', chapterTitle: 'Differential Calculus', progress: 0, questions: '0 / 30 Questions', colorClass: 'bg-emerald-500/10 text-emerald-400', progressBarColor: 'bg-emerald-500', subjectId: '#' },
      { subjectName: 'BHS – Unit 1', chapterTitle: 'Development and Sustainability', progress: 0, questions: '0 / 30 Questions', colorClass: 'bg-orange-500/10 text-orange-400', progressBarColor: 'bg-orange-500', subjectId: '#' },
    ];
  };


  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <div className="text-center space-y-3">
          <Loader2 className="w-7 h-7 text-purple-500 animate-spin mx-auto" />
          <p className="text-xs text-text-secondary">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  return (

    <div className="flex h-screen bg-bg-primary text-text-primary overflow-hidden relative">
      {/* Ambient glow — dark mode only */}
      <div className="hidden dark:block fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[550px] rounded-full bg-purple-900/10 blur-[180px] pointer-events-none" />

      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        streakCount={analytics?.metrics?.streakCount ?? user?.engagement?.streakCount ?? 0}
        streakDays={analytics?.metrics?.streakDays}
      />

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col h-full overflow-y-auto z-10">
        
        {/* Top Header Bar */}
        <Navbar onMenuToggle={() => setSidebarOpen(true)} />


        {/* Dashboard Main Scrollable Body */}
        <main className="flex-grow max-w-5xl w-full mx-auto px-6 sm:px-8 py-8 space-y-6">
          
          {/* Card 1: Your Daily Goal Card */}
          <section className="p-6 rounded-2xl border border-border-primary bg-bg-secondary flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="space-y-4 flex-grow">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Sparkles className="w-5 h-5 fill-purple-400/15" />
                </div>
                <h3 className="font-display font-black text-sm text-text-primary">Your Daily Goal</h3>
              </div>
              
              <div className="space-y-1">
                <h2 className="font-display font-black text-2xl text-text-primary">
                  {dailySolved} <span className="text-text-muted">/ {dailyTarget} Questions</span>
                </h2>
                <p className="text-xs text-text-secondary font-semibold">
                  {dailySolved >= dailyTarget ? "Great! You completed today's goal." : `Solve ${dailyTarget - dailySolved} more questions to finish.`}
                </p>
              </div>

              {/* Goal Mini Stats badges */}
              <div className="flex items-center gap-2.5 flex-wrap pt-1">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{dailySolved} Solved</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400 text-[10px] font-bold">
                  <XCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{incorrectCount} Incorrect</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/5 border border-purple-500/10 text-purple-400 text-[10px] font-bold">
                  <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{estimatedTimeSpent} min Time Spent</span>
                </div>
              </div>
            </div>

            {/* Goal Progress bar side */}
            <div className="flex flex-col items-end gap-5 shrink-0 w-full md:w-auto">
              <div className="flex items-center gap-4 w-full md:w-64">
                <div className="flex-grow h-2 bg-bg-tertiary border border-border-primary/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="font-display font-black text-xs text-purple-500 shrink-0">{progressPercent}%</span>
              </div>
              
              <Link 
                href="/tests"
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                <span>Start Practice</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </section>

          {/* Section 2: Select Your Subject grid */}
          <section id="subjects" className="p-6 rounded-2xl border border-border-primary bg-bg-secondary space-y-5">
            <div className="flex items-start gap-3 text-left">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mt-0.5">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-display font-black text-sm text-text-primary">Select Your Subject</h3>
                <p className="text-[10px] text-text-secondary font-semibold">Choose a subject to continue your preparation</p>
              </div>
            </div>

            {/* Dynamic Subjects Grid */}
            {loadingSubjects ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <div key={n} className="animate-pulse h-36 bg-bg-tertiary border border-border-primary/50 rounded-2xl" />
                ))}
              </div>
            ) : subjects.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {subjects.slice(0, 5).map((sub, idx) => {
                  const styles = getSubjectCardStyles(sub.name, sub.code);
                  const IconComponent = styles.icon;
                  const chaptersCount = getSubjectTopicsCount(sub);

                  return (
                    <div 
                      key={sub._id}
                      className="p-4 rounded-2xl bg-bg-secondary border border-border-primary hover:border-accent/30 flex flex-col justify-between items-start h-36 group transition-all cursor-pointer"
                      onClick={() => router.push(`/subjects/${sub._id}`)}
                    >
                      <div className={`p-2 rounded-lg ${styles.colorClass} flex items-center justify-center shrink-0`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      
                      <div className="space-y-0.5 text-left w-full">
                        <h4 className="text-xs font-black text-text-primary leading-tight truncate group-hover:text-accent transition-colors">
                          {sub.name}
                        </h4>
                        <p className="text-[9px] text-text-muted font-bold leading-none">
                          {chaptersCount} {chaptersCount === 1 ? 'Unit' : 'Units'}
                        </p>
                      </div>

                      {/* Circular arrow button */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${styles.arrowColor}`}>
                        <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                      </div>
                    </div>
                  );
                })}

                {/* View All Card */}
                <div 
                  className="p-4 rounded-2xl bg-bg-secondary border border-border-primary hover:border-accent/30 flex flex-col justify-between items-start h-36 group transition-all cursor-pointer"
                  onClick={() => router.push('/tests')}
                >
                  <div className="p-2 rounded-lg bg-neutral-500/10 border border-neutral-500/20 text-neutral-400 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  
                  <div className="space-y-0.5 text-left w-full">
                    <h4 className="text-xs font-black text-text-primary leading-tight truncate">
                      View All
                    </h4>
                    <p className="text-[9px] text-text-muted font-bold leading-none">
                      All Subjects
                    </p>
                  </div>

                  {/* Circular arrow button */}
                  <div className="w-6 h-6 rounded-full flex items-center justify-center border border-text-muted/30 text-text-muted hover:border-accent/40 hover:text-accent transition-all">
                    <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center border border-dashed border-border-primary rounded-2xl bg-bg-secondary/50 text-text-muted text-xs">
                No active subjects found for this semester. Redo sessional onboarding setup.
              </div>
            )}
          </section>

          {/* Section 3: Continue Your Chapters */}
          <section id="practice" className="p-6 rounded-2xl border border-border-primary bg-bg-secondary space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-black text-sm text-text-primary">Continue Your Chapters</h3>
              <Link href="/tests" className="text-[10px] font-black text-accent hover:opacity-75 uppercase tracking-wider transition-opacity">
                View All
              </Link>
            </div>

            {/* List Rows */}
            <div className="divide-y divide-border-primary/30">
              {getContinueRows().map((row: any, idx: number) => (
                <div 
                  key={idx}
                  onClick={() => router.push(row.subjectId !== '#' ? `/subjects/${row.subjectId}` : '/dashboard')}
                  className="py-3.5 flex items-center justify-between gap-4 group cursor-pointer hover:bg-bg-tertiary px-2 rounded-xl transition-all"
                >
                  {/* Left: Icon + Titles */}
                  <div className="flex items-center gap-3.5 text-left min-w-0 max-w-[40%]">
                    <div className={`w-8 h-8 rounded-lg ${row.colorClass} flex items-center justify-center shrink-0`}>
                      <FileText className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-text-primary group-hover:text-accent transition-colors leading-snug truncate">
                        {row.subjectName}
                      </h4>
                      <p className="text-[10px] text-text-muted truncate mt-0.5">
                        {row.chapterTitle}
                      </p>
                    </div>
                  </div>

                  {/* Middle: Progress line bar */}
                  <div className="flex-grow max-w-md hidden sm:block">
                    <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden border border-border-primary/30">
                      <div 
                        className={`h-full ${row.progressBarColor} transition-all duration-300`} 
                        style={{ width: `${row.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Right: Progress text stats */}
                  <div className="flex items-center gap-5 shrink-0">
                    <span className="font-display font-black text-xs text-text-primary">
                      {row.progress}%
                    </span>
                    <span className="text-[10px] text-text-secondary font-bold hidden md:inline">
                      {row.questions}
                    </span>
                    <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-primary transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Footer Text */}
          <div className="py-6 text-center text-text-muted text-[10px] font-bold flex items-center justify-center gap-1.5 select-none">
            <span>Keep learning, keep growing!</span>
            <span>🚀</span>
          </div>

        </main>

        {/* Dynamic Search Modal Overlay */}
        {showSearchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowSearchModal(false)} />
            <div className="relative w-full max-w-2xl rounded-2xl border border-border-primary bg-bg-secondary p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] text-left z-50">
              <div className="flex items-center justify-between border-b border-border-primary/50 pb-4 mb-4">
                <h3 className="font-display font-black text-sm text-text-primary">Search Results for "{searchQuery}"</h3>
                <button 
                  onClick={() => setShowSearchModal(false)}
                  className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-secondary transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              {searching ? (
                <div className="flex items-center justify-center py-16 flex-grow">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-16 flex-grow space-y-2">
                  <p className="text-xs font-bold text-text-secondary">No matching questions found.</p>
                  <p className="text-[10px] text-text-muted">Try a different keyword or check your spelling.</p>
                </div>
              ) : (
                <div className="overflow-y-auto space-y-3 pr-1 flex-grow scrollbar-thin">
                  {searchResults.map((q) => (
                    <div 
                      key={q._id} 
                      className="p-4 rounded-xl border border-border-primary bg-bg-tertiary hover:bg-bg-secondary transition-all flex flex-col justify-between gap-3 text-left"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-[11px] font-semibold text-text-primary leading-relaxed line-clamp-3">
                          {q.questionText}
                        </p>
                        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                          q.difficulty === 'hard' ? 'bg-red-500/10 text-red-400' :
                          q.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {q.difficulty}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] font-bold text-text-muted">
                        <span>Unit {q.unit} • {q.topic} • {q.marks} Marks</span>
                        <Link 
                          href={`/subjects/${q.subjectId}`}
                          onClick={() => setShowSearchModal(false)}
                          className="text-purple-400 hover:underline flex items-center gap-0.5"
                        >
                          Practice Chapter <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <div className="text-center space-y-3">
          <Loader2 className="w-7 h-7 text-purple-500 animate-spin mx-auto" />
          <p className="text-xs text-text-secondary">Loading your workspace…</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
