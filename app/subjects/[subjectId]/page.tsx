'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/sidebar';
import { Navbar } from '@/components/navbar';
import { seedColleges } from '@/lib/seedData';
import { 
  ArrowLeft, 
  ArrowUpRight,
  Play, 
  FileText, 
  Sparkles,
  BookOpen,
  ChevronRight,
  TrendingUp,
  Loader2,
  ListFilter,
  CheckCircle,
  HelpCircle,
  BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';

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

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subject, setSubject] = useState<SubjectDetail | null>(null);
  const [stats, setStats] = useState<SubjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  const [siblingSubjects, setSiblingSubjects] = useState<any[]>([]);

  // Filtering units state
  const [filterNotStarted, setFilterNotStarted] = useState(false);
  const [filterWeak, setFilterWeak] = useState(false);

  useEffect(() => {
    // Load onboarding context from localStorage
    const college = localStorage.getItem('selectedCollege') || 'MMMUT';
    const branch = localStorage.getItem('selectedBranch') || 'CSE';
    const semester = localStorage.getItem('selectedSemester') || '1';
    
    setBreadcrumbs([college, branch, `Sem ${semester}`]);

    const isLocalFallback = localStorage.getItem('useLocalFallback') === 'true';

    // Get sibling subjects for the left picker panel
    fetch(`/api/subjects?collegeCode=${college}&branchCode=${branch}&semester=${semester}`)
      .then(res => res.json())
      .then(data => setSiblingSubjects(data.subjects || []))
      .catch(() => setSiblingSubjects([]));

    if (isLocalFallback || subjectId.startsWith('mock-')) {
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
            router.push('/dashboard');
          }
        })
        .catch(() => {
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
            router.push('/dashboard');
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
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!subject) return null;

  return (
    <div className="flex min-h-screen bg-bg-primary text-text-primary overflow-hidden relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-grow flex flex-col min-h-screen overflow-y-auto z-10">
        <Navbar onMenuToggle={() => setSidebarOpen(true)} />

        <main className="flex-grow max-w-6xl w-full mx-auto px-6 py-8">
          {/* Dual Panel Layout grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Left Subject Picker Menu Panel */}
            <div className="lg:col-span-1 space-y-6">
              <div className="p-4 rounded-xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4">
                <h3 className="font-display font-black text-xs uppercase tracking-wider text-text-muted">Subjects Picker</h3>
                <div className="space-y-1.5">
                  {siblingSubjects.map((sibling) => (
                    <Link
                      key={sibling._id}
                      href={`/subjects/${sibling._id}`}
                      className={`
                        w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border
                        ${sibling._id === subjectId
                          ? 'bg-accent/10 border-accent/25 text-accent shadow-xs'
                          : 'border-transparent text-text-secondary hover:bg-bg-tertiary/40 hover:text-text-primary'
                        }
                      `}
                    >
                      <span className="truncate">{sibling.name}</span>
                      <ChevronRight className="w-3 h-3 text-text-muted shrink-0 ml-1.5" />
                    </Link>
                  ))}

                  <button className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold border border-transparent text-text-secondary hover:bg-bg-tertiary/40 hover:text-text-primary transition-all group">
                    <span className="flex items-center gap-2">
                      <BarChart3 className="w-3.5 h-3.5 text-accent" />
                      <span>Subject Analysis</span>
                    </span>
                    <span className="text-[8px] font-black bg-accent/15 text-accent px-1 rounded">NEW</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Unit Breakdown panel */}
            <div className="lg:col-span-3 space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-accent">{subject.code}</span>
                <h2 className="font-display font-black text-xl leading-none">{subject.name} Breakdown</h2>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Practice unit-by-unit syllabus checksheets, view university past answers, and simulate exams.
                </p>
              </div>

              {/* Solved Progress / Unit Filters */}
              <div className="p-4 rounded-xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-2.5">
                  <ListFilter className="w-4 h-4 text-text-muted" />
                  <span className="text-xs font-bold text-text-secondary">Filters:</span>
                  <button 
                    onClick={() => setFilterNotStarted(!filterNotStarted)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${filterNotStarted ? 'bg-accent/15 border-accent/30 text-accent' : 'border-border-primary hover:border-text-secondary text-text-secondary'}`}
                  >
                    Not Started
                  </button>
                  <button 
                    onClick={() => setFilterWeak(!filterWeak)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${filterWeak ? 'bg-accent/15 border-accent/30 text-accent' : 'border-border-primary hover:border-text-secondary text-text-secondary'}`}
                  >
                    Weak Chapter
                  </button>
                </div>
                <span className="text-xs font-bold text-text-secondary flex items-center gap-1">
                  <span>Progress:</span>
                  <span className="text-text-primary">0 / {subject.syllabus?.length || 4} units</span>
                </span>
              </div>

              {/* Units Checklist */}
              <div className="space-y-4">
                {subject.syllabus?.map((unit) => {
                  const isMostImportant = stats?.mostImportantUnit === unit.unitNumber;
                  const isHighYield = stats?.importantUnits?.includes(unit.unitNumber) && !isMostImportant;

                  return (
                    <div 
                      key={unit.unitNumber}
                      className="p-5.5 rounded-2xl border border-border-primary bg-bg-secondary/50 backdrop-blur-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-bg-secondary hover:border-accent/25 transition-all group"
                    >
                      <div className="space-y-2.5 flex-grow text-left">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="w-6 h-6 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-[10px] font-black text-accent">
                            {unit.unitNumber}
                          </span>
                          <h4 className="font-display font-extrabold text-sm text-text-primary group-hover:text-accent transition-colors leading-snug">
                            {unit.unitTitle}
                          </h4>
                          {isMostImportant && (
                            <span className="text-[8px] font-black bg-amber-500/10 border border-amber-500/20 text-amber-500 uppercase tracking-widest px-2 py-0.5 rounded-full">
                              🏆 Max Weightage
                            </span>
                          )}
                          {isHighYield && (
                            <span className="text-[8px] font-black bg-purple-500/10 border border-purple-500/20 text-purple-500 uppercase tracking-widest px-2 py-0.5 rounded-full">
                              ⭐ High Yield
                            </span>
                          )}
                        </div>

                        {/* Topics badges */}
                        <div className="flex flex-wrap gap-1.5">
                          {unit.topics.slice(0, 4).map((topic, idx) => (
                            <span 
                              key={idx} 
                              className="text-[9px] font-semibold text-text-muted px-2 py-0.5 rounded bg-bg-primary/50 border border-border-primary"
                            >
                              {topic}
                            </span>
                          ))}
                          {unit.topics.length > 4 && (
                            <span className="text-[9px] font-semibold text-text-muted px-2 py-0.5 rounded bg-bg-primary/50">
                              +{unit.topics.length - 4} more
                            </span>
                          )}
                        </div>

                        {/* Solved stats / Year counters */}
                        <div className="flex items-center gap-4 text-[9px] font-bold text-text-muted">
                          <span>0/12 questions solved</span>
                          <span>•</span>
                          <span>2026: 3 Qs | 2025: 5 Qs</span>
                        </div>
                      </div>

                      {/* Launch Actions */}
                      <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
                        <Link 
                          href={`/subjects/${subjectId}/chapters/${unit.unitNumber}`}
                          className="flex-1 md:flex-initial text-center py-2 px-4 rounded-xl bg-accent text-white hover:bg-accent-hover text-xs font-bold transition-all shadow-sm"
                        >
                          Open Unit
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Practice / Test modes block as quick toggle */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <Link href={`/subjects/${subjectId}/practice`} className="group">
                  <div className="p-5 rounded-xl border border-border-primary bg-bg-secondary/45 hover:bg-bg-secondary hover:border-accent/25 transition-all text-left flex items-start gap-4 h-32">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/15 flex items-center justify-center text-accent">
                      <Play className="w-4 h-4 shrink-0" />
                    </div>
                    <div>
                      <h4 className="font-display font-extrabold text-xs text-text-primary group-hover:text-accent transition-colors leading-none">Practice Subject</h4>
                      <p className="text-[10px] text-text-muted mt-2 leading-relaxed">Study step-by-step. Browse syllabus questions and query AI.</p>
                    </div>
                  </div>
                </Link>

                <Link href={`/subjects/${subjectId}/test`} className="group">
                  <div className="p-5 rounded-xl border border-border-primary bg-bg-secondary/45 hover:bg-bg-secondary hover:border-accent/25 transition-all text-left flex items-start gap-4 h-32">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/15 flex items-center justify-center text-accent">
                      <FileText className="w-4 h-4 shrink-0" />
                    </div>
                    <div>
                      <h4 className="font-display font-extrabold text-xs text-text-primary group-hover:text-accent transition-colors leading-none">Simulate Full Exam</h4>
                      <p className="text-[10px] text-text-muted mt-2 leading-relaxed">Time-constrained fullscreen exams with anti-cheat detection.</p>
                    </div>
                  </div>
                </Link>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
