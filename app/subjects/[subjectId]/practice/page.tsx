'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { seedColleges } from '@/lib/seedData';
import { ArrowLeft, Book, Sliders, ChevronRight, Loader2 } from 'lucide-react';

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

export default function PracticeSelection() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.subjectId as string;

  const [subject, setSubject] = useState<SubjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);

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
          else router.push('/dashboard');
        })
        .catch(() => router.push('/dashboard'))
        .finally(() => setLoading(false));
    }
  }, [subjectId, router]);

  const startFullSyllabusPractice = async () => {
    const isLocalFallback = localStorage.getItem('useLocalFallback') === 'true';
    if (isLocalFallback) {
      router.push(`/subjects/${subjectId}/practice/solve?type=syllabus&units=all`);
    } else {
      try {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: localStorage.getItem('anonymousUserId') || 'guest',
            subjectId,
            type: 'practice',
            subType: 'syllabus',
            config: {
              units: subject ? subject.syllabus.map((u) => u.unitNumber) : [],
              topics: [],
              questionCount: 5
            }
          })
        });
        const data = await res.json();
        if (data.session) {
          router.push(`/subjects/${subjectId}/practice/solve?sessionId=${data.session._id}`);
        } else {
          router.push(`/subjects/${subjectId}/practice/solve?type=syllabus&units=all`);
        }
      } catch {
        router.push(`/subjects/${subjectId}/practice/solve?type=syllabus&units=all`);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
          <p className="text-xs text-text-secondary">Loading options...</p>
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
              <span className="text-text-primary font-bold">Practice</span>
            </nav>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Mode Selectors */}
      <main className="flex-grow max-w-4xl w-full mx-auto px-6 py-12 relative overflow-hidden">
        {/* Subtle glowing space background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-accent/5 rounded-full blur-[120px] pointer-events-none dark:block hidden"></div>

        <div className="mb-10 text-center md:text-left z-10 relative">
          <span className="text-xs font-bold uppercase tracking-wider text-accent mb-2 block">Choose Mode</span>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-text-primary">
            How would you like to practice?
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto z-10 relative">
          {/* Option 1: Full Syllabus */}
          <button
            onClick={startFullSyllabusPractice}
            className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm text-left hover:border-accent/40 hover:shadow-[0_0_25px_rgba(124,102,255,0.15)] hover:bg-bg-secondary hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-48 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-accent/5 to-transparent rounded-bl-full pointer-events-none group-hover:from-accent/12 transition-all duration-300"></div>

            <div className="w-12 h-12 rounded-xl bg-accent/5 border border-accent/15 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all duration-300 shadow-inner">
              <Book className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-text-primary group-hover:text-accent flex items-center transition-colors duration-200 mb-1">
                <span>Full Syllabus Set</span>
                <ChevronRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-text-secondary">
                Generate a fast 5-question mock paper compiled across all syllabus units.
              </p>
            </div>
          </button>

          {/* Option 2: Custom Builder */}
          <Link
            href={`/subjects/${subjectId}/practice/custom`}
            className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm text-left hover:border-accent/40 hover:shadow-[0_0_25px_rgba(124,102,255,0.15)] hover:bg-bg-secondary hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-48 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-accent/5 to-transparent rounded-bl-full pointer-events-none group-hover:from-accent/12 transition-all duration-300"></div>

            <div className="w-12 h-12 rounded-xl bg-accent/5 border border-accent/15 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all duration-300 shadow-inner">
              <Sliders className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-text-primary group-hover:text-accent flex items-center transition-colors duration-200 mb-1">
                <span>Custom Practice Builder</span>
                <ChevronRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-text-secondary">
                Manually select specific units, filter target topics, and customize your question count.
              </p>
            </div>
          </Link>
        </div>
      </main>

      <footer className="border-t border-border-primary/50 bg-bg-secondary/20 py-6 text-center text-xs text-text-secondary">
        <p>Choose practice style to load the dynamic exam preparation interface.</p>
      </footer>
    </div>
  );
}
