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

interface SubjectStats {
  mostImportantUnit: number | null;
  importantUnits: number[];
  importantTopics: string[];
  topicStats: Record<string, { totalRepetition: number; count: number; maxMarks: number }>;
}

export default function SubjectDashboard() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.subjectId as string;

  const [subject, setSubject] = useState<SubjectDetail | null>(null);
  const [stats, setStats] = useState<SubjectStats | null>(null);
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
        // Seed mock stats for fallback mode
        setStats({
          mostImportantUnit: 1,
          importantUnits: [1, 2],
          importantTopics: ["Responsive Web Designing", "Static and Dynamic Websites", "CSS Styling", "Introduction to JavaScript"],
          topicStats: {
            "Responsive Web Designing": { totalRepetition: 3, count: 2, maxMarks: 5 },
            "Static and Dynamic Websites": { totalRepetition: 2, count: 2, maxMarks: 4 },
            "CSS Styling": { totalRepetition: 2, count: 2, maxMarks: 5 }
          }
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
            if (data.stats) {
              setStats(data.stats);
            }
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
      <main className="flex-grow max-w-4xl w-full mx-auto px-6 py-12 relative overflow-hidden">
        {/* Subtle glowing space background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-accent/5 rounded-full blur-[120px] pointer-events-none dark:block hidden"></div>

        <div className="mb-10 z-10 relative">
          <span className="text-xs font-bold uppercase tracking-wider text-accent mb-2 block">{subject.code}</span>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary mb-3">
            {subject.name}
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
            Prepare for your written university examinations with structured question sets mapped directly to the {subject.name} syllabus.
          </p>
        </div>

        {/* Mode Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 z-10 relative">
          {/* Practice Mode Card */}
          <Link
            href={`/subjects/${subjectId}/practice`}
            className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm text-left hover:border-accent/40 hover:shadow-[0_0_25px_rgba(124,102,255,0.15)] hover:bg-bg-secondary hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-52 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-accent/5 to-transparent rounded-bl-full pointer-events-none group-hover:from-accent/12 transition-all duration-300"></div>

            <div className="w-12 h-12 rounded-xl bg-accent/5 border border-accent/15 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all duration-300 shadow-inner">
              <Play className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-text-primary group-hover:text-accent flex items-center transition-colors duration-200 mb-1">
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
            className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm text-left hover:border-accent/40 hover:shadow-[0_0_25px_rgba(124,102,255,0.15)] hover:bg-bg-secondary hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-52 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-accent/5 to-transparent rounded-bl-full pointer-events-none group-hover:from-accent/12 transition-all duration-300"></div>

            <div className="w-12 h-12 rounded-xl bg-accent/5 border border-accent/15 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all duration-300 shadow-inner">
              <FileText className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-text-primary group-hover:text-accent flex items-center transition-colors duration-200 mb-1">
                <span>Test Mode</span>
                <ChevronRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Simulate a real written exam under time pressure. Focused fullscreen environment, anti-cheat detection, and summary analytics.
              </p>
            </div>
          </Link>

          {/* Important Questions (Soon) */}
          <div className="p-6 rounded-2xl border border-border-primary/50 bg-bg-secondary/35 text-left opacity-65 flex flex-col justify-between h-52 cursor-not-allowed">
            <div className="w-12 h-12 rounded-xl bg-border-primary/45 flex items-center justify-center text-text-muted">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-display font-semibold text-lg text-text-secondary">Important Questions</h3>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 font-bold uppercase tracking-wider">SOON</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                A customized selection of recurring questions showing highest exam repetition frequencies.
              </p>
            </div>
          </div>

          {/* Night Before Exam (Soon) */}
          <div className="p-6 rounded-2xl border border-border-primary/50 bg-bg-secondary/35 text-left opacity-65 flex flex-col justify-between h-52 cursor-not-allowed">
            <div className="w-12 h-12 rounded-xl bg-border-primary/45 flex items-center justify-center text-text-muted">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-display font-semibold text-lg text-text-secondary">Night Before Exam</h3>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 font-bold uppercase tracking-wider">SOON</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Hyper-focused final revision set. Check the absolute must-know topics in the last 12 hours.
              </p>
            </div>
          </div>
        </div>

        {/* Syllabus Overview Drawer/Accordion */}
        <div className="rounded-2xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm p-8 z-10 relative">
          <h3 className="font-display font-bold text-text-primary text-lg mb-6 flex items-center space-x-2.5">
            <BookOpen className="w-5 h-5 text-accent" />
            <span>Syllabus Mapping ({subject.syllabus?.length || 0} Units)</span>
          </h3>
          <div className="space-y-6">
            {subject.syllabus?.map((unit) => {
              const isMostImportant = stats?.mostImportantUnit === unit.unitNumber;
              const isHighYield = stats?.importantUnits?.includes(unit.unitNumber) && !isMostImportant;

              return (
                <div key={unit.unitNumber} className="border-b border-border-primary/40 last:border-0 pb-5 last:pb-0">
                  <div className="flex items-center flex-wrap gap-2.5 mb-2.5">
                    <h4 className="text-sm font-bold text-text-primary flex items-center space-x-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent/10 text-accent text-[10px] font-extrabold">
                        {unit.unitNumber}
                      </span>
                      <span>{unit.unitTitle}</span>
                    </h4>
                    {isMostImportant && (
                      <span className="text-[8px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-flex items-center">
                        🏆 Max Weightage
                      </span>
                    )}
                    {isHighYield && (
                      <span className="text-[8px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 inline-flex items-center">
                        ⭐ High Yield
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {unit.topics.map((topic: string, tIdx: number) => {
                      const isImportantTopic = stats?.importantTopics?.includes(topic.trim());
                      const topicDetail = stats?.topicStats?.[topic.trim()];

                      if (isImportantTopic) {
                        return (
                          <span 
                            key={tIdx} 
                            className="text-[10px] px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/15 cursor-default transition-all duration-200 inline-flex items-center space-x-1.5 font-semibold"
                          >
                            <span>🔥 {topic}</span>
                            {topicDetail?.maxMarks && (
                              <span className="text-[8px] px-1 py-0.2 rounded bg-rose-500/15 text-rose-300 font-extrabold">{topicDetail.maxMarks}M Max</span>
                            )}
                          </span>
                        );
                      }

                      return (
                        <span 
                          key={tIdx} 
                          className="text-[10px] px-2.5 py-1 rounded-full bg-bg-primary/50 border border-border-primary/80 text-text-secondary hover:text-accent hover:border-accent/40 hover:bg-bg-primary transition-all duration-200 cursor-default"
                        >
                          {topic}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-primary/50 bg-bg-secondary/20 py-6 text-center text-xs text-text-secondary transition-colors duration-300">
        <p>PaperHub • Mapped Syllabus and Exam Patterns</p>
      </footer>
    </div>
  );
}
