'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/theme-toggle';
import { seedColleges } from '@/lib/seedData';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  BookOpen,
  Target,
  Layers,
  Brain,
  Camera,
  Loader2,
  ShieldAlert,
  Minus,
  Plus,
  Zap,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubjectDetail {
  _id: string;
  name: string;
  code: string;
  syllabus: {
    unitNumber: number;
    unitTitle: string;
    topics: string[];
  }[];
}

type TestType = 'syllabus' | 'unit' | 'topic';
type TimeMode = 'minor' | 'major' | 'custom';
type EvalMethod = 'self' | 'photo';

const STEP_LABELS = ['Coverage', 'Evaluation', 'Questions', 'Duration'];
const QUICK_QUESTIONS = [5, 10, 20, 30];
const QUICK_DURATIONS = [30, 60, 90, 120, 180];

// ─── Step Progress Bar ────────────────────────────────────────────────────────

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center w-full max-w-lg mx-auto mb-10">
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < current;
        const isActive = stepNum === current;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-accent border-accent text-white'
                    : isActive
                    ? 'bg-accent/10 border-accent text-accent shadow-[0_0_12px_rgba(124,102,255,0.3)]'
                    : 'bg-bg-secondary border-border-primary text-text-muted'
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : stepNum}
              </div>
              <span
                className={`text-[9px] font-bold uppercase tracking-wider ${
                  isActive ? 'text-accent' : isCompleted ? 'text-accent/70' : 'text-text-muted'
                }`}
              >
                {label}
              </span>
            </div>
            {i < total - 1 && (
              <div className="flex-1 h-0.5 mx-2 mt-[-12px] relative">
                <div className="absolute inset-0 bg-border-primary/60 rounded-full" />
                <motion.div
                  className="absolute inset-y-0 left-0 bg-accent rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: stepNum < current ? '100%' : '0%' }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Slide animation variants ─────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TestSelection() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.subjectId as string;

  // Load state
  const [subject, setSubject] = useState<SubjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);

  // Wizard state
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  // Step 1: Coverage
  const [testType, setTestType] = useState<TestType>('syllabus');
  const [selectedUnits, setSelectedUnits] = useState<number[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  // Step 2: Evaluation
  const [evaluationMethod, setEvaluationMethod] = useState<EvalMethod>('self');

  // Step 3: Questions
  const [questionCount, setQuestionCount] = useState(5);
  const [availableCount, setAvailableCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  // Step 4: Duration
  const [timeMode, setTimeMode] = useState<TimeMode>('minor');
  const [customMinutes, setCustomMinutes] = useState(60);

  // Starting
  const [starting, setStarting] = useState(false);

  // ── Load subject data ──────────────────────────────────────────────────────
  useEffect(() => {
    const college = localStorage.getItem('selectedCollege') || 'MMMUT';
    const branch = localStorage.getItem('selectedBranch') || 'CSE';
    const semester = localStorage.getItem('selectedSemester') || '1';
    setBreadcrumbs([college, branch, `Sem ${semester}`]);

    const isLocalFallback = localStorage.getItem('useLocalFallback') === 'true';

    if (isLocalFallback || subjectId.startsWith('mock-')) {
      const subjectCode = subjectId.replace('mock-', '');
      const col = seedColleges.find((c) => c.code === college);
      const br = col?.branches.find((b) => b.code === branch);
      const sub = br?.subjects.find((s) => s.code === subjectCode);
      if (sub) setSubject({ _id: subjectId, name: sub.name, code: sub.code, syllabus: sub.syllabus });
      setLoading(false);
    } else {
      fetch(`/api/subjects/${subjectId}`)
        .then((r) => r.json())
        .then((data) => { if (data.subject) setSubject(data.subject); else router.push('/onboarding'); })
        .catch(() => router.push('/onboarding'))
        .finally(() => setLoading(false));
    }
  }, [subjectId, router]);

  // ── Fetch available question count ─────────────────────────────────────────
  const fetchAvailableCount = useCallback(async () => {
    const isLocalFallback = localStorage.getItem('useLocalFallback') === 'true';
    if (isLocalFallback || subjectId.startsWith('mock-')) {
      // Use a rough local estimate from syllabus topics
      const total = subject?.syllabus.reduce((acc, u) => acc + u.topics.length * 2, 0) || 10;
      setAvailableCount(total);
      return;
    }

    setLoadingCount(true);
    try {
      let url = `/api/subjects/${subjectId}/question-count`;
      const qp = new URLSearchParams();

      if (testType === 'unit' && selectedUnits.length > 0) {
        qp.set('units', selectedUnits.join(','));
      } else if (testType === 'topic' && selectedTopics.length > 0) {
        qp.set('topics', selectedTopics.join(','));
      } else if (testType === 'syllabus') {
        // no filter → all questions
      }
      const qs = qp.toString();
      if (qs) url += `?${qs}`;

      const res = await fetch(url);
      const data = await res.json();
      setAvailableCount(data.count ?? 0);
    } catch {
      setAvailableCount(0);
    } finally {
      setLoadingCount(false);
    }
  }, [subjectId, testType, selectedUnits, selectedTopics, subject]);

  // Fetch count when entering step 3
  useEffect(() => {
    if (step === 3) fetchAvailableCount();
  }, [step, fetchAvailableCount]);

  // Clamp questionCount when availableCount changes
  useEffect(() => {
    if (availableCount !== null && questionCount > availableCount) {
      setQuestionCount(Math.max(1, availableCount));
    }
  }, [availableCount, questionCount]);

  // ── Duration helpers ───────────────────────────────────────────────────────
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

  // ── Navigation ─────────────────────────────────────────────────────────────
  const canProceed = (): boolean => {
    if (step === 1) {
      if (testType === 'unit') return selectedUnits.length > 0;
      if (testType === 'topic') return selectedTopics.length > 0;
      return true;
    }
    if (step === 2) return true;
    if (step === 3) {
      return questionCount >= 1 && (availableCount === null || questionCount <= availableCount);
    }
    if (step === 4) return getDurationMinutes() >= 10;
    return false;
  };

  const goNext = () => {
    if (!canProceed()) return;
    setDirection(1);
    setStep((s) => Math.min(s + 1, 4));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  };

  // ── Start Test ─────────────────────────────────────────────────────────────
  const startTest = async () => {
    if (starting || !canProceed()) return;
    setStarting(true);

    const minutes = getDurationMinutes();
    const isLocalFallback = localStorage.getItem('useLocalFallback') === 'true';

    if (isLocalFallback) {
      router.push(
        `/subjects/${subjectId}/test/solve?type=${testType}&duration=${minutes}&count=${questionCount}&evaluationMethod=${evaluationMethod}`
      );
      return;
    }

    try {
      const units =
        testType === 'syllabus'
          ? (subject?.syllabus.map((u) => u.unitNumber) || [])
          : testType === 'unit'
          ? selectedUnits
          : [];

      const topics = testType === 'topic' ? selectedTopics : [];

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: localStorage.getItem('anonymousUserId') || 'guest',
          subjectId,
          type: 'test',
          subType: testType,
          evaluationMethod,
          config: { units, topics, questionCount },
        }),
      });
      const data = await res.json();
      if (data.session) {
        router.push(`/subjects/${subjectId}/test/solve?sessionId=${data.session._id}&duration=${minutes}`);
      } else {
        router.push(
          `/subjects/${subjectId}/test/solve?type=${testType}&duration=${minutes}&count=${questionCount}&evaluationMethod=${evaluationMethod}`
        );
      }
    } catch {
      router.push(
        `/subjects/${subjectId}/test/solve?type=${testType}&duration=${minutes}&count=${questionCount}&evaluationMethod=${evaluationMethod}`
      );
    }
  };

  // ── Unit toggle ────────────────────────────────────────────────────────────
  const toggleUnit = (u: number) => {
    setSelectedUnits((prev) =>
      prev.includes(u) ? prev.filter((x) => x !== u) : [...prev, u]
    );
  };

  const toggleTopic = (t: string) => {
    setSelectedTopics((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  // ── All topics from syllabus ───────────────────────────────────────────────
  const allTopics = subject?.syllabus.flatMap((u) => u.topics) ?? [];

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
          <p className="text-xs text-text-secondary">Loading test setup...</p>
        </div>
      </div>
    );
  }

  if (!subject) return null;

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
              <Link href={`/subjects/${subjectId}`} className="hover:text-accent">{subject.code}</Link>
              <span className="text-text-muted">/</span>
              <span className="text-text-primary font-bold">Test Setup</span>
            </nav>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow max-w-3xl w-full mx-auto px-6 py-10 relative">
        {/* Background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-8 relative z-10">
          <span className="text-xs font-bold uppercase tracking-wider text-accent mb-2 block">Exam Arena</span>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-text-primary">
            Exam Simulation Setup
          </h1>
          <p className="text-xs text-text-secondary mt-2">Configure your test in {STEP_LABELS.length} quick steps</p>
        </div>

        {/* Step progress */}
        <StepProgress current={step} total={STEP_LABELS.length} />

        {/* Step card */}
        <div className="relative z-10 overflow-hidden">
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            >
              {step === 1 && (
                <Step1Coverage
                  subject={subject}
                  testType={testType}
                  setTestType={setTestType}
                  selectedUnits={selectedUnits}
                  toggleUnit={toggleUnit}
                  selectedTopics={selectedTopics}
                  toggleTopic={toggleTopic}
                  allTopics={allTopics}
                />
              )}
              {step === 2 && (
                <Step2Evaluation
                  evaluationMethod={evaluationMethod}
                  setEvaluationMethod={setEvaluationMethod}
                />
              )}
              {step === 3 && (
                <Step3Questions
                  questionCount={questionCount}
                  setQuestionCount={setQuestionCount}
                  availableCount={availableCount}
                  loadingCount={loadingCount}
                  testType={testType}
                  selectedUnits={selectedUnits}
                  selectedTopics={selectedTopics}
                />
              )}
              {step === 4 && (
                <Step4Duration
                  timeMode={timeMode}
                  setTimeMode={setTimeMode}
                  customMinutes={customMinutes}
                  setCustomMinutes={setCustomMinutes}
                  questionCount={questionCount}
                  getDurationMinutes={getDurationMinutes}
                  timePerQuestion={timePerQuestion}
                  // Summary info
                  testType={testType}
                  evaluationMethod={evaluationMethod}
                  selectedUnits={selectedUnits}
                  selectedTopics={selectedTopics}
                  subject={subject}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 relative z-10">
          {step > 1 ? (
            <button
              onClick={goBack}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-sm font-semibold transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={goNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent-hover transition-all shadow-md hover:shadow-accent/25 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={startTest}
              disabled={!canProceed() || starting}
              className="flex items-center gap-2 px-7 py-3 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent-hover transition-all shadow-lg hover:shadow-accent/30 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {starting ? 'Starting…' : 'Start Test Session'}
            </button>
          )}
        </div>

        {/* Integrity notice */}
        <div className="mt-8 p-4 rounded-2xl border border-amber-500/25 bg-amber-500/5 flex items-start gap-3 text-xs leading-relaxed text-text-secondary relative z-10">
          <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p>
            <span className="font-bold text-text-primary">Integrity Guard Active — </span>
            Focus losses, tab switches &amp; fullscreen exits are tracked and displayed in your summary report.
          </p>
        </div>
      </main>

      <footer className="border-t border-border-primary/50 bg-bg-secondary/20 py-5 text-center text-xs text-text-muted">
        Ensure a stable environment before launching the timed test session.
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Test Coverage
// ─────────────────────────────────────────────────────────────────────────────

function Step1Coverage({
  subject,
  testType, setTestType,
  selectedUnits, toggleUnit,
  selectedTopics, toggleTopic,
  allTopics,
}: {
  subject: SubjectDetail;
  testType: TestType; setTestType: (t: TestType) => void;
  selectedUnits: number[]; toggleUnit: (u: number) => void;
  selectedTopics: string[]; toggleTopic: (t: string) => void;
  allTopics: string[];
}) {
  const coverageOptions = [
    {
      id: 'syllabus' as TestType,
      icon: Layers,
      title: 'Full Syllabus',
      desc: 'Questions drawn from all units — simulates your complete university exam',
      badge: `${subject.syllabus.length} units`,
    },
    {
      id: 'unit' as TestType,
      icon: BookOpen,
      title: 'Unit-Based',
      desc: 'Focus on one or more specific units from the syllabus',
      badge: 'Multi-select',
    },
    {
      id: 'topic' as TestType,
      icon: Target,
      title: 'Topic-Based',
      desc: 'Narrow down to specific topics within the subject',
      badge: 'Targeted',
    },
  ];

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="font-display text-xl font-bold text-text-primary">What would you like to cover?</h2>
        <p className="text-xs text-text-secondary mt-1">Choose the scope of your exam simulation</p>
      </div>

      <div className="grid gap-3">
        {coverageOptions.map(({ id, icon: Icon, title, desc, badge }) => (
          <button
            key={id}
            onClick={() => setTestType(id)}
            className={`w-full p-5 rounded-2xl border text-left transition-all duration-200 group ${
              testType === id
                ? 'border-accent/50 bg-accent/8 shadow-[0_0_20px_rgba(124,102,255,0.12)]'
                : 'border-border-primary bg-bg-secondary/60 hover:border-accent/30 hover:bg-bg-tertiary/60'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                testType === id ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-secondary group-hover:bg-accent/10 group-hover:text-accent'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`text-sm font-bold ${testType === id ? 'text-accent' : 'text-text-primary'}`}>{title}</h3>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    testType === id ? 'bg-accent/15 border-accent/30 text-accent' : 'bg-bg-tertiary border-border-primary text-text-muted'
                  }`}>{badge}</span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{desc}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                testType === id ? 'border-accent bg-accent' : 'border-border-primary'
              }`}>
                {testType === id && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Unit multi-selector */}
      <AnimatePresence>
        {testType === 'unit' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-5 rounded-2xl border border-accent/20 bg-accent/5 space-y-3">
              <p className="text-xs font-bold text-accent uppercase tracking-wider">Select Units</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {subject.syllabus.map((u) => (
                  <button
                    key={u.unitNumber}
                    onClick={() => toggleUnit(u.unitNumber)}
                    className={`p-3 rounded-xl border text-left transition-all text-xs ${
                      selectedUnits.includes(u.unitNumber)
                        ? 'border-accent bg-accent text-white shadow-md'
                        : 'border-border-primary bg-bg-secondary hover:border-accent/40 text-text-primary'
                    }`}
                  >
                    <span className="font-bold block">Unit {u.unitNumber}</span>
                    <span className={`text-[10px] leading-tight mt-0.5 block truncate ${selectedUnits.includes(u.unitNumber) ? 'text-white/80' : 'text-text-secondary'}`}>
                      {u.unitTitle}
                    </span>
                  </button>
                ))}
              </div>
              {selectedUnits.length === 0 && (
                <p className="text-[10px] text-amber-500 font-medium">⚠ Please select at least one unit to continue</p>
              )}
            </div>
          </motion.div>
        )}

        {testType === 'topic' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-5 rounded-2xl border border-accent/20 bg-accent/5 space-y-3">
              <p className="text-xs font-bold text-accent uppercase tracking-wider">Select Topics</p>
              <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto pr-1">
                {allTopics.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleTopic(t)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      selectedTopics.includes(t)
                        ? 'border-accent bg-accent text-white'
                        : 'border-border-primary bg-bg-secondary hover:border-accent/40 text-text-primary'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {selectedTopics.length === 0 && (
                <p className="text-[10px] text-amber-500 font-medium">⚠ Please select at least one topic to continue</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Evaluation Method
// ─────────────────────────────────────────────────────────────────────────────

function Step2Evaluation({
  evaluationMethod,
  setEvaluationMethod,
}: {
  evaluationMethod: EvalMethod;
  setEvaluationMethod: (m: EvalMethod) => void;
}) {
  const options = [
    {
      id: 'self' as EvalMethod,
      icon: Brain,
      title: 'Self Evaluation',
      subtitle: 'Grade yourself',
      desc: 'View model solutions after each question and honestly grade your own answer. Immediate feedback, no uploads needed.',
      pros: ['Instant results', 'Detailed model solutions', 'No upload needed'],
      color: 'from-emerald-500/20 to-green-500/5',
      borderColor: 'border-emerald-500/40',
      iconBg: 'bg-emerald-500',
    },
    {
      id: 'photo' as EvalMethod,
      icon: Camera,
      title: 'AI Answer Sheet',
      subtitle: 'Vision AI grading',
      desc: 'Write your answers on paper, snap photos at the end, and our Llama 4 Vision model will evaluate your handwritten responses.',
      pros: ['Real exam simulation', 'AI vision scoring', 'Handwriting support'],
      color: 'from-violet-500/20 to-purple-500/5',
      borderColor: 'border-violet-500/40',
      iconBg: 'bg-violet-500',
    },
  ];

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="font-display text-xl font-bold text-text-primary">How will you be evaluated?</h2>
        <p className="text-xs text-text-secondary mt-1">Choose your grading method for this test session</p>
      </div>

      <div className="grid gap-4">
        {options.map(({ id, icon: Icon, title, subtitle, desc, pros, color, borderColor, iconBg }) => (
          <button
            key={id}
            onClick={() => setEvaluationMethod(id)}
            className={`w-full p-5 rounded-2xl border text-left transition-all duration-200 relative overflow-hidden ${
              evaluationMethod === id
                ? `${borderColor} shadow-[0_0_24px_rgba(0,0,0,0.12)]`
                : 'border-border-primary bg-bg-secondary/60 hover:border-accent/30'
            }`}
          >
            {/* Gradient bg */}
            <div className={`absolute inset-0 bg-gradient-to-br ${evaluationMethod === id ? color : 'opacity-0'} transition-opacity duration-300 rounded-2xl`} />

            <div className="relative flex items-start gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${evaluationMethod === id ? iconBg : 'bg-bg-tertiary'} transition-colors`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">{title}</h3>
                    <p className="text-[10px] text-text-secondary font-medium">{subtitle}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    evaluationMethod === id ? 'border-accent bg-accent' : 'border-border-primary'
                  }`}>
                    {evaluationMethod === id && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-xs text-text-secondary mt-2 leading-relaxed">{desc}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {pros.map((pro) => (
                    <span key={pro} className={`text-[9px] font-bold px-2 py-1 rounded-full border ${
                      evaluationMethod === id
                        ? 'bg-bg-primary/40 border-white/10 text-text-primary'
                        : 'bg-bg-tertiary border-border-primary text-text-muted'
                    }`}>
                      ✓ {pro}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Question Count
// ─────────────────────────────────────────────────────────────────────────────

function Step3Questions({
  questionCount, setQuestionCount,
  availableCount, loadingCount,
  testType, selectedUnits, selectedTopics,
}: {
  questionCount: number; setQuestionCount: (n: number) => void;
  availableCount: number | null; loadingCount: boolean;
  testType: TestType; selectedUnits: number[]; selectedTopics: string[];
}) {
  const cap = availableCount ?? 9999;
  const atCap = availableCount !== null && questionCount >= availableCount;
  const isEmpty = availableCount === 0;

  const clamp = (n: number) => Math.min(Math.max(1, n), cap);

  const handleInput = (val: string) => {
    const n = parseInt(val, 10);
    if (!isNaN(n)) setQuestionCount(clamp(n));
    else if (val === '') setQuestionCount(1);
  };

  const coverageLabel =
    testType === 'syllabus'
      ? 'Full Syllabus'
      : testType === 'unit'
      ? `Unit${selectedUnits.length > 1 ? 's' : ''} ${selectedUnits.join(', ')}`
      : `${selectedTopics.length} topic${selectedTopics.length > 1 ? 's' : ''}`;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="font-display text-xl font-bold text-text-primary">How many questions?</h2>
        <p className="text-xs text-text-secondary mt-1">
          Based on: <span className="text-accent font-bold">{coverageLabel}</span>
        </p>
      </div>

      {/* Availability indicator */}
      <div className="p-4 rounded-2xl border border-border-primary bg-bg-secondary/60 flex items-center gap-3">
        {loadingCount ? (
          <Loader2 className="w-4 h-4 text-accent animate-spin flex-shrink-0" />
        ) : isEmpty ? (
          <span className="text-red-500 text-sm">⚠</span>
        ) : (
          <span className="text-green-500 text-sm">✓</span>
        )}
        <div className="flex-grow">
          {loadingCount ? (
            <p className="text-xs text-text-secondary">Calculating available questions…</p>
          ) : isEmpty ? (
            <p className="text-xs text-red-500 font-medium">No questions found for this selection. Try a different coverage.</p>
          ) : (
            <>
              <p className="text-xs text-text-primary">
                <span className="font-bold text-accent">{availableCount ?? '…'}</span> questions available for{' '}
                <span className="font-medium">{coverageLabel}</span>
              </p>
              {atCap && (
                <p className="text-[10px] text-amber-500 font-medium mt-0.5">
                  Only {availableCount} questions are currently available. More questions will be added soon.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {!isEmpty && (
        <>
          {/* Stepper input */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setQuestionCount(clamp(questionCount - 1))}
              disabled={questionCount <= 1}
              className="w-12 h-12 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary hover:border-accent/40 flex items-center justify-center text-text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Minus className="w-5 h-5" />
            </button>

            <div className="relative">
              <input
                type="number"
                min={1}
                max={cap}
                value={questionCount}
                onChange={(e) => handleInput(e.target.value)}
                className="w-28 h-16 text-center text-3xl font-black bg-bg-secondary border-2 border-accent/40 rounded-2xl text-text-primary focus:outline-none focus:border-accent shadow-[0_0_16px_rgba(124,102,255,0.1)] appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="absolute -bottom-5 left-0 right-0 text-center text-[9px] text-text-muted font-bold uppercase tracking-wider">
                Questions
              </span>
            </div>

            <button
              onClick={() => setQuestionCount(clamp(questionCount + 1))}
              disabled={questionCount >= cap}
              className="w-12 h-12 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary hover:border-accent/40 flex items-center justify-center text-text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Quick-select chips */}
          <div className="pt-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted text-center mb-3">Quick select</p>
            <div className="flex justify-center flex-wrap gap-2">
              {QUICK_QUESTIONS.map((n) => {
                const disabled = n > cap;
                const isActive = questionCount === n;
                return (
                  <button
                    key={n}
                    onClick={() => !disabled && setQuestionCount(n)}
                    disabled={disabled}
                    className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-accent border-accent text-white shadow-md'
                        : disabled
                        ? 'bg-bg-tertiary border-border-primary text-text-muted opacity-40 cursor-not-allowed'
                        : 'bg-bg-secondary border-border-primary text-text-primary hover:border-accent/50 hover:bg-accent/5'
                    }`}
                  >
                    {n} Questions
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4: Duration + Review
// ─────────────────────────────────────────────────────────────────────────────

function Step4Duration({
  timeMode, setTimeMode,
  customMinutes, setCustomMinutes,
  questionCount, getDurationMinutes, timePerQuestion,
  testType, evaluationMethod, selectedUnits, selectedTopics, subject,
}: {
  timeMode: TimeMode; setTimeMode: (m: TimeMode) => void;
  customMinutes: number; setCustomMinutes: (n: number) => void;
  questionCount: number;
  getDurationMinutes: () => number;
  timePerQuestion: () => string;
  testType: TestType;
  evaluationMethod: EvalMethod;
  selectedUnits: number[];
  selectedTopics: string[];
  subject: SubjectDetail;
}) {

  const presets = [
    { id: 'minor' as TimeMode, label: 'Minor Paper', sub: '90 min', mins: 90 },
    { id: 'major' as TimeMode, label: 'Major Paper', sub: '3 hours', mins: 180 },
    { id: 'custom' as TimeMode, label: 'Custom', sub: 'Set manually', mins: customMinutes },
  ];

  const clampCustom = (n: number) => Math.min(Math.max(10, n), 480);

  const coverageSummary =
    testType === 'syllabus'
      ? `Full Syllabus (${subject.syllabus.length} units)`
      : testType === 'unit'
      ? `Units: ${selectedUnits.join(', ')}`
      : `${selectedTopics.length} topic${selectedTopics.length !== 1 ? 's' : ''} selected`;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="font-display text-xl font-bold text-text-primary">Set your time limit</h2>
        <p className="text-xs text-text-secondary mt-1">Choose a duration for your {questionCount}-question exam</p>
      </div>

      {/* Preset cards */}
      <div className="grid grid-cols-3 gap-3">
        {presets.map(({ id, label, sub }) => (
          <button
            key={id}
            onClick={() => setTimeMode(id)}
            className={`py-4 px-3 rounded-2xl border text-center transition-all duration-200 ${
              timeMode === id
                ? 'border-accent/50 bg-accent/10 shadow-[0_0_16px_rgba(124,102,255,0.15)]'
                : 'border-border-primary bg-bg-secondary/60 hover:border-accent/30 hover:bg-bg-tertiary/60'
            }`}
          >
            <span className={`block text-xs font-bold ${timeMode === id ? 'text-accent' : 'text-text-primary'}`}>{label}</span>
            <span className={`block text-[10px] mt-0.5 ${timeMode === id ? 'text-accent/70' : 'text-text-muted'}`}>{sub}</span>
          </button>
        ))}
      </div>

      {/* Custom duration picker */}
      <AnimatePresence>
        {timeMode === 'custom' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-5 rounded-2xl border border-accent/20 bg-accent/5 space-y-4">
              <p className="text-xs font-bold text-accent uppercase tracking-wider">Custom Duration</p>

              {/* Stepper */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setCustomMinutes(clampCustom(customMinutes - 15))}
                  disabled={customMinutes <= 10}
                  className="w-10 h-10 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary flex items-center justify-center transition-all disabled:opacity-30"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="relative">
                  <input
                    type="number"
                    min={10}
                    max={480}
                    value={customMinutes}
                    onChange={(e) => { const n = parseInt(e.target.value, 10); if (!isNaN(n)) setCustomMinutes(clampCustom(n)); }}
                    className="w-24 h-14 text-center text-2xl font-black bg-bg-secondary border-2 border-accent/40 rounded-xl text-text-primary focus:outline-none focus:border-accent appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="absolute -bottom-5 left-0 right-0 text-center text-[9px] text-text-muted font-bold uppercase tracking-wider">Minutes</span>
                </div>
                <button
                  onClick={() => setCustomMinutes(clampCustom(customMinutes + 15))}
                  disabled={customMinutes >= 480}
                  className="w-10 h-10 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary flex items-center justify-center transition-all disabled:opacity-30"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Quick chips */}
              <div className="pt-5 flex flex-wrap justify-center gap-2">
                {QUICK_DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setCustomMinutes(d)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                      customMinutes === d
                        ? 'bg-accent border-accent text-white'
                        : 'bg-bg-secondary border-border-primary text-text-primary hover:border-accent/50'
                    }`}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live time/question metric */}
      <div className="p-4 rounded-2xl border border-accent/20 bg-gradient-to-r from-accent/5 to-transparent flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-grow">
          <p className="text-[10px] uppercase tracking-wider font-bold text-text-muted">Time Per Question</p>
          <p className="text-text-primary text-sm font-bold mt-0.5">
            {getDurationMinutes()} min ÷ {questionCount} questions ={' '}
            <span className="text-accent text-base font-black">{timePerQuestion()}</span>
            <span className="text-text-muted text-xs font-normal"> per question</span>
          </p>
        </div>
      </div>

      {/* Review summary */}
      <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/50 space-y-3">
        <p className="text-[10px] uppercase tracking-wider font-bold text-text-muted">Test Summary</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Coverage', value: coverageSummary },
            { label: 'Evaluation', value: evaluationMethod === 'photo' ? 'AI Vision Grading' : 'Self Evaluation' },
            { label: 'Questions', value: `${questionCount} questions` },
            { label: 'Duration', value: `${getDurationMinutes()} minutes` },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 rounded-xl bg-bg-primary/40 border border-border-primary/50">
              <p className="text-[9px] uppercase tracking-wider font-bold text-text-muted">{label}</p>
              <p className="text-xs font-bold text-text-primary mt-1 leading-tight">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
