'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/sidebar';
import { useAuth } from '@/components/auth-provider';
import { useTheme } from '@/components/theme-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { seedColleges } from '@/lib/seedData';
import { 
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
    activeClass = 'border-green-500/60 shadow-[0_0_15px_rgba(34,197,94,0.12)] bg-green-500/5';
    badgeBg = 'bg-green-500';
  } else if (n.includes('electrical') || n.includes('circuit') || n.includes('power system') || c.startsWith('EE') || c.startsWith('EEE') || c === 'BEE') {
    icon = Zap;
    colorClass = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    activeClass = 'border-amber-500/60 shadow-[0_0_15px_rgba(234,179,8,0.15)] bg-amber-500/5';
    badgeBg = 'bg-amber-500';
  } else if (n.includes('web') || n.includes('internet') || n.includes('html')) {
    icon = Globe;
    colorClass = 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    activeClass = 'border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.12)] bg-blue-500/5';
    badgeBg = 'bg-blue-500';
  } else if (n.includes('database') || n.includes('dbms') || n.includes('sql') || c === 'DBMS') {
    icon = Database;
    colorClass = 'text-teal-500 bg-teal-500/10 border-teal-500/20';
    activeClass = 'border-teal-500/60 shadow-[0_0_15px_rgba(20,184,166,0.12)] bg-teal-500/5';
    badgeBg = 'bg-teal-500';
  } else if (n.includes('technical writing') || n.includes('communication skill') || n.includes('english') || n.includes('professional communication')) {
    icon = MessageSquare;
    colorClass = 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    activeClass = 'border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.12)] bg-rose-500/5';
    badgeBg = 'bg-rose-500';
  }

  return { icon, colorClass, activeClass, badgeBg };
}

// --- Step Progress Component ---
function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center w-full max-w-xl mx-auto mb-10 overflow-x-auto py-2 px-1 scrollbar-none">
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < current;
        const isActive = stepNum === current;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-accent border-accent text-white'
                    : isActive
                    ? 'bg-accent/10 border-accent text-accent shadow-[0_0_10px_rgba(249,115,22,0.2)] dark:shadow-[0_0_10px_rgba(124,102,255,0.25)]'
                    : 'bg-bg-secondary border-border-primary text-text-muted'
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : stepNum}
              </div>
              <span
                className={`text-[8px] font-bold uppercase tracking-wider ${
                  isActive ? 'text-accent' : isCompleted ? 'text-accent/70' : 'text-text-muted'
                }`}
              >
                {label}
              </span>
            </div>
            {i < total - 1 && (
              <div className="flex-grow min-w-[30px] h-0.5 mx-2 mt-[-10px] relative">
                <div className="absolute inset-0 bg-border-primary/60 rounded-full" />
                <motion.div
                  className="absolute inset-y-0 left-0 bg-accent rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: stepNum < current ? '100%' : '0%' }}
                  transition={{ duration: 0.3 }}
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

export default function SubjectTestSetupPage() {
  const params = useParams();
  const router = useRouter();
  const { user, fbUser } = useAuth();
  const subjectId = params.subjectId as string;
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Configuration lists
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
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);

  // Sync mounted status to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const activeBranch = user?.profile?.branch || (typeof window !== 'undefined' ? localStorage.getItem('selectedBranch') : '') || '';
  const activeSemester = user?.profile?.semester || (typeof window !== 'undefined' ? Number(localStorage.getItem('selectedSemester') || 1) : 1);

  // Load subject breadcrumbs
  useEffect(() => {
    if (!mounted) return;
    const college = localStorage.getItem('selectedCollege') || 'MMMUT';
    const branch = activeBranch || 'CSE';
    const semester = activeSemester || '1';
    setBreadcrumbs([college, branch, `Sem ${semester}`]);
  }, [mounted, activeBranch, activeSemester]);

  // Fetch subjects for active semester & branch
  useEffect(() => {
    if (!mounted) return;
    const fetchSubjects = async () => {
      try {
        setLoadingSubjects(true);
        const college = localStorage.getItem('selectedCollege') || 'MMMUT';
        const branch = activeBranch || 'CSE';
        const sem = activeSemester || 1;
        const isLocalFallback = localStorage.getItem('useLocalFallback') === 'true';

        if (isLocalFallback || subjectId.startsWith('mock-')) {
          const col = seedColleges.find((c) => c.code === college);
          const br = col?.branches.find((b) => b.code === branch);
          const subs = br?.subjects.filter((s) => s.semester === sem) || [];
          const mapped = subs.map((s) => ({
            _id: `mock-${s.code}`,
            name: s.name,
            code: s.code,
            syllabus: s.syllabus
          }));
          setSubjects(mapped);
        } else {
          const res = await fetch(`/api/subjects?collegeCode=${college}&branchCode=${branch}&semester=${sem}`);
          if (res.ok) {
            const data = await res.json();
            setSubjects(data.subjects || []);
          }
        }
      } catch (err) {
        console.error('Failed to load active subjects:', err);
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, [mounted, subjectId, activeBranch, activeSemester]);

  // Pre-select current subjectId once subjects are loaded
  useEffect(() => {
    if (subjects.length > 0 && selectedSubjects.length === 0) {
      const currentSub = subjects.find((s) => s._id === subjectId || s.code === subjectId.replace('mock-', ''));
      if (currentSub) {
        setSelectedSubjects([currentSub]);
        setSelectionMap({
          [currentSub._id]: { units: [], topics: [] }
        });
      }
    }
  }, [subjects, subjectId, selectedSubjects]);

  // Fetch dynamic question counts
  const fetchAvailableCount = useCallback(async () => {
    if (selectedSubjects.length === 0) {
      setAvailableCount(0);
      return;
    }

    const isLocalFallback = localStorage.getItem('useLocalFallback') === 'true' || subjectId.startsWith('mock-');
    if (isLocalFallback) {
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
  }, [selectedSubjects, testType, selectionMap, subjectId]);

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
        return selectedSubjects.every((s) => selectionMap[s._id]?.units?.length > 0);
      }
      if (testType === 'topic') {
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
    const isLocalFallback = localStorage.getItem('useLocalFallback') === 'true' || subjectId.startsWith('mock-');

    // Map selections array
    const selections = selectedSubjects.map((s) => {
      const map = selectionMap[s._id];
      return {
        subjectId: s._id,
        units: testType === 'unit' ? map.units : [],
        topics: testType === 'topic' ? map.topics : []
      };
    });

    if (isLocalFallback) {
      router.push(
        `/subjects/${selectedSubjects[0]._id}/test/solve?type=${testType}&duration=${minutes}&count=${questionCount}&evaluationMethod=${evaluationMethod}`
      );
      return;
    }

    try {
      const token = fbUser ? await fbUser.getIdToken() : '';
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          subjectId: selectedSubjects.map((s) => s._id),
          type: 'test',
          subType: testType,
          evaluationMethod,
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
      console.error(err);
      setErrorMessage(err.message || 'Error occurred starting the session. Make sure there are verified questions available.');
    } finally {
      setStarting(false);
    }
  };

  if (!mounted) return null;

  const currentSubjectObj = selectedSubjects[0];

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary text-text-primary transition-colors duration-300">
      {/* Navbar */}
      <header className="border-b border-border-primary/50 bg-bg-primary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href={`/subjects/${subjectId}`}
              className="p-2 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <nav className="flex items-center space-x-1.5 text-xs text-text-secondary font-medium overflow-x-auto whitespace-nowrap">
              {breadcrumbs.map((c, idx) => (
                <span key={idx} className="flex items-center space-x-1.5">
                  <span>{c}</span>
                  <span className="text-text-muted">/</span>
                </span>
              ))}
              <Link href={`/subjects/${subjectId}`} className="hover:text-accent">
                {currentSubjectObj ? currentSubjectObj.code : 'Subject'}
              </Link>
              <span className="text-text-muted">/</span>
              <span className="text-text-primary font-bold">Test Setup</span>
            </nav>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow max-w-3xl w-full mx-auto px-6 py-10 relative">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-8 relative z-10">
          <span className="text-xs font-bold uppercase tracking-wider text-accent mb-2 block">Exam Arena</span>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-text-primary">
            Exam Simulation Setup
          </h1>
          <p className="text-xs text-text-secondary mt-2">Step {step} of {STEP_LABELS.length}: {STEP_LABELS[step - 1]}</p>
        </div>

        {/* Step progress */}
        <StepProgress current={step} total={STEP_LABELS.length} />

        {errorMessage && (
          <div className="p-4 rounded-xl border border-red-500/25 bg-red-500/5 text-xs text-red-500 font-semibold flex items-center gap-2 mb-6 relative z-10">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Stepper Wizard Card */}
        <div className="relative z-10 overflow-hidden p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-md">
          <div className="min-h-[265px]">
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
                  <div className="space-y-4">
                    <div className="text-center space-y-1">
                      <h4 className="font-display font-extrabold text-sm">Select Subjects</h4>
                      <p className="text-[10px] text-text-secondary">Toggle one or multiple subjects for a combined mock test.</p>
                    </div>

                    {loadingSubjects ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-accent" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {subjects.map((sub) => {
                          const isSelected = selectedSubjects.some((s) => s._id === sub._id);
                          const { icon: Icon, colorClass, activeClass, badgeBg } = getSubjectTheme(sub.name, sub.code);
                          return (
                            <button
                              key={sub._id}
                              type="button"
                              onClick={() => toggleSubject(sub)}
                              className={`relative p-4.5 rounded-xl border transition-all text-left flex flex-col justify-between group h-28 ${
                                isSelected ? activeClass : 'border-border-primary bg-bg-primary/50 hover:bg-bg-tertiary hover:border-text-muted/30'
                              }`}
                            >
                              {isSelected && (
                                <div className={`absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center text-white shadow-md ${badgeBg}`}>
                                  <Check className="w-2.5 h-2.5 stroke-[3px]" />
                                </div>
                              )}

                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${colorClass}`}>
                                <Icon className="w-4.5 h-4.5" />
                              </div>
                              <div className="space-y-0.5">
                                <h5 className="font-display font-bold text-xs text-text-primary leading-tight truncate">
                                  {sub.name}
                                </h5>
                                <span className="text-[9px] text-text-muted font-bold block">{sub.code}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Select Test Type */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div className="text-center space-y-1">
                      <h4 className="font-display font-extrabold text-sm">Select Test Type</h4>
                      <p className="text-[10px] text-text-secondary">Determine the breadth and layout of the mock questions.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3.5">
                      {[
                        { id: 'syllabus', icon: Layers, title: 'Full Syllabus Test', desc: 'Drawn across all units and chapters of selected subjects.' },
                        { id: 'unit', icon: BookOpen, title: 'Unit-Wise Test', desc: 'Select specific chapters/units to cover.' },
                        { id: 'topic', icon: Target, title: 'Topic-Wise Test', desc: 'Focus specifically on custom topics from the syllabus.' }
                      ].map((type) => {
                        const isSelected = testType === type.id;
                        const Icon = type.icon;
                        return (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setTestType(type.id as TestType)}
                            className={`p-4 rounded-xl border text-left flex items-start gap-4 transition-all ${
                              isSelected ? 'border-accent/40 bg-accent/5 shadow-xs' : 'border-border-primary bg-bg-primary/50 hover:bg-bg-tertiary'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-secondary'}`}>
                              <Icon className="w-4.5 h-4.5" />
                            </div>
                            <div className="flex-grow">
                              <h5 className="text-xs font-bold text-text-primary">{type.title}</h5>
                              <p className="text-[10px] text-text-secondary mt-0.5 leading-relaxed">{type.desc}</p>
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? 'border-accent bg-accent' : 'border-border-primary'}`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
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
                  <div className="space-y-4">
                    <div className="text-center space-y-1">
                      <h4 className="font-display font-extrabold text-sm">Choose Evaluation Method</h4>
                      <p className="text-[10px] text-text-secondary">Decide how your handwritten sheet or answer will be graded.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { id: 'self', icon: Brain, title: 'Self Evaluation', desc: 'Grade yourself step-by-step using our comprehensive model solutions immediately after finishing.' },
                        { id: 'photo', icon: Camera, title: 'AI Answer Sheet', desc: 'Write on paper, snap pictures with your mobile at the end, and let PaperHub AI grade your handwriting.' }
                      ].map((method) => {
                        const isSelected = evaluationMethod === method.id;
                        const Icon = method.icon;
                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setEvaluationMethod(method.id as EvalMethod)}
                            className={`p-5 rounded-xl border text-left flex flex-col gap-3.5 transition-all h-full ${
                              isSelected ? 'border-accent/40 bg-accent/5 shadow-xs' : 'border-border-primary bg-bg-primary/50 hover:bg-bg-tertiary'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isSelected ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-secondary'}`}>
                                <Icon className="w-4.5 h-4.5" />
                              </div>
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-accent bg-accent' : 'border-border-primary'}`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-text-primary">{method.title}</h5>
                              <p className="text-[10px] text-text-secondary mt-1 leading-relaxed">{method.desc}</p>
                            </div>
                          </button>
                        );
                      })}
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
          <div className="flex items-center justify-between border-t border-border-primary/45 pt-4 mt-6">
            {step > 1 ? (
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-semibold transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 6 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!canProceed()}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-hover transition-all shadow-md disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startTest}
                disabled={!canProceed() || starting}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-hover transition-all shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {starting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                {starting ? 'Starting...' : 'Start Test Session'}
              </button>
            )}
          </div>
        </div>

        {/* Integrity notice */}
        <div className="mt-8 p-4 rounded-2xl border border-amber-500/25 bg-amber-500/5 flex items-start gap-3 text-xs leading-relaxed text-text-secondary relative z-10">
          <ShieldAlert className="w-4.5 h-4.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p>
            <span className="font-bold text-text-primary">Integrity Guard Active — </span>
            Focus losses, tab switches &amp; fullscreen exits are tracked and displayed in your summary report.
          </p>
        </div>
      </main>

      <footer className="border-t border-border-primary/50 bg-bg-secondary/20 py-5 text-center text-xs text-text-muted mt-auto">
        Ensure a stable environment before launching the timed test session.
      </footer>
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
    <div className="border border-border-primary bg-bg-primary/20 rounded-xl overflow-hidden text-left">
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
    <div className="border border-border-primary/50 bg-bg-primary/10 rounded-lg overflow-hidden text-left">
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
