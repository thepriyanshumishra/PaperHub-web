'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { useAuth } from '@/components/auth-provider';
import { useTheme } from '@/components/theme-provider';
import { Search, Bell, Sun, Moon, Menu, ChevronDown as ChevronDownIcon,
  FileText, Wrench, ChevronRight, ArrowUpRight, BookOpen, Clock, ClipboardList,
  ArrowLeft, ArrowRight, CheckCircle2, Target, Layers, Brain, Camera,
  Loader2, ShieldAlert, Minus, Plus, Zap, ChevronDown, Check, Sparkles,
  Atom, Calculator, Cpu, Code, Globe, Database, FlaskConical, Leaf, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
interface SyllabusUnit {
  unitNumber: number;
  unitTitle: string;
  topics: string[];
}

interface Subject {
  _id: string;
  name: string;
  code: string;
  syllabus: SyllabusUnit[];
}

type TestType = 'syllabus' | 'unit' | 'topic';
type TimeMode = 'minor' | 'major' | 'custom';
type EvalMethod = 'self' | 'photo';

const STEP_LABELS = ['Subjects', 'Type', 'Scope', 'Evaluation', 'Questions', 'Duration'];
const QUICK_QUESTIONS = [5, 10, 20, 30];
const QUICK_DURATIONS = [30, 60, 90, 120, 180];

// --- Semantic colors and icons mapping for subjects ---
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

// --- Step Progress Component ---
function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center w-full max-w-2xl mx-auto mb-8 px-2">
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < current;
        const isActive = stepNum === current;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className={`relative w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black border-2 transition-all duration-300 ${
                isCompleted
                  ? 'bg-accent border-accent text-white shadow-[0_0_12px_rgba(249,115,22,0.4)]'
                  : isActive
                  ? 'bg-bg-secondary border-accent text-accent shadow-[0_0_16px_rgba(249,115,22,0.3)] dark:shadow-[0_0_16px_rgba(124,102,255,0.4)]'
                  : 'bg-bg-tertiary border-border-primary text-text-muted'
              }`}>
                {isActive && (
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-accent" />
                )}
                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : stepNum}
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wider hidden sm:block ${
                isActive ? 'text-accent' : isCompleted ? 'text-accent/60' : 'text-text-muted/60'
              }`}>
                {label}
              </span>
            </div>
            {i < total - 1 && (
              <div className="flex-grow min-w-[20px] h-0.5 mx-1 mt-[-16px] relative rounded-full overflow-hidden bg-border-primary/40">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent to-indigo-500 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: stepNum < current ? '100%' : '0%' }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -50 : 50, opacity: 0 }),
};

export default function TestsPage() {
  const router = useRouter();
  const { user, fbUser, logout } = useAuth();
  const { theme, setTheme, systemTheme } = useTheme();
  const currentTheme = theme === 'system' ? systemTheme : theme;
  const toggleTheme = () => setTheme(currentTheme === 'light' ? 'dark' : 'light');

  const handleLogout = async () => {
    try {
      if (logout) await logout();
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [mounted, setMounted] = useState(false);

  // PYQ Mock Test State
  const [isPYQModalOpen, setIsPYQModalOpen] = useState(false);
  const [pyqPapers, setPyqPapers] = useState<{ majors: any[], minors: any[] }>({ majors: [], minors: [] });
  const [loadingPapers, setLoadingPapers] = useState(false);
  const [selectedPYQPaper, setSelectedPYQPaper] = useState<any | null>(null);
  const [pyqEvaluationMethod, setPyqEvaluationMethod] = useState<EvalMethod>('self');


  // Subjects configuration lists
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  // Stepper state
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Wizard Configuration State
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [testType, setTestType] = useState<TestType>('syllabus');
  const [selectionMap, setSelectionMap] = useState<Record<string, { units: number[]; topics: string[] }>>({});
  const [evaluationMethod, setEvaluationMethod] = useState<EvalMethod>('self');
  const [questionCount, setQuestionCount] = useState(5);
  const [timeMode, setTimeMode] = useState<TimeMode>('minor');
  const [customMinutes, setCustomMinutes] = useState(60);

  // Availability counters
  const [availableCount, setAvailableCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [starting, setStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Header state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Pre-seed mock values for marketing
  const mockTestSeries = [
    { title: 'B.Tech Sem 1 Mid-Term Test Series 2026', count: '1,240+ students took this' },
    { title: 'B.Tech Semester End Mock Exams 2026', count: '890+ students took this' },
    { title: 'MMMUT CSE Subject-wise Practice Tests', count: '1,500+ students took this' }
  ];

  // Sync mounted status to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch notifications
  useEffect(() => {
    if (!fbUser) return;
    const fetchNotifications = async () => {
      try {
        const idToken = await fbUser.getIdToken();
        const res = await fetch('/api/notifications', {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.notifications?.filter((n: any) => !n.isRead).length || 0);
        }
      } catch {}
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fbUser]);

  const handleMarkAllRead = async () => {
    if (!fbUser || notifications.length === 0) return;
    try {
      const idToken = await fbUser.getIdToken();
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n._id);
      if (unreadIds.length === 0) return;
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ ids: unreadIds })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch {}
  };

  const ordinal = (n: number) => {
    const s = ['th','st','nd','rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const activeName     = user?.profile?.name || user?.displayName || '';
  const userInitials   = activeName ? activeName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '?';

  // Fetch subjects for active semester & branch
  const activeBranch = user?.profile?.branch || (typeof window !== 'undefined' ? localStorage.getItem('selectedBranch') : '') || '';
  const activeSemester = user?.profile?.semester || (typeof window !== 'undefined' ? Number(localStorage.getItem('selectedSemester') || 1) : 1);

  useEffect(() => {
    if (!mounted) return;
    const fetchSubjects = async () => {
      try {
        setLoadingSubjects(true);
        const college = localStorage.getItem('selectedCollege') || 'MMMUT';
        const res = await fetch(`/api/subjects?collegeCode=${college}&branchCode=${activeBranch || 'CSE'}&semester=${activeSemester || 1}`);
        if (res.ok) {
          const data = await res.json();
          setSubjects(data.subjects || []);
        }
      } catch (err) {
        console.error('Failed to load active subjects:', err);
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, [mounted, activeBranch, activeSemester]);

  // Fetch PYQ Papers
  const fetchPapers = async (force = false) => {
    if (subjects.length === 0) return;
    if (!force && (pyqPapers.majors.length > 0 || pyqPapers.minors.length > 0)) return;
    setLoadingPapers(true);
    try {
      const subjectIds = subjects.map(s => s._id).join(',');
      const res = await fetch(`/api/papers?subjectIds=${subjectIds}`);
      if (res.ok) {
        const data = await res.json();
        setPyqPapers(data.papers);
      }
    } catch (error) {
      console.error('Failed to fetch papers', error);
    } finally {
      setLoadingPapers(false);
    }
  };

  // Pre-fetch papers when subjects are loaded
  useEffect(() => {
    if (subjects.length > 0) {
      fetchPapers();
    }
  }, [subjects]);

  const openPYQModal = () => {
    setIsPYQModalOpen(true);
    fetchPapers();
  };

  const startPYQSession = async (paper: any, evalMethod: EvalMethod) => {
    if (!fbUser) {
      alert("Please log in to start a PYQ mock test.");
      return;
    }
    try {
      setStarting(true);
      const token = await fbUser.getIdToken();
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subjectId: paper.subjectId,
          type: 'test',
          subType: 'pyq',
          evaluationMethod: evalMethod,
          duration: paper.examType.toLowerCase().includes('major') ? 180 : 90,
          config: {
            examType: paper.examType,
            year: paper.year,
            questionCount: 'all'
          }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start session');
      router.push(`/subjects/${paper.subjectId}/test/solve?sessionId=${data.session._id}&duration=${paper.examType.toLowerCase().includes('major') ? 180 : 90}`);
    } catch (err: any) {
      alert(err.message);
      setStarting(false);
    }
  };


  // Fetch dynamic question counts
  const fetchAvailableCount = useCallback(async () => {
    if (selectedSubjects.length === 0) {
      setAvailableCount(0);
      return;
    }

    const isLocalFallback = localStorage.getItem('useLocalFallback') === 'true';
    if (isLocalFallback) {
      // Mock estimate count
      const total = selectedSubjects.reduce((acc, sub) => acc + (sub.syllabus?.reduce((acc2, u) => acc2 + u.topics.length * 2, 0) || 12), 0);
      setAvailableCount(total);
      return;
    }

    setLoadingCount(true);
    try {
      const counts = await Promise.all(
        selectedSubjects.map(async (subject) => {
          let url = `/api/subjects/${subject._id}/question-count`;
          const qp = new URLSearchParams();
          const map = selectionMap[subject._id];

          if (testType === 'unit' && map?.units?.length > 0) {
            qp.set('units', map.units.join(','));
          } else if (testType === 'topic' && map?.topics?.length > 0) {
            qp.set('topics', map.topics.join(','));
          }
          const qs = qp.toString();
          if (qs) url += `?${qs}`;

          const res = await fetch(url);
          const data = await res.json();
          return data.count ?? 0;
        })
      );
      const total = counts.reduce((acc, c) => acc + c, 0);
      setAvailableCount(total);
    } catch {
      setAvailableCount(0);
    } finally {
      setLoadingCount(false);
    }
  }, [selectedSubjects, testType, selectionMap]);

  // Fetch count when step 5 is active
  useEffect(() => {
    if (step === 5) fetchAvailableCount();
  }, [step, fetchAvailableCount]);

  // Clamp questionCount when availableCount is updated
  useEffect(() => {
    if (availableCount !== null && questionCount > availableCount) {
      setQuestionCount(Math.max(1, availableCount));
    }
  }, [availableCount, questionCount]);

  // Duration Helper
  const getDurationMinutes = () => {
    if (timeMode === 'major') return 180;
    if (timeMode === 'minor') return 90;
    return customMinutes;
  };

  const timePerQuestion = () => {
    const dur = getDurationMinutes();
    const q = questionCount;
    if (!q) return '–';
    const raw = dur / q;
    if (raw < 1) return `${Math.round(raw * 60)}s`;
    return `${raw % 1 === 0 ? raw : raw.toFixed(1)} min`;
  };

  // Selection state updates
  const toggleSubject = (subject: Subject) => {
    setSelectedSubjects((prev) => {
      const idx = prev.findIndex((s) => s._id === subject._id);
      if (idx !== -1) {
        // Remove selection mapping too
        setSelectionMap((oldMap) => {
          const nMap = { ...oldMap };
          delete nMap[subject._id];
          return nMap;
        });
        return prev.filter((s) => s._id !== subject._id);
      } else {
        setSelectionMap((oldMap) => ({
          ...oldMap,
          [subject._id]: { units: [], topics: [] }
        }));
        return [...prev, subject];
      }
    });
  };

  const updateUnitsSelection = (subjectId: string, unitNumber: number) => {
    setSelectionMap((prev) => {
      const uMap = prev[subjectId] || { units: [], topics: [] };
      const newUnits = uMap.units.includes(unitNumber)
        ? uMap.units.filter((u) => u !== unitNumber)
        : [...uMap.units, unitNumber];
      return {
        ...prev,
        [subjectId]: { ...uMap, units: newUnits }
      };
    });
  };

  const updateTopicsSelection = (subjectId: string, topic: string) => {
    setSelectionMap((prev) => {
      const uMap = prev[subjectId] || { units: [], topics: [] };
      const newTopics = uMap.topics.includes(topic)
        ? uMap.topics.filter((t) => t !== topic)
        : [...uMap.topics, topic];
      return {
        ...prev,
        [subjectId]: { ...uMap, topics: newTopics }
      };
    });
  };

  // Scope step validation and skip mapping
  const canProceed = (): boolean => {
    if (step === 1) return selectedSubjects.length > 0;
    if (step === 2) return true;
    if (step === 3) {
      if (testType === 'syllabus') return true;
      if (testType === 'unit') {
        // Every subject must have at least one unit selected
        return selectedSubjects.every((s) => selectionMap[s._id]?.units?.length > 0);
      }
      if (testType === 'topic') {
        // Every subject must have at least one topic selected
        return selectedSubjects.every((s) => selectionMap[s._id]?.topics?.length > 0);
      }
      return true;
    }
    if (step === 4) return true;
    if (step === 5) return questionCount >= 1 && (availableCount === null || questionCount <= availableCount);
    if (step === 6) return getDurationMinutes() >= 10;
    return false;
  };

  const goNext = () => {
    if (!canProceed()) return;
    setDirection(1);
    // If syllabus-wise, we can skip step 3 entirely
    if (step === 2 && testType === 'syllabus') {
      setStep(4);
    } else {
      setStep((s) => Math.min(s + 1, 6));
    }
  };

  const goBack = () => {
    setDirection(-1);
    if (step === 4 && testType === 'syllabus') {
      setStep(2);
    } else {
      setStep((s) => Math.max(s - 1, 1));
    }
  };

  // Launch test session
  const startTest = async () => {
    if (starting || !canProceed()) return;
    setStarting(true);
    setErrorMessage(null);

    const minutes = getDurationMinutes();
    const isLocalFallback = localStorage.getItem('useLocalFallback') === 'true';

    // Map selections array
    const selections = selectedSubjects.map((s) => {
      const map = selectionMap[s._id];
      return {
        subjectId: s._id,
        units: testType === 'unit' ? map.units : [],
        topics: testType === 'topic' ? map.topics : []
      };
    });

    // Local / guest fallback — no Firebase auth
    if (isLocalFallback || !fbUser) {
      const subjectParam = selectedSubjects.map(s => s._id).join(',');
      router.push(
        `/subjects/${selectedSubjects[0]._id}/test/solve?type=${testType}&duration=${minutes}&count=${questionCount}&evaluationMethod=${evaluationMethod}&subjects=${subjectParam}`
      );
      return;
    }

    try {
      const token = await fbUser.getIdToken();
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subjectId: selectedSubjects.map((s) => s._id),
          type: 'test',
          subType: testType,
          evaluationMethod,
          duration: minutes,
          config: {
            selections,
            questionCount
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize session.');

      if (data.session?._id) {
        router.push(`/subjects/${selectedSubjects[0]._id}/test/solve?sessionId=${data.session._id}&duration=${minutes}`);
      } else {
        throw new Error('Invalid session response from the server.');
      }
    } catch (err: any) {
      console.error('[startTest error]', err);
      setErrorMessage(err.message || 'Could not start the session. Please check your internet connection and try again.');
    } finally {
      setStarting(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-bg-primary text-text-primary overflow-hidden relative">
      {/* Ambient glows - dark mode only */}
      <div className="hidden dark:block fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[550px] rounded-full bg-purple-900/10 blur-[180px] pointer-events-none -z-10" />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-grow flex flex-col min-h-screen overflow-y-auto z-10">
        {/* Top Header Bar — matches Dashboard */}
        <header className="px-5 sm:px-7 h-16 border-b border-border-primary/50 flex items-center justify-between gap-4 bg-bg-primary sticky top-0 z-30 shrink-0">

          {/* Left: Mobile menu + Search */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary transition-all shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            <form onSubmit={(e) => e.preventDefault()} className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-text-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="tests-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics, chapters or questions..."
                className="w-full pl-10 pr-20 py-2.5 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-[13px] font-medium focus:border-accent/50 focus:ring-2 focus:ring-accent/15 outline-none text-text-primary placeholder:text-text-muted transition-all"
              />
              <kbd className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 items-center px-2 py-0.5 rounded-md bg-bg-tertiary border border-border-primary text-[10px] font-semibold text-text-muted select-none pointer-events-none">
                ⌘K
              </kbd>
            </form>
          </div>

          {/* Right: Actions + Profile */}
          <div className="flex items-center gap-1 shrink-0">

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all relative"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent ring-2 ring-bg-primary" />
                )}
              </button>

              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setNotificationsOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-40 w-80 rounded-2xl border border-border-primary bg-bg-secondary shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border-primary">
                      <h4 className="text-sm font-bold text-text-primary">Notifications</h4>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} className="text-[11px] font-semibold text-accent hover:opacity-80 transition-opacity">
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                      {notifications.length === 0 ? (
                        <p className="text-[12px] text-text-muted text-center py-8">No notifications yet.</p>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n._id}
                            className={`p-3 rounded-xl transition-all cursor-default ${n.isRead ? 'hover:bg-bg-tertiary' : 'bg-accent/8 border border-accent/20'}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[12px] font-semibold text-text-primary leading-snug">{n.title}</span>
                              <span className="text-[10px] text-text-muted shrink-0 mt-0.5">
                                {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-border-primary mx-1" />

            {/* Profile Button */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 pl-1 pr-3 py-1.5 rounded-xl hover:bg-bg-tertiary transition-all focus:outline-none group"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-md shrink-0">
                  {userInitials}
                </div>
                <div className="hidden md:flex flex-col items-start select-none min-w-0">
                  <span className="text-[13px] font-semibold text-text-primary leading-tight truncate max-w-[120px]">
                    {activeName || 'Account'}
                  </span>
                  <span className="text-[10px] text-text-muted leading-tight truncate max-w-[120px]">
                    {!mounted ? 'Student' : (activeBranch && activeSemester
                      ? `${activeBranch} · ${ordinal(activeSemester)} Sem`
                      : activeBranch || 'Student')}
                  </span>
                </div>
                <ChevronDownIcon className="w-3.5 h-3.5 text-text-muted hidden md:block group-hover:text-text-secondary transition-colors shrink-0" />
              </button>

              {profileDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-35" onClick={() => setProfileDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-40 w-48 rounded-2xl border border-border-primary bg-bg-secondary p-1.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <Link
                      href="/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center px-3 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all"
                    >
                      View Profile
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center px-3 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all"
                    >
                      Account Settings
                    </Link>
                    <div className="h-px bg-border-primary my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-500 hover:bg-red-500/8 transition-all text-left"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-grow max-w-4xl w-full mx-auto px-6 py-8 space-y-8">
          <div className="flex items-center space-x-2.5">
            <ClipboardList className="w-5 h-5 text-accent" />
            <h2 className="font-display font-black text-lg">PaperHub Tests</h2>
          </div>

          <AnimatePresence mode="wait">
            {!isCreatingCustom ? (
              <motion.div 
                key="menu"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Create Custom Test Card */}
                  <button 
                    onClick={() => {
                      setIsCreatingCustom(true);
                      setStep(1);
                    }}
                    className="relative p-6 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/8 to-indigo-500/5 hover:from-blue-500/15 hover:to-indigo-500/10 hover:border-blue-400/40 transition-all text-left flex items-start justify-between group shadow-sm overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-blue-500/8 blur-2xl pointer-events-none translate-x-8 -translate-y-8" />
                    <div className="space-y-4 relative z-10">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform">
                        <Wrench className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-sm text-text-primary group-hover:text-blue-400 transition-colors flex items-center gap-1">
                          <span>Create Your Own Test</span>
                          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </h3>
                        <p className="text-[10px] text-text-muted mt-1.5 leading-relaxed max-w-[220px]">
                          Build a combined subject mock, pick units or topics. Fully customisable.
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity relative z-10" />
                  </button>

                  {/* PYQ Mock Tests Card */}
                  <button 
                    onClick={openPYQModal}
                    className="relative p-6 rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/8 to-rose-500/5 hover:from-pink-500/15 hover:to-rose-500/10 hover:border-pink-400/40 transition-all text-left flex items-start justify-between group shadow-sm overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-pink-500/8 blur-2xl pointer-events-none translate-x-8 -translate-y-8" />
                    <div className="space-y-4 relative z-10">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/25 group-hover:scale-110 transition-transform">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-sm text-text-primary group-hover:text-pink-400 transition-colors flex items-center gap-1">
                          <span>PYQ Mock Tests</span>
                          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </h3>
                        <p className="text-[10px] text-text-muted mt-1.5 leading-relaxed max-w-[220px]">
                          548+ students started a Past-Year Question exam in the last hour!
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-pink-400 opacity-0 group-hover:opacity-100 transition-opacity relative z-10" />
                  </button>
                </div>

                {/* Test Series section */}
                <div className="space-y-4 pt-4">
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-muted">PaperHub Trusted Test Series</h3>
                  <div className="space-y-3.5">
                    {mockTestSeries.map((series, idx) => (
                      <div 
                        key={idx}
                        className="p-4 rounded-xl border border-border-primary bg-bg-secondary/20 flex items-center justify-between hover:bg-bg-secondary hover:border-accent/25 transition-all group"
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/15 flex items-center justify-center text-accent">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-display font-bold text-xs text-text-primary group-hover:text-accent transition-colors">{series.title}</h4>
                            <p className="text-[9px] text-text-muted mt-0.5">{series.count}</p>
                          </div>
                        </div>
                        <button className="text-[10px] font-bold text-text-muted group-hover:text-accent hover:underline flex items-center gap-0.5">
                          <span>View Details</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              // Multi-step Custom Creator Stepper
              <motion.div 
                key="custom-creator"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="relative rounded-3xl border border-border-primary/60 bg-bg-secondary/50 backdrop-blur-xl space-y-0 max-w-2xl mx-auto overflow-hidden shadow-2xl"
              >
                {/* Ambient glow */}
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-40 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 right-0 w-64 h-32 rounded-full bg-indigo-500/8 blur-3xl pointer-events-none" />

                {/* Top accent bar */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent" />
                
                {/* Header */}
                <div className="relative flex items-center justify-between px-7 pt-6 pb-5 border-b border-border-primary/30">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                      <ClipboardList className="w-4.5 h-4.5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-display font-black text-sm text-text-primary leading-tight">Custom Mock Quiz</h3>
                      <p className="text-[10px] text-text-muted mt-0.5">Step {step} of {STEP_LABELS.length} &mdash; <span className="text-accent font-semibold">{STEP_LABELS[step - 1]}</span></p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setIsCreatingCustom(false);
                      setSelectedSubjects([]);
                      setSelectionMap({});
                    }}
                    className="text-[11px] font-bold text-text-muted hover:text-text-primary border border-border-primary hover:border-border-primary/80 px-3 py-1.5 rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                </div>

                {/* Step progress */}
                <div className="px-7 pt-5">

                  <StepProgress current={step} total={STEP_LABELS.length} />
                </div>

                {errorMessage && (
                  <div className="mx-7 p-3.5 rounded-xl border border-red-500/25 bg-red-500/5 text-xs text-red-500 font-semibold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="px-7 pb-2 min-h-[280px]">
                  <AnimatePresence custom={direction} mode="wait">
                    <motion.div
                      key={step}
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                    >
                      {/* Step 1: Select Subjects */}
                      {step === 1 && (
                        <div className="space-y-5">
                          <div className="text-center space-y-1">
                            <h4 className="font-display font-extrabold text-base">Pick Your Subjects</h4>
                            <p className="text-xs text-text-muted">Select one or more subjects for a combined mock test.</p>
                          </div>

                          {loadingSubjects ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                              <Loader2 className="w-7 h-7 animate-spin text-accent" />
                              <p className="text-xs text-text-muted">Loading your subjects...</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {subjects.map((sub) => {
                                const isSelected = selectedSubjects.some((s) => s._id === sub._id);
                                const { icon: Icon, colorClass, activeClass, badgeBg } = getSubjectTheme(sub.name, sub.code);
                                const unitCount = sub.syllabus?.length || 0;
                                return (
                                  <button
                                    key={sub._id}
                                    type="button"
                                    onClick={() => toggleSubject(sub)}
                                    className={`relative p-4 rounded-2xl border-2 transition-all duration-200 text-left flex flex-col gap-3 group h-[110px] ${
                                      isSelected
                                        ? activeClass + ' scale-[1.02]'
                                        : 'border-border-primary/60 bg-bg-primary/30 hover:bg-bg-tertiary/80 hover:border-border-primary'
                                    }`}
                                  >
                                    {/* Selection badge */}
                                    <div className={`absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center shadow-md transition-all ${
                                      isSelected ? `${badgeBg} scale-100` : 'border border-border-primary bg-bg-tertiary scale-75 opacity-50'
                                    }`}>
                                      <Check className="w-3 h-3 stroke-[3px] text-white" />
                                    </div>

                                    {/* Icon */}
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${colorClass} ${isSelected ? 'shadow-lg' : ''}`}>
                                      <Icon className="w-4 h-4" />
                                    </div>

                                    {/* Subject info */}
                                    <div className="space-y-0.5 min-w-0">
                                      <h5 className="font-display font-bold text-[11px] text-text-primary leading-tight line-clamp-2">
                                        {sub.name}
                                      </h5>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] text-text-muted font-bold">{sub.code}</span>
                                        {unitCount > 0 && (
                                          <span className="text-[8px] text-text-muted/60">&bull; {unitCount} units</span>
                                        )}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {selectedSubjects.length > 0 && (
                            <p className="text-center text-[11px] text-accent font-semibold">
                              {selectedSubjects.length} subject{selectedSubjects.length > 1 ? 's' : ''} selected
                            </p>
                          )}
                        </div>
                      )}

                      {/* Step 2: Select Test Type */}
                      {step === 2 && (
                        <div className="space-y-5">
                          <div className="text-center space-y-1">
                            <h4 className="font-display font-extrabold text-base">Test Coverage</h4>
                            <p className="text-xs text-text-muted">Choose how broad or targeted your questions should be.</p>
                          </div>

                          <div className="grid grid-cols-1 gap-3">
                            {[
                              { id: 'syllabus', icon: Layers, title: 'Full Syllabus Test', desc: 'Questions drawn across all units and chapters of selected subjects.', color: 'from-violet-500 to-indigo-600', glow: 'shadow-violet-500/20' },
                              { id: 'unit', icon: BookOpen, title: 'Unit-Wise Test', desc: 'Drill into specific chapters or units you choose.', color: 'from-blue-500 to-cyan-600', glow: 'shadow-blue-500/20' },
                              { id: 'topic', icon: Target, title: 'Topic-Wise Test', desc: 'Precision focus on individual topics from your syllabus.', color: 'from-orange-500 to-amber-500', glow: 'shadow-orange-500/20' }
                            ].map((type) => {
                              const isSelected = testType === type.id;
                              const Icon = type.icon;
                              return (
                                <button
                                  key={type.id}
                                  type="button"
                                  onClick={() => setTestType(type.id as TestType)}
                                  className={`p-4 rounded-2xl border-2 text-left flex items-center gap-4 transition-all duration-200 group ${
                                    isSelected
                                      ? 'border-accent/40 bg-accent/5 shadow-lg shadow-accent/10'
                                      : 'border-border-primary/60 bg-bg-primary/20 hover:bg-bg-tertiary/60 hover:border-border-primary'
                                  }`}
                                >
                                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                                    isSelected
                                      ? `bg-gradient-to-br ${type.color} text-white shadow-lg ${type.glow}`
                                      : 'bg-bg-tertiary text-text-secondary group-hover:bg-bg-secondary'
                                  }`}>
                                    <Icon className="w-5 h-5" />
                                  </div>
                                  <div className="flex-grow min-w-0">
                                    <h5 className={`text-sm font-bold transition-colors ${isSelected ? 'text-text-primary' : 'text-text-primary'}`}>{type.title}</h5>
                                    <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">{type.desc}</p>
                                  </div>
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                    isSelected ? 'border-accent bg-accent scale-110' : 'border-border-primary'
                                  }`}>
                                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Step 3: Scope Coverage Accordions */}
                      {step === 3 && (
                        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                          <div className="text-center space-y-1">
                            <h4 className="font-display font-extrabold text-sm">Configure Test Scope</h4>
                            <p className="text-[10px] text-text-secondary">Expand each subject and select units or topics.</p>
                          </div>

                          <div className="space-y-3">
                            {selectedSubjects.map((subject) => (
                              <SubjectAccordion
                                key={subject._id}
                                subject={subject}
                                testType={testType}
                                selectedUnits={selectionMap[subject._id]?.units || []}
                                selectedTopics={selectionMap[subject._id]?.topics || []}
                                onUnitToggle={(u) => updateUnitsSelection(subject._id, u)}
                                onTopicToggle={(t) => updateTopicsSelection(subject._id, t)}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Step 4: Evaluation Method */}
                      {step === 4 && (
                        <div className="space-y-5">
                          <div className="text-center space-y-1">
                            <h4 className="font-display font-extrabold text-base">Evaluation Method</h4>
                            <p className="text-xs text-text-muted">Choose how your answers will be checked and graded.</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                              { id: 'self', icon: Brain, title: 'Self Evaluation', desc: 'Check yourself step-by-step with detailed model solutions immediately after finishing.', color: 'from-purple-500 to-violet-600', badge: '⚡ Instant', badgeColor: 'text-purple-400 bg-purple-500/10' },
                              { id: 'photo', icon: Camera, title: 'AI Answer Sheet', desc: 'Write on paper, take photos at the end, and let PaperHub AI grade your handwriting for you.', color: 'from-cyan-500 to-blue-600', badge: '🤖 AI-Powered', badgeColor: 'text-cyan-400 bg-cyan-500/10' }
                            ].map((method) => {
                              const isSelected = evaluationMethod === method.id;
                              const Icon = method.icon;
                              return (
                                <button
                                  key={method.id}
                                  type="button"
                                  onClick={() => setEvaluationMethod(method.id as EvalMethod)}
                                  className={`relative p-5 rounded-2xl border-2 text-left flex flex-col gap-4 transition-all duration-200 overflow-hidden ${
                                    isSelected
                                      ? 'border-accent/40 bg-accent/5 shadow-lg shadow-accent/10'
                                      : 'border-border-primary/60 bg-bg-primary/20 hover:bg-bg-tertiary/60 hover:border-border-primary'
                                  }`}
                                >
                                  {isSelected && (
                                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-accent/8 blur-2xl pointer-events-none" />
                                  )}
                                  <div className="flex items-start justify-between w-full">
                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                                      isSelected ? `bg-gradient-to-br ${method.color} text-white shadow-lg` : 'bg-bg-tertiary text-text-secondary'
                                    }`}>
                                      <Icon className="w-5 h-5" />
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                      isSelected ? 'border-accent bg-accent scale-110' : 'border-border-primary'
                                    }`}>
                                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </div>
                                  </div>
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                      <h5 className="text-sm font-bold text-text-primary">{method.title}</h5>
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${method.badgeColor}`}>{method.badge}</span>
                                    </div>
                                    <p className="text-[11px] text-text-muted leading-relaxed">{method.desc}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* XP / Leaderboard Notice Banner */}
                          <div className="p-4 rounded-xl border border-border-primary/50 bg-bg-secondary/40 backdrop-blur-sm text-xs space-y-2 text-left">
                            <h5 className="font-bold text-text-primary text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
                              <span>Notice: XP &amp; Leaderboards</span>
                            </h5>
                            <ul className="list-disc pl-4 space-y-1 text-[11px] text-text-secondary leading-relaxed">
                              <li>
                                <strong>Self Evaluation:</strong> Mode for instant self-practice. Results do <strong>not</strong> count toward XP, Streaks, or Leaderboard standings to preserve fair competition.
                              </li>
                              <li>
                                <strong>AI Answer Sheet:</strong> Graded evaluation. Submitting photos of your paper answer sheet awards XP and updates your Leaderboard rank based on the AI score.
                              </li>
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Step 5: Question Count */}
                      {step === 5 && (
                        <div className="space-y-6">
                          <div className="text-center space-y-1">
                            <h4 className="font-display font-extrabold text-sm">Number of Questions</h4>
                            <p className="text-[10px] text-text-secondary">Configure how many questions you want to solve.</p>
                          </div>

                          <div className="p-4 rounded-xl border border-border-primary bg-bg-primary/45 flex items-center gap-3 w-fit mx-auto">
                            {loadingCount ? (
                              <Loader2 className="w-4 h-4 text-accent animate-spin" />
                            ) : availableCount === 0 ? (
                              <span className="text-red-500 font-bold">⚠</span>
                            ) : (
                              <span className="text-green-500 font-bold">✓</span>
                            )}
                            <span className="text-xs font-semibold">
                              {loadingCount 
                                ? 'Fetching question bank count...' 
                                : availableCount === 0 
                                ? 'No questions available for this configuration. Go back and add units/subjects.' 
                                : `${availableCount ?? 0} questions available in bank.`}
                            </span>
                          </div>

                          {availableCount !== 0 && (
                            <div className="space-y-6">
                              <div className="flex items-center justify-center gap-4">
                                <button
                                  type="button"
                                  onClick={() => setQuestionCount(Math.max(1, questionCount - 1))}
                                  disabled={questionCount <= 1}
                                  className="w-10 h-10 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary flex items-center justify-center transition-all disabled:opacity-30"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  max={availableCount || 50}
                                  value={questionCount}
                                  onChange={(e) => {
                                    const n = parseInt(e.target.value, 10);
                                    if (!isNaN(n)) setQuestionCount(Math.min(Math.max(1, n), availableCount || 50));
                                  }}
                                  className="w-20 h-12 text-center text-xl font-black bg-bg-secondary border-2 border-accent/40 rounded-xl text-text-primary focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => setQuestionCount(Math.min(availableCount || 50, questionCount + 1))}
                                  disabled={availableCount !== null && questionCount >= availableCount}
                                  className="w-10 h-10 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary flex items-center justify-center transition-all disabled:opacity-30"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="flex justify-center gap-2">
                                {QUICK_QUESTIONS.map((n) => {
                                  const disabled = availableCount !== null && n > availableCount;
                                  return (
                                    <button
                                      key={n}
                                      type="button"
                                      disabled={disabled}
                                      onClick={() => setQuestionCount(n)}
                                      className={`px-3.5 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                                        questionCount === n
                                          ? 'bg-accent border-accent text-white'
                                          : disabled
                                          ? 'opacity-30 cursor-not-allowed border-border-primary'
                                          : 'border-border-primary hover:border-accent/30 hover:bg-accent/5'
                                      }`}
                                    >
                                      {n} Qs
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Step 6: Duration & presets */}
                      {step === 6 && (
                        <div className="space-y-6">
                          <div className="text-center space-y-1">
                            <h4 className="font-display font-extrabold text-sm">Configure Time Limit</h4>
                            <p className="text-[10px] text-text-secondary">Determine test duration and pacing limits.</p>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { id: 'minor', label: 'Minor Paper', desc: '90 min', val: 90 },
                              { id: 'major', label: 'Major Paper', desc: '3 hours', val: 180 },
                              { id: 'custom', label: 'Custom', desc: 'Set slider', val: customMinutes }
                            ].map((mode) => {
                              const isSelected = timeMode === mode.id;
                              return (
                                <button
                                  key={mode.id}
                                  type="button"
                                  onClick={() => setTimeMode(mode.id as TimeMode)}
                                  className={`py-3.5 px-3 rounded-xl border text-center transition-all duration-200 ${
                                    isSelected ? 'border-accent/50 bg-accent/5 shadow-xs' : 'border-border-primary bg-bg-primary/50 hover:bg-bg-tertiary'
                                  }`}
                                >
                                  <span className={`block text-xs font-bold ${isSelected ? 'text-accent' : 'text-text-primary'}`}>{mode.label}</span>
                                  <span className={`block text-[9px] mt-0.5 ${isSelected ? 'text-accent/80' : 'text-text-muted'}`}>{mode.desc}</span>
                                </button>
                              );
                            })}
                          </div>

                          {timeMode === 'custom' && (
                            <div className="p-4 rounded-xl border border-accent/20 bg-accent/5 flex items-center justify-center gap-4">
                              <button
                                type="button"
                                onClick={() => setCustomMinutes(Math.max(10, customMinutes - 10))}
                                disabled={customMinutes <= 10}
                                className="w-8 h-8 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary flex items-center justify-center transition-all disabled:opacity-30"
                              >
                                -
                              </button>
                              <div className="text-center">
                                <span className="text-xl font-black text-text-primary">{customMinutes}</span>
                                <span className="text-[10px] text-text-muted font-bold uppercase block tracking-wider leading-none">Mins</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setCustomMinutes(Math.min(300, customMinutes + 10))}
                                disabled={customMinutes >= 300}
                                className="w-8 h-8 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary flex items-center justify-center transition-all disabled:opacity-30"
                              >
                                +
                              </button>
                            </div>
                          )}

                          <div className="p-4 rounded-xl border border-accent/20 bg-gradient-to-r from-accent/5 to-transparent flex items-center gap-4.5">
                            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                              <Clock className="w-4 h-4 text-accent" />
                            </div>
                            <div className="text-left">
                              <p className="text-[9px] uppercase tracking-wider font-bold text-text-muted">Pacing Metric</p>
                              <p className="text-text-primary text-xs font-bold mt-0.5">
                                {getDurationMinutes()} min ÷ {questionCount} questions ={' '}
                                <span className="text-accent text-sm font-black">{timePerQuestion()}</span>
                                <span className="text-text-muted text-[10px] font-normal"> per question</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Footer Navigation bar */}
                <div className="flex items-center justify-between px-7 py-5 border-t border-border-primary/30 bg-bg-secondary/30">
                  {step > 1 ? (
                    <button
                      onClick={goBack}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border-primary bg-bg-tertiary/60 hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-xs font-semibold transition-all"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back
                    </button>
                  ) : (
                    <div />
                  )}

                  {step < 6 ? (
                    <button
                      onClick={goNext}
                      disabled={!canProceed()}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all shadow-lg shadow-accent/25 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      Continue
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={startTest}
                      disabled={!canProceed() || starting}
                      className="flex items-center gap-2 px-7 py-2.5 rounded-xl bg-gradient-to-r from-accent to-indigo-500 hover:opacity-90 text-white text-xs font-bold transition-all shadow-lg shadow-accent/30 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {starting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      {starting ? 'Starting...' : 'Launch Test'}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* PYQ Mock Test Modal */}
      <AnimatePresence>
        {isPYQModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ y: 20, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 20, scale: 0.95 }}
              className="bg-bg-secondary border border-border-primary rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary bg-bg-tertiary">
                <div className="flex items-center gap-3">
                  {selectedPYQPaper && !starting && (
                    <button
                      onClick={() => setSelectedPYQPaper(null)}
                      className="p-1.5 rounded-lg border border-border-primary bg-bg-primary hover:bg-bg-secondary text-text-secondary transition-colors"
                      aria-label="Back to papers"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <div>
                    <h2 className="text-lg font-display font-bold text-text-primary">
                      {selectedPYQPaper ? 'Evaluation Method' : 'PYQ Mock Tests'}
                    </h2>
                    <p className="text-xs text-text-muted mt-0.5">
                      {selectedPYQPaper 
                        ? `${selectedPYQPaper.examType} ${selectedPYQPaper.year} — ${selectedPYQPaper.subjectCode}` 
                        : 'Select a past-year question paper to attempt'}
                    </p>
                  </div>
                </div>
                {!starting && (
                  <button 
                    onClick={() => {
                      setIsPYQModalOpen(false);
                      setSelectedPYQPaper(null);
                    }}
                    className="w-8 h-8 rounded-full bg-bg-primary border border-border-primary flex items-center justify-center hover:bg-bg-secondary transition-colors"
                  >
                    <span className="text-lg leading-none mt-[-2px]">&times;</span>
                  </button>
                )}
              </div>

              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                {starting ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 space-y-4 text-center h-full">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full animate-ping opacity-10 bg-accent" />
                      <Loader2 className="w-12 h-12 animate-spin text-accent" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-display font-bold text-sm text-text-primary">Preparing Exam Session...</h3>
                      <p className="text-xs text-text-muted max-w-[280px] leading-relaxed mx-auto">
                        Fetching past-year questions, setting up environment, and generating answer sheets. This will only take a moment.
                      </p>
                    </div>
                  </div>
                ) : selectedPYQPaper ? (
                  <div className="space-y-6">
                    <div className="text-center space-y-1">
                      <h4 className="font-display font-extrabold text-base">How would you like to evaluate your answers?</h4>
                      <p className="text-xs text-text-muted">Choose between instant self-grading or AI vision handwriting feedback.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { id: 'self', icon: Brain, title: 'Self Evaluation', desc: 'Check yourself step-by-step with detailed model solutions immediately after finishing.', color: 'from-purple-500 to-violet-600', badge: '⚡ Instant', badgeColor: 'text-purple-400 bg-purple-500/10' },
                        { id: 'photo', icon: Camera, title: 'AI Answer Sheet', desc: 'Write on paper, take photos at the end, and let PaperHub AI grade your handwriting for you.', color: 'from-cyan-500 to-blue-600', badge: '🤖 AI-Powered', badgeColor: 'text-cyan-400 bg-cyan-500/10' }
                      ].map((method) => {
                        const isSelected = pyqEvaluationMethod === method.id;
                        const Icon = method.icon;
                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setPyqEvaluationMethod(method.id as EvalMethod)}
                            className={`relative p-5 rounded-2xl border-2 text-left flex flex-col gap-4 transition-all duration-200 overflow-hidden ${
                              isSelected
                                ? 'border-accent/45 bg-accent/5 shadow-lg shadow-accent/10'
                                : 'border-border-primary/60 bg-bg-primary/20 hover:bg-bg-tertiary/60 hover:border-border-primary'
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-accent/8 blur-2xl pointer-events-none" />
                            )}
                            <div className="flex items-start justify-between w-full">
                              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                                isSelected ? `bg-gradient-to-br ${method.color} text-white shadow-lg` : 'bg-bg-tertiary text-text-secondary'
                              }`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                isSelected ? 'border-accent bg-accent scale-110' : 'border-border-primary'
                              }`}>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <h5 className="text-sm font-bold text-text-primary">{method.title}</h5>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${method.badgeColor}`}>{method.badge}</span>
                              </div>
                              <p className="text-[11px] text-text-muted leading-relaxed">{method.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Notice Banner */}
                    <div className="p-4 rounded-xl border border-border-primary/50 bg-bg-secondary/45 backdrop-blur-sm text-xs space-y-2 text-left">
                      <h5 className="font-bold text-text-primary text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
                        <span>Notice: XP &amp; Leaderboards</span>
                      </h5>
                      <ul className="list-disc pl-4 space-y-1 text-[11px] text-text-secondary leading-relaxed">
                        <li>
                          <strong>Self Evaluation:</strong> Mode for instant self-practice. Results do <strong>not</strong> count toward XP, Streaks, or Leaderboard standings to preserve fair competition.
                        </li>
                        <li>
                          <strong>AI Answer Sheet:</strong> Graded evaluation. Submitting photos of your paper answer sheet awards XP and updates your Leaderboard rank based on the AI score.
                        </li>
                      </ul>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => startPYQSession(selectedPYQPaper, pyqEvaluationMethod)}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-accent to-indigo-500 hover:opacity-95 text-white text-xs font-bold transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        <span>Launch Test ({selectedPYQPaper.examType.toLowerCase().includes('major') ? '180 mins' : '90 mins'})</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {pyqPapers.majors.length === 0 && pyqPapers.minors.length === 0 && (
                      <div className="text-center py-8 border border-dashed border-border-primary rounded-xl bg-bg-primary/50">
                        <FileText className="w-8 h-8 mx-auto text-text-muted/50 mb-3" />
                        <p className="text-sm font-bold text-text-primary">No PYQs available</p>
                        <p className="text-xs text-text-muted mt-1">We couldn't find past year papers for your current subjects.</p>
                      </div>
                    )}

                    {pyqPapers.majors.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold text-accent uppercase tracking-wider flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Major Papers
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {pyqPapers.majors.map((p, idx) => (
                            <button 
                              key={idx}
                              onClick={() => setSelectedPYQPaper(p)}
                              className="p-4 rounded-xl border border-border-primary bg-bg-primary hover:bg-bg-tertiary hover:border-accent/40 text-left transition-all group relative overflow-hidden"
                            >
                              <div className="relative z-10 flex flex-col h-full justify-between">
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[9px] font-bold uppercase">{p.examType} {p.year}</span>
                                    <span className="text-[10px] text-text-muted font-mono">{p.subjectCode}</span>
                                  </div>
                                  <h4 className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors line-clamp-2">{p.subjectName}</h4>
                                </div>
                                <div className="flex items-center gap-1.5 mt-4 text-[10px] font-bold text-text-muted group-hover:text-text-primary transition-colors">
                                  <span>Configure Test (180 mins)</span>
                                  <ChevronRight className="w-3 h-3" />
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {pyqPapers.minors.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                          <Layers className="w-4 h-4" />
                          Minor Papers
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {pyqPapers.minors.map((p, idx) => (
                            <button 
                              key={idx}
                              onClick={() => setSelectedPYQPaper(p)}
                              className="p-4 rounded-xl border border-border-primary bg-bg-primary hover:bg-bg-tertiary hover:border-indigo-400/40 text-left transition-all group relative overflow-hidden"
                            >
                              <div className="relative z-10 flex flex-col h-full justify-between">
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 text-[9px] font-bold uppercase">{p.examType} {p.year}</span>
                                    <span className="text-[10px] text-text-muted font-mono">{p.subjectCode}</span>
                                  </div>
                                  <h4 className="text-sm font-bold text-text-primary group-hover:text-indigo-400 transition-colors line-clamp-2">{p.subjectName}</h4>
                                </div>
                                <div className="flex items-center gap-1.5 mt-4 text-[10px] font-bold text-text-muted group-hover:text-text-primary transition-colors">
                                  <span>Configure Test (90 mins)</span>
                                  <ChevronRight className="w-3 h-3" />
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Collapsible Subject Accordion ---
function SubjectAccordion({
  subject,
  testType,
  selectedUnits,
  selectedTopics,
  onUnitToggle,
  onTopicToggle
}: {
  subject: Subject;
  testType: TestType;
  selectedUnits: number[];
  selectedTopics: string[];
  onUnitToggle: (unit: number) => void;
  onTopicToggle: (topic: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  const totalSelected = testType === 'unit' ? selectedUnits.length : selectedTopics.length;
  const scopeText = testType === 'unit' 
    ? `${totalSelected} of ${subject.syllabus.length} units` 
    : `${totalSelected} topics`;

  return (
    <div className="border border-border-primary bg-bg-primary/20 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4.5 py-3.5 flex items-center justify-between bg-bg-secondary/60 hover:bg-bg-secondary border-b border-border-primary/50 text-left transition-colors"
      >
        <div className="space-y-0.5">
          <span className="text-xs font-bold text-text-primary">{subject.name}</span>
          <span className="text-[9px] text-text-muted font-bold block">{subject.code} · <span className="text-accent">{scopeText} selected</span></span>
        </div>
        <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="p-4 bg-bg-secondary/10">
          {testType === 'unit' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {subject.syllabus.map((u) => {
                const isSelected = selectedUnits.includes(u.unitNumber);
                return (
                  <button
                    key={u.unitNumber}
                    type="button"
                    onClick={() => onUnitToggle(u.unitNumber)}
                    className={`p-3 rounded-lg border text-left flex items-start gap-3 transition-all ${
                      isSelected ? 'border-accent/40 bg-accent/5' : 'border-border-primary bg-bg-secondary/40 hover:bg-bg-secondary/70'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? 'border-accent bg-accent text-white' : 'border-border-primary bg-bg-primary'}`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3px]" />}
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-text-primary block">Unit {u.unitNumber}</span>
                      <p className="text-[9px] text-text-secondary leading-tight mt-0.5 line-clamp-2">{u.unitTitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {testType === 'topic' && (
            <div className="space-y-2.5">
              {subject.syllabus.map((u) => (
                <UnitTopicAccordion
                  key={u.unitNumber}
                  unit={u}
                  selectedTopics={selectedTopics}
                  onTopicToggle={onTopicToggle}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Nested Unit and Topic pill accordion ---
function UnitTopicAccordion({
  unit,
  selectedTopics,
  onTopicToggle
}: {
  unit: SyllabusUnit;
  selectedTopics: string[];
  onTopicToggle: (topic: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedCount = unit.topics.filter(t => selectedTopics.includes(t)).length;

  return (
    <div className="border border-border-primary/50 bg-bg-primary/10 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2 flex items-center justify-between text-left hover:bg-bg-secondary/50 transition-colors"
      >
        <span className="text-[11px] font-bold text-text-primary">
          Unit {unit.unitNumber}: <span className="text-text-secondary font-semibold text-[10px]">{unit.unitTitle}</span>
        </span>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 bg-accent/10 text-accent rounded-full">
              {selectedCount} selected
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="px-3.5 pb-3 pt-1.5 border-t border-border-primary/30 flex flex-wrap gap-1.5">
          {unit.topics.length === 0 ? (
            <span className="text-[9px] text-text-muted italic">No topics listed in syllabus.</span>
          ) : (
            unit.topics.map((t) => {
              const isSelected = selectedTopics.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onTopicToggle(t)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                    isSelected
                      ? 'bg-accent/15 border border-accent/40 text-accent'
                      : 'bg-bg-secondary border border-border-primary/80 text-text-secondary hover:border-accent/30'
                  }`}
                >
                  {t}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
