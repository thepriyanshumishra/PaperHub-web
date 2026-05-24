'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { seedColleges } from '@/lib/seedData';
import { 
  ArrowLeft, 
  Play, 
  FileText, 
  Sparkles,
  BookOpen,
  ChevronRight,
  TrendingUp,
  Loader2
} from 'lucide-react';

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

export default function SubjectDashboard() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.subjectId as string;

  const [subject, setSubject] = useState<SubjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);

  useEffect(() => {
    // Load onboarding context from localStorage
    const college = localStorage.getItem('selectedCollege') || 'MMMUT';
    const branch = localStorage.getItem('selectedBranch') || 'CSE';
    const semester = localStorage.getItem('selectedSemester') || '1';
    
    setBreadcrumbs([college, branch, `Sem ${semester}`]);

    const isLocalFallback = localStorage.getItem('useLocalFallback') === 'true';

    if (isLocalFallback || subjectId.startsWith('mock-')) {
      // Load fallback mock subject
      const subjectCode = subjectId.replace('mock-', '');
      const col = seedColleges.find((c) => c.code === college);
      const br = col?.branches.find((b) => b.code === branch);
      const sub = br?.subjects.find((s) => s.code === subjectCode);
      
      if (sub) {
        setSubject({
          _id: subjectId,
          name: sub.name,
          code: sub.code,
          syllabus: sub.syllabus
        });
      }
      setLoading(false);
    } else {
      // Fetch subject details from API
      fetch(`/api/subjects/${subjectId}`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch');
          return res.json();
        })
        .then((data) => {
          if (data.subject) {
            setSubject(data.subject);
          } else {
            // Fallback if not found
            router.push('/onboarding');
          }
        })
        .catch(() => {
          // Attempt fallback search by code if subjectId resembles one
          const col = seedColleges.find((c) => c.code === college);
          const br = col?.branches.find((b) => b.code === branch);
          const sub = br?.subjects.find((s) => s.code === subjectId || `mock-${s.code}` === subjectId);
          if (sub) {
            setSubject({
              _id: subjectId,
              name: sub.name,
              code: sub.code,
              syllabus: sub.syllabus
            });
          } else {
            router.push('/onboarding');
          }
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [subjectId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
          <p className="text-xs text-text-secondary">Loading subject dashboard...</p>
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
              href="/onboarding" 
              className="p-2 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary transition-colors"
              aria-label="Back to onboarding"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            {/* Breadcrumb Trail */}
            <nav className="flex items-center space-x-1.5 text-xs text-text-secondary font-medium overflow-x-auto whitespace-nowrap">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <span>{crumb}</span>
                  <span className="text-text-muted">/</span>
                </React.Fragment>
              ))}
              <span className="text-text-primary font-bold">{subject.code}</span>
            </nav>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Subject Dashboard */}
      <main className="flex-grow max-w-4xl w-full mx-auto px-6 py-12">
        <div className="mb-10">
          <span className="text-xs font-semibold uppercase tracking-wider text-accent mb-2 block">{subject.code}</span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-text-primary mb-3">
            {subject.name}
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
            Prepare for your written university examinations with structured question sets mapped directly to the {subject.name} syllabus.
          </p>
        </div>

        {/* Mode Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Practice Mode Card */}
          <Link
            href={`/subjects/${subjectId}/practice`}
            className="p-6 rounded-2xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-left hover:border-accent/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between h-52 group"
          >
            <div className="w-10 h-10 rounded-xl bg-accent/5 border border-accent/15 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-colors duration-200">
              <Play className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg mb-1 flex items-center">
                <span>Practice Mode</span>
                <ChevronRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Study step-by-step. Browse syllabus questions, view academic university-style answers, and clarify doubts using Ask AI.
              </p>
            </div>
          </Link>

          {/* Test Mode Card */}
          <Link
            href={`/subjects/${subjectId}/test`}
            className="p-6 rounded-2xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-left hover:border-accent/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between h-52 group"
          >
            <div className="w-10 h-10 rounded-xl bg-accent/5 border border-accent/15 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-colors duration-200">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg mb-1 flex items-center">
                <span>Test Mode</span>
                <ChevronRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Simulate a real written exam under time pressure. Focused fullscreen environment, anti-cheat detection, and summary analytics.
              </p>
            </div>
          </Link>

          {/* Important Questions (Soon) */}
          <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 text-left opacity-60 flex flex-col justify-between h-52 cursor-not-allowed">
            <div className="w-10 h-10 rounded-xl bg-border-primary flex items-center justify-center text-text-muted">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-display font-semibold text-lg">Important Questions</h3>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-border-primary text-text-secondary font-medium">SOON</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                A customized selection of recurring questions showing highest exam repetition frequencies.
              </p>
            </div>
          </div>

          {/* Night Before Exam (Soon) */}
          <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 text-left opacity-60 flex flex-col justify-between h-52 cursor-not-allowed">
            <div className="w-10 h-10 rounded-xl bg-border-primary flex items-center justify-center text-text-muted">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-display font-semibold text-lg">Night Before Exam</h3>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-border-primary text-text-secondary font-medium">SOON</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Hyper-focused final revision set. Check the absolute must-know topics in the last 12 hours.
              </p>
            </div>
          </div>
        </div>

        {/* Syllabus Overview Drawer/Accordion */}
        <div className="rounded-xl border border-border-primary bg-bg-secondary p-6">
          <h3 className="font-display font-semibold text-text-primary mb-4 flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-accent" />
            <span>Syllabus Mapping ({subject.syllabus?.length || 0} Units)</span>
          </h3>
          <div className="space-y-4">
            {subject.syllabus?.map((unit) => (
              <div key={unit.unitNumber} className="border-b border-border-primary/50 last:border-0 pb-3 last:pb-0">
                <h4 className="text-xs font-bold text-text-primary mb-1">
                  Unit {unit.unitNumber}: {unit.unitTitle}
                </h4>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {unit.topics.map((topic: string, tIdx: number) => (
                    <span 
                      key={tIdx} 
                      className="text-[10px] px-2 py-0.5 rounded bg-bg-primary border border-border-primary text-text-secondary hover:text-accent hover:border-accent/20 cursor-default transition-colors duration-150"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-primary/50 bg-bg-secondary/20 py-6 text-center text-xs text-text-secondary transition-colors duration-300">
        <p>PaperHub Chapter • Mapped Syllabus and Exam Patterns</p>
      </footer>
    </div>
  );
}
