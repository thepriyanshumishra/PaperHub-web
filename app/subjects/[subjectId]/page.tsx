'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/sidebar';
import { useAuth } from '@/components/auth-provider';
import { Navbar } from '@/components/navbar';
import {
  ChevronDown, ChevronRight, ChevronRight as Breadcrumb,
  BookOpen, Loader2, FileText, Sparkles, ArrowRight, Menu, X,
  Atom, Calculator, Zap, Cpu, Code, Globe, Database, FlaskConical, Leaf,
  MessageSquare, Wrench, Flame, Droplets, Building2, Brain, Network,
  BarChart2, Shield, Binary, Radio, Layers, GitBranch, PenLine,
  Microscope, Activity, Grid, Monitor,
} from 'lucide-react';

interface SyllabusUnit {
  unitNumber: number;
  unitTitle: string;
  topics: string[];
}

interface SubjectDetail {
  _id: string;
  name: string;
  code: string;
  syllabus: SyllabusUnit[];
}

// ─── Icon resolver (same logic as dashboard) ─────────────────────────────────
function getSubjectIcon(name: string, code: string = ''): React.ElementType {
  const n = name.toLowerCase();
  const c = code.toUpperCase();
  if (n.includes('math') || n.includes('calculus') || n.includes('algebra') || n.includes('statistics') || n.includes('numerical') || c.startsWith('MA') || c.startsWith('MATH') || c === 'M1' || c === 'M2' || c === 'M3' || c === 'M4') return Calculator;
  if (n.includes('physics') || n.includes('quantum') || n.includes('optics') || n.includes('engineering physics') || c.startsWith('PH') || c.startsWith('PHYS')) return Atom;
  if (n.includes('chemistry') || n.includes('chemical') || n.includes('green chemistry') || c.startsWith('CH') || c.startsWith('CHEM')) return FlaskConical;
  if (n.includes('environmental') || n.includes('ecology') || n.includes('sustainability') || c.startsWith('EV') || c.startsWith('EVS')) return Leaf;
  if (n.includes('electrical') || n.includes('circuit') || n.includes('power system') || n.includes('electromagnetic') || c.startsWith('EE') || c.startsWith('EEE') || c === 'BEE') return Zap;
  if (n.includes('digital') || n.includes('logic design') || n.includes('vlsi') || n.includes('boolean') || (c.startsWith('EC') && (n.includes('digital') || n.includes('logic')))) return Binary;
  if (n.includes('electronic') || n.includes('analog') || n.includes('amplifier') || n.includes('semiconductor') || c.startsWith('EC') || c.startsWith('ECE') || c === 'DEC') return Cpu;
  if (n.includes('microprocessor') || n.includes('microcontroller') || n.includes('embedded') || n.includes('computer architecture')) return Cpu;
  if (n.includes('communication') || n.includes('signal') || n.includes('wireless') || n.includes('antenna') || n.includes('modulation')) return Radio;
  if (n.includes('programming') || n.includes('python') || n.includes('java') || n.includes('c++') || n.includes('c program') || n.includes('object oriented') || c.startsWith('CS') || c.startsWith('CSE') || c === 'PPS') return Code;
  if (n.includes('web') || n.includes('internet') || n.includes('html') || n.includes('full stack')) return Globe;
  if (n.includes('data structure') || n.includes('algorithm') || n.includes('dsa') || c === 'DSA') return GitBranch;
  if (n.includes('database') || n.includes('dbms') || n.includes('sql') || c === 'DBMS') return Database;
  if (n.includes('network') || n.includes('tcp') || n.includes('routing') || c === 'CN') return Network;
  if (n.includes('artificial intelligence') || n.includes('machine learning') || n.includes('deep learning') || n.includes('neural') || n.includes('data science') || c === 'AI' || c === 'ML') return Brain;
  if (n.includes('operating system') || n.includes('linux') || n.includes('unix') || c === 'OS') return Layers;
  if (n.includes('security') || n.includes('cryptography') || n.includes('cyber') || n.includes('ethics') || n.includes('values') || c.startsWith('HS') || c.startsWith('HUM')) return Shield;
  if (n.includes('technical writing') || n.includes('communication skill') || n.includes('english') || n.includes('professional communication')) return MessageSquare;
  if (n.includes('drawing') || n.includes('engineering graphics') || n.includes('cad') || c === 'ED' || c === 'EG') return PenLine;
  if (n.includes('thermodynamics') || n.includes('heat transfer') || n.includes('thermal')) return Flame;
  if (n.includes('fluid') || n.includes('hydraulic') || n.includes('pneumatic')) return Droplets;
  if (n.includes('mechanic') || n.includes('manufacturing') || n.includes('machine design') || n.includes('workshop') || n.includes('kinematics') || c.startsWith('ME') || c.startsWith('MECH') || c === 'EME') return Wrench;
  if (n.includes('structure') || n.includes('civil') || n.includes('concrete') || n.includes('soil') || n.includes('construction') || c.startsWith('CE') || c.startsWith('CIVIL')) return Building2;
  if (n.includes('material') || n.includes('metallurgy') || n.includes('polymer')) return Layers;
  if (n.includes('economics') || n.includes('management') || n.includes('finance') || n.includes('entrepreneurship')) return BarChart2;
  if (n.includes('biotech') || n.includes('biology') || n.includes('biochemistry') || n.includes('microbiology')) return Microscope;
  if (n.includes('biomedical') || n.includes('instrumentation') || n.includes('control system') || n.includes('automation')) return Activity;
  return BookOpen;
}

// Ordinal helper
function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function SubjectPage() {
  const params = useParams();
  const router = useRouter();
  const { user, fbUser, loading: authLoading, logout } = useAuth();
  const subjectId = params.subjectId as string;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subject, setSubject] = useState<SubjectDetail | null>(null);
  const [questionCounts, setQuestionCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [solvedCount, setSolvedCount] = useState(0);

  const activeSemester = user?.profile?.semester || (typeof window !== 'undefined' ? Number(localStorage.getItem('selectedSemester') || 1) : 1);


  useEffect(() => {
    setLoading(true);
    fetch(`/api/subjects/${subjectId}`)
      .then(res => {
        if (!res.ok) throw new Error('not found');
        return res.json();
      })
      .then(data => {
        if (data.subject) setSubject(data.subject);
        else router.push('/dashboard');
      })
      .catch(() => router.push('/dashboard'))
      .finally(() => setLoading(false));
  }, [subjectId, router]);

  // Fetch user solved progress dynamically
  useEffect(() => {
    if (!fbUser) return;
    const fetchProgress = async () => {
      try {
        const idToken = await fbUser.getIdToken();
        const res = await fetch(`/api/subjects/${subjectId}/heatmap`, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.heatmap) {
            const totalCorrect = data.heatmap.reduce((sum: number, item: any) => sum + (item.correctCount || 0), 0);
            setSolvedCount(totalCorrect);
          }
        }
      } catch (err) {
        console.error('Failed to fetch subject progress:', err);
      }
    };
    fetchProgress();
  }, [fbUser, subjectId]);

  // Fetch per-unit question counts
  useEffect(() => {
    if (!subject) return;
    const fetchCounts = async () => {
      const counts: Record<number, number> = {};
      await Promise.all(
        subject.syllabus.map(async (unit) => {
          try {
            const res = await fetch(`/api/subjects/${subjectId}/questions?unit=${unit.unitNumber}&limit=1`);
            const data = await res.json();
            counts[unit.unitNumber] = data.total ?? 0;
          } catch {
            counts[unit.unitNumber] = 0;
          }
        })
      );
      setQuestionCounts(counts);
    };
    fetchCounts();
  }, [subject, subjectId]);

  const totalQuestions = Object.values(questionCounts).reduce((a, b) => a + b, 0);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!subject) return null;

  const SubjectIcon = getSubjectIcon(subject.name, subject.code);

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary overflow-hidden relative">
      {/* Ambient glow — dark mode only */}
      <div className="hidden dark:block fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-purple-900/8 blur-[160px] pointer-events-none" />

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main column */}
      <div className="flex flex-col flex-grow min-w-0 h-screen overflow-hidden">

        {/* ── Top Header ── */}
        <Navbar onMenuToggle={() => setSidebarOpen(true)} />

        {/* ── Scrollable Body ── */}
        <div className="flex-grow overflow-y-auto">
          <main className="max-w-4xl w-full mx-auto px-6 py-8 space-y-6">

            {/* ── Hero Card ── */}
            <div className="rounded-2xl border border-border-primary bg-bg-secondary p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Left: icon + info */}
              <div className="flex items-center gap-5 flex-grow">
                <div className="w-20 h-20 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                  <SubjectIcon className="w-10 h-10 text-accent" />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-display font-black text-2xl text-text-primary leading-none">{subject.name}</h1>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-accent/10 border border-accent/20 text-accent px-2.5 py-1 rounded-full">
                      {activeSemester ? `Semester ${activeSemester}` : subject.code}
                      <ChevronDown className="w-3 h-3" />
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed max-w-md">
                    Explore chapters and practice previous year questions topic-wise and chapter-wise.
                  </p>
                </div>
              </div>

              {/* Right: overall progress */}
              {(() => {
                const progressPercent = totalQuestions > 0 ? Math.round((solvedCount / totalQuestions) * 100) : 0;
                return (
                  <div className="shrink-0 flex items-center gap-5 p-5 rounded-xl border border-border-primary bg-bg-primary min-w-[240px]">
                    {/* Circular progress */}
                    <div className="relative w-16 h-16 shrink-0">
                      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="5" className="text-border-primary" />
                        <circle
                          cx="32" cy="32" r="26" fill="none" strokeWidth="5"
                          stroke="var(--accent)"
                          strokeDasharray={`${2 * Math.PI * 26}`}
                          strokeDashoffset={`${2 * Math.PI * 26 * (1 - (progressPercent / 100))}`}
                          strokeLinecap="round" className="transition-all duration-500"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center font-display font-black text-sm text-text-primary">
                        {progressPercent}%
                      </span>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-bold text-text-primary">Overall Progress</p>
                      <p className="text-[11px] text-text-secondary">{solvedCount} of {totalQuestions} Solved</p>
                      <div className="w-full h-1.5 bg-bg-tertiary rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
                  </div>
                );
              })()}
            </div>

            {/* ── Chapter List ── */}
            <div className="space-y-3">
              <h2 className="font-display font-black text-base text-text-primary">
                {subject.code} Chapters
              </h2>

              <div className="space-y-3">
                {subject.syllabus.map((unit) => {
                  const qCount = questionCounts[unit.unitNumber] ?? '—';
                  return (
                    <div
                      key={unit.unitNumber}
                      className="flex items-center gap-5 p-5 rounded-2xl border border-border-primary bg-bg-secondary hover:border-accent/30 hover:bg-bg-secondary transition-all group"
                    >
                      {/* Number badge */}
                      <div className="w-10 h-10 rounded-xl bg-bg-tertiary border border-border-primary flex items-center justify-center font-display font-black text-base text-text-primary shrink-0">
                        {unit.unitNumber}
                      </div>

                      {/* Info */}
                      <div className="flex-grow min-w-0">
                        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wide">Unit {unit.unitNumber}</p>
                        <h3 className="font-display font-black text-sm text-text-primary group-hover:text-accent transition-colors leading-snug">
                          {unit.unitTitle}
                        </h3>
                      </div>

                      {/* Q count */}
                      <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-text-secondary shrink-0">
                        <FileText className="w-4 h-4 text-text-muted" />
                        <span>{typeof qCount === 'number' ? `${qCount} Questions` : '— Questions'}</span>
                      </div>

                      {/* CTA */}
                      <Link
                        href={`/subjects/${subjectId}/chapters/${unit.unitNumber}`}
                        className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all shadow-sm"
                      >
                        Start Practicing
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  );
                })}
              </div>

              {/* Tip row */}
              <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-border-primary bg-bg-secondary/50">
                <Sparkles className="w-4 h-4 text-accent shrink-0" />
                <p className="text-[11px] text-text-secondary">
                  Each unit contains topic-wise and year-wise PYQs with detailed solutions.
                </p>
              </div>
            </div>

          </main>
        </div>
      </div>
    </div>
  );
}
