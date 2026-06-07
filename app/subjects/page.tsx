'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/sidebar';
import { useAuth } from '@/components/auth-provider';
import { Navbar } from '@/components/navbar';
import {
  ChevronRight,
  BookOpen, Loader2, ArrowRight, Menu, X,
  Atom, Calculator, Zap, Cpu, Code, Globe, Database, FlaskConical, Leaf,
  MessageSquare, Wrench, Flame, Droplets, Building2, Brain, Network,
  BarChart2, Shield, Binary, Radio, Layers, GitBranch, PenLine,
  Microscope, Activity, Grid, Monitor,
} from 'lucide-react';

interface Subject {
  _id: string;
  name: string;
  code: string;
  syllabus: {
    unitNumber: number;
    unitTitle: string;
    topics: string[];
  }[];
}

// ─── Icon resolver (same logic as dashboard/details) ─────────────────────────
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

// ─── Card Styles Resolver (same as dashboard) ────────────────────────────────
function getSubjectCardStyles(name: string, code: string) {
  const n = name.toLowerCase();
  const c = code.toUpperCase();

  if (n.includes('math') || n.includes('calculus') || n.includes('algebra') || n.includes('statistics') || n.includes('numerical') || c.startsWith('MA') || c.startsWith('MATH') || c === 'M1' || c === 'M2' || c === 'M3' || c === 'M4')
    return { colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20', arrowColor: 'border-blue-400/40 text-blue-400 hover:bg-blue-400/10' };
  if (n.includes('physics') || n.includes('quantum') || n.includes('optics') || n.includes('engineering physics') || c.startsWith('PH') || c.startsWith('PHYS'))
    return { colorClass: 'text-violet-400 bg-violet-500/10 border-violet-500/20', arrowColor: 'border-violet-400/40 text-violet-400 hover:bg-violet-400/10' };
  if (n.includes('chemistry') || n.includes('chemical') || n.includes('green chemistry') || c.startsWith('CH') || c.startsWith('CHEM'))
    return { colorClass: 'text-teal-400 bg-teal-500/10 border-teal-500/20', arrowColor: 'border-teal-400/40 text-teal-400 hover:bg-teal-400/10' };
  if (n.includes('environmental') || n.includes('ecology') || n.includes('sustainability') || c.startsWith('EV') || c.startsWith('EVS'))
    return { colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', arrowColor: 'border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10' };
  if (n.includes('electrical') || n.includes('circuit') || n.includes('power system') || n.includes('electromagnetic') || c.startsWith('EE') || c.startsWith('EEE') || c === 'BEE')
    return { colorClass: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', arrowColor: 'border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/10' };
  if (n.includes('digital') || n.includes('logic design') || n.includes('vlsi') || n.includes('boolean') || (c.startsWith('EC') && (n.includes('digital') || n.includes('logic'))))
    return { colorClass: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', arrowColor: 'border-indigo-400/40 text-indigo-400 hover:bg-indigo-400/10' };
  if (n.includes('electronic') || n.includes('analog') || n.includes('amplifier') || n.includes('semiconductor') || c.startsWith('EC') || c.startsWith('ECE') || c === 'DEC')
    return { colorClass: 'text-sky-400 bg-sky-500/10 border-sky-500/20', arrowColor: 'border-sky-400/40 text-sky-400 hover:bg-sky-400/10' };
  if (n.includes('programming') || n.includes('python') || n.includes('java') || n.includes('c++') || n.includes('c program') || n.includes('object oriented') || c.startsWith('CS') || c.startsWith('CSE') || c === 'PPS')
    return { colorClass: 'text-orange-400 bg-orange-500/10 border-orange-500/20', arrowColor: 'border-orange-400/40 text-orange-400 hover:bg-orange-400/10' };
  if (n.includes('web') || n.includes('internet') || n.includes('html') || n.includes('full stack'))
    return { colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20', arrowColor: 'border-blue-400/40 text-blue-400 hover:bg-blue-400/10' };
  if (n.includes('data structure') || n.includes('algorithm') || n.includes('dsa') || c === 'DSA')
    return { colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20', arrowColor: 'border-amber-400/40 text-amber-400 hover:bg-amber-400/10' };
  if (n.includes('database') || n.includes('dbms') || n.includes('sql') || c === 'DBMS')
    return { colorClass: 'text-lime-400 bg-lime-500/10 border-lime-500/20', arrowColor: 'border-lime-400/40 text-lime-400 hover:bg-lime-400/10' };
  if (n.includes('network') || n.includes('routing') || c === 'CN')
    return { colorClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', arrowColor: 'border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10' };
  if (n.includes('artificial intelligence') || n.includes('machine learning') || c === 'AI' || c === 'ML')
    return { colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20', arrowColor: 'border-purple-400/40 text-purple-400 hover:bg-purple-400/10' };
  if (n.includes('mechanic') || n.includes('manufacturing') || c.startsWith('ME') || c.startsWith('MECH') || c === 'EME')
    return { colorClass: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20', arrowColor: 'border-zinc-400/40 text-zinc-400 hover:bg-zinc-400/10' };
  if (n.includes('structure') || n.includes('civil') || c.startsWith('CE') || c.startsWith('CIVIL'))
    return { colorClass: 'text-stone-400 bg-stone-500/10 border-stone-500/20', arrowColor: 'border-stone-400/40 text-stone-400 hover:bg-stone-400/10' };
  
  return { colorClass: 'text-neutral-400 bg-neutral-500/10 border-neutral-500/20', arrowColor: 'border-neutral-400/40 text-neutral-400 hover:bg-neutral-400/10' };
}

// Ordinal helper
function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function SubjectsPage() {
  const router = useRouter();
  const { user, fbUser, loading: authLoading } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth check redirect
  useEffect(() => {
    if (!authLoading && !fbUser) {
      router.push('/login');
    }
  }, [fbUser, authLoading, router]);

  // Fetch subjects
  useEffect(() => {
    if (authLoading) return;
    
    const college = user?.profile?.college || (typeof window !== 'undefined' ? localStorage.getItem('selectedCollege') : '') || '';
    const branch = user?.profile?.branch || (typeof window !== 'undefined' ? localStorage.getItem('selectedBranch') : '') || '';
    const semester = user?.profile?.semester || (typeof window !== 'undefined' ? Number(localStorage.getItem('selectedSemester') || 1) : 1);

    if (college && branch) {
      setLoading(true);
      fetch(`/api/subjects?collegeCode=${college}&branchCode=${branch}&semester=${semester}`)
        .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
        .then((data) => setSubjects(data.subjects || []))
        .catch(() => setSubjects([]))
        .finally(() => setLoading(false));
    } else {
      setSubjects([]);
      setLoading(false);
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

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
          <main className="max-w-5xl w-full mx-auto px-6 py-8 space-y-6">

            <div className="text-left space-y-1">
              <h1 className="font-display font-black text-2xl text-text-primary tracking-tight">Select Your Subject</h1>
              <p className="text-xs text-text-secondary">Choose a subject to continue your preparation</p>
            </div>

            {subjects.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-border-primary rounded-2xl bg-bg-secondary/40">
                <BookOpen className="w-10 h-10 text-text-muted mx-auto mb-3" />
                <p className="text-sm font-bold text-text-secondary">No subjects found</p>
                <p className="text-xs text-text-muted mt-1">Please complete or update your sessional onboarding settings.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {subjects.map((sub) => {
                  const styles = getSubjectCardStyles(sub.name, sub.code);
                  const Icon = getSubjectIcon(sub.name, sub.code);
                  const chaptersCount = sub.syllabus ? sub.syllabus.length : 0;

                  return (
                    <div
                      key={sub._id}
                      onClick={() => router.push(`/subjects/${sub._id}`)}
                      className="p-5 rounded-2xl bg-bg-secondary border border-border-primary hover:border-accent/40 flex flex-col justify-between items-start h-40 group transition-all cursor-pointer shadow-sm"
                    >
                      <div className={`p-2.5 rounded-xl ${styles.colorClass} flex items-center justify-center shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      <div className="space-y-1 text-left w-full mt-4">
                        <h4 className="font-display font-black text-sm text-text-primary leading-tight truncate group-hover:text-accent transition-colors">
                          {sub.name}
                        </h4>
                        <p className="text-[10px] text-text-muted font-bold leading-none">
                          {chaptersCount} {chaptersCount === 1 ? 'Unit' : 'Units'} · {sub.code}
                        </p>
                      </div>

                      <div className="w-full flex justify-end mt-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${styles.arrowColor}`}>
                          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
