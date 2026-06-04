'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { seedColleges } from '@/lib/seedData';
import { ArrowLeft, Clock, Award, ShieldAlert, Loader2 } from 'lucide-react';

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

export default function TestSelection() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.subjectId as string;

  const [subject, setSubject] = useState<SubjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);

  // Selection states
  const [testType, setTestType] = useState<'topic' | 'unit' | 'syllabus' | 'custom'>('syllabus');
  const [timeMode, setTimeMode] = useState<'major' | 'minor' | 'custom'>('minor');
  const [customHours, setCustomHours] = useState(1);
  const [customMinutes, setCustomMinutes] = useState(30);
  const [evaluationMethod, setEvaluationMethod] = useState<'self' | 'photo'>('self');

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
      if (sub) {
        setSubject({ _id: subjectId, name: sub.name, code: sub.code, syllabus: sub.syllabus });
      }
      setLoading(false);
    } else {
      fetch(`/api/subjects/${subjectId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.subject) setSubject(data.subject);
          else router.push('/onboarding');
        })
        .catch(() => router.push('/onboarding'))
        .finally(() => setLoading(false));
    }
  }, [subjectId, router]);

  // Calculate dynamic feedback
  const getDurationMinutes = () => {
    if (timeMode === 'major') return 180;
    if (timeMode === 'minor') return 90;
    return customHours * 60 + customMinutes;
  };

  const getQuestionsCount = () => {
    if (testType === 'syllabus') return 10;
    if (testType === 'unit') return 5;
    return 3;
  };

  const startTest = async () => {
    const minutes = getDurationMinutes();
    const count = getQuestionsCount();
    
    const isLocalFallback = localStorage.getItem('useLocalFallback') === 'true';

    if (isLocalFallback) {
      router.push(`/subjects/${subjectId}/test/solve?type=${testType}&duration=${minutes}&count=${count}&evaluationMethod=${evaluationMethod}`);
    } else {
      try {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: localStorage.getItem('anonymousUserId') || 'guest',
            subjectId,
            type: 'test',
            subType: testType,
            evaluationMethod,
            config: {
              units: subject ? subject.syllabus.map((u) => u.unitNumber) : [],
              topics: [],
              questionCount: count
            }
          })
        });
        const data = await res.json();
        if (data.session) {
          router.push(`/subjects/${subjectId}/test/solve?sessionId=${data.session._id}&duration=${minutes}`);
        } else {
          router.push(`/subjects/${subjectId}/test/solve?type=${testType}&duration=${minutes}&count=${count}&evaluationMethod=${evaluationMethod}`);
        }
      } catch {
        router.push(`/subjects/${subjectId}/test/solve?type=${testType}&duration=${minutes}&count=${count}&evaluationMethod=${evaluationMethod}`);
      }
    }
  };

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
    <div className="min-h-screen flex flex-col justify-between transition-colors duration-300">
      {/* Top Navbar */}
      <header className="border-b border-border-primary/50 bg-bg-primary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href={`/subjects/${subjectId}`} 
              className="p-2 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <nav className="flex items-center space-x-1.5 text-xs text-text-secondary font-medium overflow-x-auto">
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

      {/* Main Configurations */}
      <main className="flex-grow max-w-4xl w-full mx-auto px-6 py-12 relative overflow-hidden">
        {/* Subtle glowing space background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-accent/5 rounded-full blur-[120px] pointer-events-none dark:block hidden"></div>

        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 z-10 relative">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-accent mb-2 block">Exam Arena</span>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-text-primary">
              Exam Simulation Setup
            </h1>
          </div>
          
          <button
            onClick={startTest}
            className="px-6 py-3 rounded-xl bg-accent text-white font-semibold hover:bg-accent-hover transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2 self-start md:self-auto hover:-translate-y-0.5"
          >
            <Clock className="w-4 h-4" />
            <span>Start Test Session</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto z-10 relative">
          {/* Card 1: Choose Test Type */}
          <div className="p-8 rounded-2xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm shadow-[0_0_30px_rgba(0,0,0,0.25)] space-y-5">
            <h3 className="font-display font-bold text-text-primary flex items-center space-x-2.5">
              <Award className="w-5 h-5 text-accent" />
              <span>Test Coverage</span>
            </h3>
            
            <div className="grid grid-cols-1 gap-2.5">
              {([
                { id: 'syllabus', title: 'Full Syllabus Test', desc: '10 questions from all units' },
                { id: 'unit', title: 'Unit-Wise Test', desc: '5 questions from a single unit' },
                { id: 'topic', title: 'Topic-Wise Test', desc: '3 questions from a specific topic' }
              ] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTestType(t.id)}
                  className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                    testType === t.id 
                      ? 'border-accent/40 bg-accent/10 shadow-[0_0_12px_rgba(124,102,255,0.15)]' 
                      : 'border-border-primary bg-bg-primary/50 hover:bg-bg-tertiary hover:border-accent/20'
                  }`}
                >
                  <h4 className={`text-xs font-extrabold ${testType === t.id ? 'text-accent' : 'text-text-primary'}`}>{t.title}</h4>
                  <p className="text-[10px] text-text-secondary mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Card 2: Choose Time Mode */}
          <div className="p-8 rounded-2xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm shadow-[0_0_30px_rgba(0,0,0,0.25)] space-y-5">
            <h3 className="font-display font-bold text-text-primary flex items-center space-x-2.5">
              <Clock className="w-5 h-5 text-accent" />
              <span>Time Pattern</span>
            </h3>

            <div className="grid grid-cols-3 gap-2.5">
              {([
                { id: 'minor', label: 'Minor', sub: '1.5 hrs' },
                { id: 'major', label: 'Major', sub: '3.0 hrs' },
                { id: 'custom', label: 'Custom', sub: 'Manual' }
              ] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTimeMode(t.id)}
                  className={`py-3 rounded-xl border text-center transition-all duration-200 ${
                    timeMode === t.id 
                      ? 'border-accent/40 bg-accent/10 text-accent font-semibold shadow-[0_0_12px_rgba(124,102,255,0.15)]' 
                      : 'border-border-primary bg-bg-primary/50 hover:bg-bg-tertiary hover:border-accent/20'
                  }`}
                >
                  <span className="block text-xs font-extrabold">{t.label}</span>
                  <span className="block text-[8px] uppercase tracking-wider opacity-80 mt-0.5">{t.sub}</span>
                </button>
              ))}
            </div>

            {/* Custom Input */}
            {timeMode === 'custom' && (
              <div className="flex items-center space-x-2.5 p-4 bg-bg-primary/50 border border-border-primary rounded-xl">
                <div className="flex-grow">
                  <label className="text-[9px] uppercase font-bold text-text-secondary block mb-1">Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="6"
                    value={customHours}
                    onChange={(e) => setCustomHours(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-bg-secondary border border-border-primary rounded px-2.5 py-1 text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="flex-grow">
                  <label className="text-[9px] uppercase font-bold text-text-secondary block mb-1">Minutes</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    className="w-full bg-bg-secondary border border-border-primary rounded px-2.5 py-1 text-xs text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            )}

            {/* Dynamic Feedback */}
            <div className="p-4 bg-bg-primary/50 border border-border-primary border-dashed rounded-xl text-[10px] leading-relaxed text-text-secondary space-y-1.5 shadow-inner">
              <p>⏰ Total Duration: <strong className="text-text-primary font-extrabold">{getDurationMinutes()} minutes</strong></p>
              <p>📝 Questions Count: <strong className="text-text-primary font-extrabold">{getQuestionsCount()} questions</strong></p>
              <p>⚡ Pacing Guideline: <strong className="text-accent font-bold">~{Math.round(getDurationMinutes() / getQuestionsCount())} minutes</strong> per question.</p>
            </div>
          </div>

          {/* Card 3: Choose Evaluation Mode */}
          <div className="p-8 rounded-2xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm shadow-[0_0_30px_rgba(0,0,0,0.25)] space-y-5">
            <h3 className="font-display font-bold text-text-primary flex items-center space-x-2.5">
              <Award className="w-5 h-5 text-accent" />
              <span>Grading Scheme</span>
            </h3>
            
            <div className="grid grid-cols-1 gap-2.5">
              {([
                { id: 'self', title: 'Self-Evaluation', desc: 'Grade yourself against model answers during test' },
                { id: 'photo', title: 'AI Answer Sheet Grading', desc: 'Solve on paper, snap/upload photos for AI vision review' }
              ] as const).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setEvaluationMethod(t.id)}
                  className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                    evaluationMethod === t.id 
                      ? 'border-accent/40 bg-accent/10 shadow-[0_0_12px_rgba(124,102,255,0.15)]' 
                      : 'border-border-primary bg-bg-primary/50 hover:bg-bg-tertiary hover:border-accent/20'
                  }`}
                >
                  <h4 className={`text-xs font-extrabold ${evaluationMethod === t.id ? 'text-accent' : 'text-text-primary'}`}>{t.title}</h4>
                  <p className="text-[10px] text-text-secondary mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Security / Anti-Cheat Notice */}
        <div className="mt-8 p-5 rounded-2xl border border-amber-500/25 bg-amber-500/5 backdrop-blur-sm max-w-xl mx-auto flex items-start space-x-3 text-xs leading-relaxed text-text-secondary shadow-[0_0_20px_rgba(245,158,11,0.06)] z-10 relative">
          <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-extrabold text-text-primary mb-0.5">Integrity Guard Monitoring Enabled</h4>
            <p>
              The exam solver records focus interruptions, browser tab changes, and fullscreen escapes. These analytics are logged for review on your final summary panel.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-border-primary/50 bg-bg-secondary/20 py-6 text-center text-xs text-text-secondary">
        <p>Ensure a stable environment before launching the timed test module.</p>
      </footer>
    </div>
  );
}
