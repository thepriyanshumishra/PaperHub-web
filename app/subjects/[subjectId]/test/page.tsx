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
      router.push(`/subjects/${subjectId}/test/solve?type=${testType}&duration=${minutes}&count=${count}`);
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
          router.push(`/subjects/${subjectId}/test/solve?type=${testType}&duration=${minutes}&count=${count}`);
        }
      } catch {
        router.push(`/subjects/${subjectId}/test/solve?type=${testType}&duration=${minutes}&count=${count}`);
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
      <main className="flex-grow max-w-4xl w-full mx-auto px-6 py-12">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-accent mb-2 block">Exam Arena</span>
            <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary">
              Exam Simulation Setup
            </h1>
          </div>
          
          <button
            onClick={startTest}
            className="px-6 py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent-hover transition-colors shadow-sm flex items-center justify-center space-x-2 self-start md:self-auto"
          >
            <Clock className="w-4 h-4" />
            <span>Start Test Session</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Card 1: Choose Test Type */}
          <div className="p-6 rounded-xl border border-border-primary bg-bg-secondary space-y-4">
            <h3 className="font-display font-semibold text-text-primary flex items-center space-x-2">
              <Award className="w-4 h-4 text-accent" />
              <span>Test Coverage</span>
            </h3>
            
            <div className="grid grid-cols-1 gap-2">
              {([
                { id: 'syllabus', title: 'Full Syllabus Test', desc: '10 questions from all units' },
                { id: 'unit', title: 'Unit-Wise Test', desc: '5 questions from a single unit' },
                { id: 'topic', title: 'Topic-Wise Test', desc: '3 questions from a specific topic' }
              ] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTestType(t.id)}
                  className={`p-4 rounded-lg border text-left transition-all duration-150 ${
                    testType === t.id 
                      ? 'border-accent bg-accent/5' 
                      : 'border-border-primary bg-bg-primary hover:bg-bg-tertiary'
                  }`}
                >
                  <h4 className={`text-xs font-bold ${testType === t.id ? 'text-accent' : 'text-text-primary'}`}>{t.title}</h4>
                  <p className="text-[10px] text-text-secondary mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Card 2: Choose Time Mode */}
          <div className="p-6 rounded-xl border border-border-primary bg-bg-secondary space-y-4">
            <h3 className="font-display font-semibold text-text-primary flex items-center space-x-2">
              <Clock className="w-4 h-4 text-accent" />
              <span>Time Pattern</span>
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'minor', label: 'Minor', sub: '1.5 hrs' },
                { id: 'major', label: 'Major', sub: '3.0 hrs' },
                { id: 'custom', label: 'Custom', sub: 'Manual' }
              ] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTimeMode(t.id)}
                  className={`py-3 rounded-lg border text-center transition-all duration-150 ${
                    timeMode === t.id 
                      ? 'border-accent bg-accent/5 text-accent' 
                      : 'border-border-primary bg-bg-primary hover:bg-bg-tertiary'
                  }`}
                >
                  <span className="block text-xs font-bold">{t.label}</span>
                  <span className="block text-[8px] uppercase tracking-wide opacity-80 mt-0.5">{t.sub}</span>
                </button>
              ))}
            </div>

            {/* Custom Input */}
            {timeMode === 'custom' && (
              <div className="flex items-center space-x-2 p-3 bg-bg-primary border border-border-primary rounded-lg">
                <div className="flex-grow">
                  <label className="text-[9px] uppercase font-bold text-text-secondary block mb-1">Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="6"
                    value={customHours}
                    onChange={(e) => setCustomHours(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-bg-secondary border border-border-primary rounded px-2 py-1 text-xs"
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
                    className="w-full bg-bg-secondary border border-border-primary rounded px-2 py-1 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Dynamic Feedback */}
            <div className="p-3 bg-bg-primary border border-border-primary border-dashed rounded-lg text-[10px] leading-relaxed text-text-secondary space-y-1">
              <p>⏰ Total Duration: **{getDurationMinutes()} minutes**</p>
              <p>📝 Questions Count: **{getQuestionsCount()} questions**</p>
              <p>⚡ Pacing Guideline: **~{Math.round(getDurationMinutes() / getQuestionsCount())} minutes** per question.</p>
            </div>
          </div>
        </div>

        {/* Security / Anti-Cheat Notice */}
        <div className="mt-8 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 max-w-xl mx-auto flex items-start space-x-3 text-xs leading-relaxed text-text-secondary">
          <ShieldAlert className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-text-primary mb-0.5">Integrity Guard Monitoring Enabled</h4>
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
