'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/theme-toggle';
import { seedColleges } from '@/lib/seedData';
import { 
  ArrowLeft, 
  BookOpen, 
  GraduationCap, 
  Code, 
  Cpu, 
  Settings, 
  Wrench, 
  Layers,
  ChevronRight,
  Loader2
} from 'lucide-react';

interface OnboardingSubject {
  _id: string;
  name: string;
  code: string;
  syllabus?: {
    unitNumber: number;
    unitTitle: string;
    topics: string[];
  }[];
}

export default function Onboarding() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-secondary">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-sm">Loading onboarding wizard...</p>
        </div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isDemo = searchParams.get('demo') === 'true';

  const [step, setStep] = useState<'college' | 'branch' | 'semester' | 'subject'>('college');
  const [selectedCollege, setSelectedCollege] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedSubject, setSelectedSubject] = useState<{ id: string; name: string; code: string } | null>(null);

  // Dynamic loading states
  const [subjects, setSubjects] = useState<OnboardingSubject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  // Fetch subjects dynamically when college, branch, and semester are selected
  useEffect(() => {
    if (selectedCollege && selectedBranch && selectedSemester) {
      setLoadingSubjects(true);
      setUsingFallback(false);
      
      // Attempt to fetch from real API
      fetch(`/api/subjects?collegeCode=${selectedCollege}&branchCode=${selectedBranch}&semester=${selectedSemester}`)
        .then((res) => {
          if (!res.ok) throw new Error('API failed');
          return res.json();
        })
        .then((data) => {
          if (data.subjects && data.subjects.length > 0) {
            setSubjects(data.subjects);
          } else {
            loadFallbackSubjects();
          }
        })
        .catch(() => {
          // If API fails (e.g. no DB connected yet), use fallback mock subjects
          loadFallbackSubjects();
        })
        .finally(() => {
          setLoadingSubjects(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCollege, selectedBranch, selectedSemester]);

  const loadFallbackSubjects = () => {
    setUsingFallback(true);
    // Find the college, branch, and semester in our seedData definition
    const col = seedColleges.find((c) => c.code === selectedCollege);
    const br = col?.branches.find((b) => b.code === selectedBranch);
    const subjs = br?.subjects.filter((s) => s.semester === selectedSemester) || [];
    
    // Map them to include a mock string id for client navigation
    const mapped = subjs.map((s) => ({
      _id: `mock-${s.code}`,
      name: s.name,
      code: s.code,
      syllabus: s.syllabus
    }));
    
    setSubjects(mapped);
  };

  const handleCollegeSelect = (code: string) => {
    setSelectedCollege(code);
    setStep('branch');
  };

  const handleBranchSelect = (code: string) => {
    setSelectedBranch(code);
    setStep('semester');
  };

  const handleSemesterSelect = (sem: number) => {
    setSelectedSemester(sem);
    setStep('subject');
  };

  const handleSubjectSelect = (id: string, name: string, code: string) => {
    setSelectedSubject({ id, name, code });
    
    // Save selections in local storage for persistence
    localStorage.setItem('selectedCollege', selectedCollege || '');
    localStorage.setItem('selectedBranch', selectedBranch || '');
    localStorage.setItem('selectedSemester', String(selectedSemester || ''));
    localStorage.setItem('selectedSubjectId', id);
    localStorage.setItem('selectedSubjectName', name);
    localStorage.setItem('selectedSubjectCode', code);
    
    // If it's a fallback subject, we also cache it to simulate DB locally
    if (usingFallback) {
      localStorage.setItem('useLocalFallback', 'true');
    } else {
      localStorage.setItem('useLocalFallback', 'false');
    }

    // Go to subject dashboard
    router.push(`/subjects/${id}`);
  };

  const goBack = () => {
    if (step === 'branch') setStep('college');
    if (step === 'semester') setStep('branch');
    if (step === 'subject') setStep('semester');
  };

  // Page title / subtitles helper
  const getHeaderInfo = () => {
    switch (step) {
      case 'college':
        return {
          title: 'Select Your University',
          subtitle: 'Choose your college to load mapped syllabi and past year exam papers.'
        };
      case 'branch':
        return {
          title: 'Select Your Branch',
          subtitle: 'Choose your academic major. Different branches map different subjects.'
        };
      case 'semester':
        return {
          title: 'Select Semester',
          subtitle: 'Choose your current study term. We will structure papers by this term.'
        };
      case 'subject':
        return {
          title: 'Choose Subject to Solve',
          subtitle: 'Here are the indexed subjects matching your course details.'
        };
    }
  };

  const info = getHeaderInfo();

  // Slide animations
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.3, ease: 'easeInOut' as const }
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0,
      transition: { duration: 0.2, ease: 'easeInOut' as const }
    })
  };

  return (
    <div className="min-h-screen flex flex-col justify-between relative transition-colors duration-300">
      {/* Top Navbar */}
      <header className="border-b border-border-primary/50 bg-bg-primary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {step !== 'college' ? (
              <button 
                onClick={goBack} 
                className="p-2 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary transition-colors"
                aria-label="Go Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <Link href="/" className="p-2 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            )}
            <div className="flex items-center space-x-2">
              <span className="font-display font-bold text-lg">PaperHub</span>
              <span className="text-xs px-2 py-0.5 rounded bg-border-primary text-text-secondary font-medium">Onboarding</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex items-center justify-center py-12 px-6">
        <div className="max-w-xl w-full">
          {/* Progress dots */}
          <div className="flex items-center justify-center space-x-3 mb-8">
            {(['college', 'branch', 'semester', 'subject'] as const).map((s, idx) => {
              const steps = ['college', 'branch', 'semester', 'subject'];
              const currentIdx = steps.indexOf(step);
              const active = idx <= currentIdx;
              return (
                <div 
                  key={s} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    active ? 'w-8 bg-accent' : 'w-2 bg-border-primary'
                  }`}
                />
              );
            })}
          </div>

          <div className="text-center mb-8">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-text-primary">
              {info.title}
            </h1>
            <p className="text-sm text-text-secondary max-w-md mx-auto">
              {info.subtitle}
            </p>
          </div>

          {/* Cards Frame */}
          <div className="relative overflow-hidden min-h-[300px]">
            <AnimatePresence mode="wait" initial={false}>
              {step === 'college' && (
                <motion.div
                  key="college-step"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="grid grid-cols-1 gap-4"
                >
                  {/* MMMUT */}
                  <button
                    onClick={() => handleCollegeSelect('MMMUT')}
                    className="p-6 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-left hover:border-accent/40 hover:shadow-sm transition-all duration-200 flex items-start space-x-4 group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-accent/5 border border-accent/15 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-colors duration-200">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-display font-semibold text-text-primary mb-1">Madan Mohan Malaviya University of Tech</h3>
                      <p className="text-xs text-text-secondary">MMMUT Gorakhpur • Mapped Syllabi & PYQs</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-text-muted mt-2 group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* AKTU - Disabled */}
                  <div className="p-6 rounded-xl border border-border-primary bg-bg-secondary/40 text-left opacity-60 flex items-start space-x-4 cursor-not-allowed">
                    <div className="w-10 h-10 rounded-lg bg-border-primary flex items-center justify-center text-text-muted">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-display font-semibold text-text-primary">Dr. A.P.J. Abdul Kalam Technical University</h3>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-border-primary text-text-secondary font-medium">SOON</span>
                      </div>
                      <p className="text-xs text-text-secondary">AKTU Lucknow • Under indexing</p>
                    </div>
                  </div>

                  {/* HBTU - Disabled */}
                  <div className="p-6 rounded-xl border border-border-primary bg-bg-secondary/40 text-left opacity-60 flex items-start space-x-4 cursor-not-allowed">
                    <div className="w-10 h-10 rounded-lg bg-border-primary flex items-center justify-center text-text-muted">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-display font-semibold text-text-primary">Harcourt Butler Technical University</h3>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-border-primary text-text-secondary font-medium">SOON</span>
                      </div>
                      <p className="text-xs text-text-secondary">HBTU Kanpur • Under indexing</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 'branch' && (
                <motion.div
                  key="branch-step"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  {/* CSE */}
                  <button
                    onClick={() => handleBranchSelect('CSE')}
                    className="p-5 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-left hover:border-accent/40 hover:shadow-sm transition-all duration-200 flex flex-col justify-between h-36 group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-accent/5 border border-accent/15 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-colors duration-200">
                      <Code className="w-4 h-4" />
                    </div>
                    <div className="w-full">
                      <h3 className="font-display font-semibold text-text-primary text-sm leading-tight mb-1">Computer Science & Engineering</h3>
                      <p className="text-[11px] text-text-secondary">Fully Indexed</p>
                    </div>
                  </button>

                  {/* IT */}
                  <button
                    onClick={() => handleBranchSelect('IT')}
                    className="p-5 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-left hover:border-accent/40 hover:shadow-sm transition-all duration-200 flex flex-col justify-between h-36 group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-accent/5 border border-accent/15 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-colors duration-200">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div className="w-full">
                      <h3 className="font-display font-semibold text-text-primary text-sm leading-tight mb-1">Information Technology</h3>
                      <p className="text-[11px] text-text-secondary">Fully Indexed</p>
                    </div>
                  </button>

                  {/* Other Branches (Coming Soon) */}
                  {[
                    { name: 'ECE (IoT)', icon: Cpu },
                    { name: 'Electrical Engineering', icon: Settings },
                    { name: 'Mechanical Engineering', icon: Wrench },
                    { name: 'Chemical/Civil Eng', icon: Layers }
                  ].map((b, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-xl border border-border-primary bg-bg-secondary/40 text-left opacity-60 flex flex-col justify-between h-36 cursor-not-allowed"
                    >
                      <div className="w-9 h-9 rounded-lg bg-border-primary flex items-center justify-center text-text-muted">
                        <b.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5 mb-1">
                          <h3 className="font-display font-semibold text-text-primary text-sm leading-tight">{b.name}</h3>
                          <span className="text-[8px] px-1 rounded bg-border-primary text-text-secondary font-medium">SOON</span>
                        </div>
                        <p className="text-[10px] text-text-secondary">Mapping syllabus...</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {step === 'semester' && (
                <motion.div
                  key="semester-step"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="grid grid-cols-3 gap-3"
                >
                  {/* Semester cards */}
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => {
                    const active = sem === 1; // Only sem 1 is active for MVP demo seeding
                    if (active) {
                      return (
                        <button
                          key={sem}
                          onClick={() => handleSemesterSelect(sem)}
                          className="py-5 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary hover:border-accent/40 text-center transition-all duration-200 group flex flex-col items-center justify-center space-y-2"
                        >
                          <span className="font-display font-bold text-xl text-accent group-hover:scale-110 transition-transform">Sem {sem}</span>
                          <span className="text-[10px] text-text-secondary uppercase font-semibold tracking-wider">1st Year</span>
                        </button>
                      );
                    }
                    return (
                      <div
                        key={sem}
                        className="py-5 rounded-xl border border-border-primary bg-bg-secondary/40 text-center opacity-60 cursor-not-allowed flex flex-col items-center justify-center space-y-2"
                      >
                        <span className="font-display font-bold text-xl text-text-muted">Sem {sem}</span>
                        <span className="text-[8px] px-1 py-0.5 rounded bg-border-primary text-text-secondary font-medium">COMING SOON</span>
                      </div>
                    );
                  })}
                </motion.div>
              )}

              {step === 'subject' && (
                <motion.div
                  key="subject-step"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="grid grid-cols-1 gap-4"
                >
                  {loadingSubjects ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-3">
                      <Loader2 className="w-8 h-8 text-accent animate-spin" />
                      <p className="text-xs text-text-secondary">Fetching subject catalog...</p>
                    </div>
                  ) : subjects.length > 0 ? (
                    subjects.map((sub) => (
                      <button
                        key={sub._id}
                        onClick={() => handleSubjectSelect(sub._id, sub.name, sub.code)}
                        className="p-6 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-left hover:border-accent/40 hover:shadow-sm transition-all duration-200 flex items-center justify-between group"
                      >
                        <div className="flex items-start space-x-4">
                          <div className="w-10 h-10 rounded-lg bg-accent/5 border border-accent/15 flex items-center justify-center text-accent">
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-display font-semibold text-text-primary mb-1">{sub.name}</h3>
                            <p className="text-xs text-text-secondary">{sub.code} • {sub.syllabus?.length || 0} Units Indexed</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-text-muted group-hover:translate-x-1 transition-transform" />
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-sm text-text-secondary">No subjects mapped for this combination.</p>
                      <button
                        onClick={() => setStep('semester')}
                        className="mt-4 text-xs font-semibold text-accent hover:underline"
                      >
                        Go back and change semester
                      </button>
                    </div>
                  )}

                  {usingFallback && !loadingSubjects && (
                    <div className="text-[10px] text-center text-text-muted border-t border-border-primary/50 pt-4">
                      Running in local preview mode. Configured database not detected.
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer info */}
      <footer className="border-t border-border-primary/50 bg-bg-secondary/20 py-4 text-center text-xs text-text-secondary transition-colors duration-300">
        <p>Selected Context: {selectedCollege || 'None'} {selectedBranch ? `> ${selectedBranch}` : ''} {selectedSemester ? `> Sem ${selectedSemester}` : ''}</p>
      </footer>
    </div>
  );
}
