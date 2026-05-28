'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/theme-toggle';
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
  semester: number;
  syllabus?: {
    unitNumber: number;
    unitTitle: string;
    topics: string[];
  }[];
}

const branchIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  CSE: Code,
  IT: Cpu,
  ECE: Cpu,
  EE: Settings,
  ME: Wrench,
  CE: Layers
};

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

  // Dynamic state hooks for DB-driven onboarding
  const [colleges, setColleges] = useState<{ _id: string; name: string; code: string; isActive: boolean }[]>([]);
  const [branches, setBranches] = useState<{ _id: string; name: string; code: string; isActive: boolean }[]>([]);
  const [allSubjects, setAllSubjects] = useState<OnboardingSubject[]>([]);
  const [activeSemesters, setActiveSemesters] = useState<number[]>([]);
  
  const [loadingColleges, setLoadingColleges] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const subjectsToDisplay = allSubjects.filter((sub) => sub.semester === selectedSemester);
  const usingFallback = false;

  // Restore onboarding state from localStorage if available
  useEffect(() => {
    const shouldReset = searchParams.get('reset') === 'true';
    if (shouldReset) {
      localStorage.removeItem('selectedCollege');
      localStorage.removeItem('selectedBranch');
      localStorage.removeItem('selectedSemester');
      localStorage.removeItem('selectedSubjectId');
      localStorage.removeItem('selectedSubjectName');
      localStorage.removeItem('selectedSubjectCode');
      setSelectedCollege(null);
      setSelectedBranch(null);
      setSelectedSemester(null);
      setStep('college');
      return;
    }

    const college = localStorage.getItem('selectedCollege');
    const branch = localStorage.getItem('selectedBranch');
    const semester = localStorage.getItem('selectedSemester');
    
    if (college && branch && semester) {
      setSelectedCollege(college);
      setSelectedBranch(branch);
      setSelectedSemester(parseInt(semester, 10));
      setStep('subject');
    }
  }, [searchParams]);

  // Load colleges dynamically on mount
  useEffect(() => {
    setLoadingColleges(true);
    fetch('/api/onboarding?step=colleges')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (data.colleges) setColleges(data.colleges);
      })
      .catch((err) => console.error('Failed to load colleges:', err))
      .finally(() => setLoadingColleges(false));
  }, []);

  // Fetch branches dynamically when college is selected
  useEffect(() => {
    if (selectedCollege) {
      setLoadingBranches(true);
      fetch(`/api/onboarding?step=branches&collegeCode=${selectedCollege}`)
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((data) => {
          if (data.branches) setBranches(data.branches);
        })
        .catch((err) => console.error('Failed to load branches:', err))
        .finally(() => setLoadingBranches(false));
    }
  }, [selectedCollege]);

  // Fetch all subjects for the selected college & branch to determine active semesters
  useEffect(() => {
    if (selectedCollege && selectedBranch) {
      setLoadingSubjects(true);
      fetch(`/api/subjects?collegeCode=${selectedCollege}&branchCode=${selectedBranch}`)
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((data) => {
          if (data.subjects) {
            setAllSubjects(data.subjects);
            const activeSems = Array.from(new Set(data.subjects.map((s: OnboardingSubject) => s.semester))) as number[];
            setActiveSemesters(activeSems);
          }
        })
        .catch((err) => console.error('Failed to load subjects:', err))
        .finally(() => setLoadingSubjects(false));
    }
  }, [selectedCollege, selectedBranch]);

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
    localStorage.setItem('useLocalFallback', 'false');

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
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <span className="font-display font-bold text-lg">PaperHub</span>
              <span className="text-xs px-2 py-0.5 rounded bg-border-primary text-text-secondary font-medium">Onboarding</span>
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex items-center justify-center py-12 px-6 relative overflow-hidden">
        {/* Subtle space gradient glow background behind the onboarding card wizard */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[140px] pointer-events-none dark:block hidden"></div>
        
        <div className={`w-full transition-all duration-500 ease-in-out ${step === 'subject' || step === 'branch' ? 'max-w-4xl' : 'max-w-xl'}`}>
          {/* High-Fidelity Premium Connector Stepper */}
          <div className="flex items-center justify-between max-w-md mx-auto mb-10 px-4 relative">
            {/* Background connector line */}
            <div className="absolute top-3.5 left-8 right-8 h-[2px] bg-border-primary z-0"></div>
            
            {/* Active connector glowing line */}
            <div 
              className="absolute top-3.5 left-8 h-[2px] bg-accent transition-all duration-500 z-0"
              style={{
                width: `${
                  step === 'college' ? '0%' : 
                  step === 'branch' ? '33.33%' : 
                  step === 'semester' ? '66.66%' : '100%'
                }`
              }}
            ></div>

            {(['college', 'branch', 'semester', 'subject'] as const).map((s, idx) => {
              const steps = ['college', 'branch', 'semester', 'subject'];
              const labels = ['University', 'Branch', 'Semester', 'Subject'];
              const currentIdx = steps.indexOf(step);
              const active = idx <= currentIdx;
              const isCurrent = step === s;
              
              return (
                <div key={s} className="flex flex-col items-center z-10 relative">
                  <div 
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-display text-xs font-bold transition-all duration-300 ${
                      isCurrent 
                        ? 'bg-accent text-white ring-4 ring-accent/20 scale-110 shadow-[0_0_15px_rgba(124,102,255,0.4)]'
                        : active 
                          ? 'bg-accent text-white' 
                          : 'bg-bg-secondary border-2 border-border-primary text-text-secondary'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span 
                    className={`text-[9px] mt-2.5 font-semibold tracking-wide uppercase transition-colors duration-300 ${
                      isCurrent ? 'text-accent font-bold' : active ? 'text-text-primary' : 'text-text-muted'
                    }`}
                  >
                    {labels[idx]}
                  </span>
                </div>
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
                  {loadingColleges ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-3">
                      <Loader2 className="w-8 h-8 text-accent animate-spin" />
                      <p className="text-xs text-text-secondary">Fetching universities...</p>
                    </div>
                  ) : colleges.length > 0 ? (
                    colleges.map((col) => {
                      if (col.isActive) {
                        return (
                          <button
                            key={col._id}
                            onClick={() => handleCollegeSelect(col.code)}
                            className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm text-left hover:border-accent/40 hover:shadow-[0_0_25px_rgba(124,102,255,0.12)] hover:bg-bg-secondary hover:-translate-y-0.5 transition-all duration-300 flex items-start space-x-4 group relative overflow-hidden"
                          >
                            {/* Accent Glow corner overlay */}
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-accent/5 to-transparent rounded-bl-full pointer-events-none group-hover:from-accent/15 transition-all duration-300"></div>

                            <div className="w-12 h-12 rounded-xl bg-accent/5 border border-accent/15 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all duration-300 shadow-inner">
                              <GraduationCap className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
                            </div>
                            <div className="flex-grow z-10">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-display font-bold text-text-primary text-base group-hover:text-accent transition-colors duration-200">{col.name}</h3>
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-accent/8 border border-accent/20 text-accent font-semibold tracking-wider uppercase">
                                  {col.code}
                                </span>
                              </div>
                              <p className="text-xs text-text-secondary flex items-center space-x-1.5">
                                <span className="text-green-400 font-medium">🟢 Syllabi & PYQs Live</span>
                                <span className="text-text-muted">•</span>
                                <span>University Database Loaded</span>
                              </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-text-muted mt-3 group-hover:text-accent group-hover:translate-x-1 transition-all duration-300 z-10" />
                          </button>
                        );
                      }
                      return (
                        <div
                          key={col._id}
                          className="p-6 rounded-2xl border border-border-primary/50 bg-bg-secondary/35 text-left opacity-65 flex items-start space-x-4 relative overflow-hidden cursor-not-allowed"
                        >
                          <div className="w-12 h-12 rounded-xl bg-border-primary/40 flex items-center justify-center text-text-muted">
                            <GraduationCap className="w-6 h-6" />
                          </div>
                          <div className="flex-grow">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-display font-semibold text-text-secondary text-base">{col.name}</h3>
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 font-bold tracking-wider">
                                SOON
                              </span>
                            </div>
                            <p className="text-xs text-text-muted flex items-center space-x-1.5">
                              <span>{col.code}</span>
                              <span>•</span>
                              <span>Under indexing and course structuring</span>
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-sm text-text-secondary">No colleges found in database.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {step === 'branch' && (
                <motion.div
                  key="branch-step"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5"
                >
                  {loadingBranches ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-3 col-span-3">
                      <Loader2 className="w-8 h-8 text-accent animate-spin" />
                      <p className="text-xs text-text-secondary">Fetching branches...</p>
                    </div>
                  ) : branches.length > 0 ? (
                    branches.map((b) => {
                      const IconComponent = branchIconMap[b.code] || Layers;
                      if (b.isActive) {
                        return (
                          <button
                            key={b._id}
                            onClick={() => handleBranchSelect(b.code)}
                            className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm text-left hover:border-accent/40 hover:shadow-[0_0_20px_rgba(124,102,255,0.15)] hover:bg-bg-secondary hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-40 group relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-accent/5 to-transparent rounded-bl-full pointer-events-none group-hover:from-accent/12 transition-all duration-300"></div>

                            <div className="w-11 h-11 rounded-xl bg-accent/5 border border-accent/15 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all duration-300 shadow-inner">
                              <IconComponent className="w-5 h-5 group-hover:scale-105 transition-transform duration-300" />
                            </div>
                            <div className="w-full z-10">
                              <h3 className="font-display font-bold text-text-primary text-sm leading-snug group-hover:text-accent transition-colors duration-200 mb-1">
                                {b.name}
                              </h3>
                              <p className="text-[10px] text-green-400 font-semibold tracking-wider flex items-center space-x-1">
                                <span>🟢 Fully Indexed</span>
                              </p>
                            </div>
                          </button>
                        );
                      }
                      return (
                        <div
                          key={b._id}
                          className="p-6 rounded-2xl border border-border-primary/50 bg-bg-secondary/35 text-left opacity-65 flex flex-col justify-between h-40 cursor-not-allowed"
                        >
                          <div className="w-11 h-11 rounded-xl bg-border-primary/40 flex items-center justify-center text-text-muted">
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5 mb-1">
                              <h3 className="font-display font-semibold text-text-secondary text-sm leading-tight">{b.name}</h3>
                              <span className="text-[8px] px-1.5 py-0.5 rounded bg-border-primary text-text-secondary font-bold">SOON</span>
                            </div>
                            <p className="text-[10px] text-text-muted">Mapping academic syllabus...</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 col-span-3">
                      <p className="text-sm text-text-secondary">No branches found for this college.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {step === 'semester' && (
                <motion.div
                  key="semester-step"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
                >
                  {loadingSubjects ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-3 col-span-4">
                      <Loader2 className="w-8 h-8 text-accent animate-spin" />
                      <p className="text-xs text-text-secondary">Analyzing active semesters...</p>
                    </div>
                  ) : (
                    [1, 2, 3, 4, 5, 6, 7, 8].map((sem) => {
                      const isActive = activeSemesters.includes(sem);
                      if (isActive) {
                        return (
                          <button
                            key={sem}
                            onClick={() => handleSemesterSelect(sem)}
                            className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm text-center hover:border-accent/40 hover:shadow-[0_0_20px_rgba(124,102,255,0.15)] hover:bg-bg-secondary hover:-translate-y-1 transition-all duration-300 group flex flex-col items-center justify-center space-y-3 relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-accent/5 to-transparent rounded-bl-full pointer-events-none group-hover:from-accent/12 transition-all duration-300"></div>

                            <span className="font-display font-extrabold text-2xl text-accent group-hover:scale-110 transition-transform duration-300 drop-shadow-sm">Sem {sem}</span>
                            <div className="flex flex-col items-center space-y-1">
                              <span className="text-[9px] text-text-secondary uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-border-primary/50">
                                {sem <= 2 ? '1st Year' : sem <= 4 ? '2nd Year' : sem <= 6 ? '3rd Year' : '4th Year'}
                              </span>
                              <span className="text-[8px] text-green-400 font-semibold uppercase tracking-wider">Active PYQs</span>
                            </div>
                          </button>
                        );
                      }
                      return (
                        <div
                          key={sem}
                          className="p-6 rounded-2xl border border-border-primary/50 bg-bg-secondary/35 text-center opacity-65 cursor-not-allowed flex flex-col items-center justify-center space-y-3"
                        >
                          <span className="font-display font-bold text-2xl text-text-muted">Sem {sem}</span>
                          <span className="text-[8px] px-2 py-0.5 rounded-full bg-border-primary/60 text-text-secondary font-bold uppercase tracking-wider">COMING SOON</span>
                        </div>
                      );
                    })
                  )}
                </motion.div>
              )}

              {step === 'subject' && (
                <motion.div
                  key="subject-step"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="grid grid-cols-1 md:grid-cols-2 gap-5"
                >
                  {subjectsToDisplay.length > 0 ? (
                    subjectsToDisplay.map((sub) => (
                      <button
                        key={sub._id}
                        onClick={() => handleSubjectSelect(sub._id, sub.name, sub.code)}
                        className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm text-left hover:border-accent/40 hover:shadow-[0_0_25px_rgba(124,102,255,0.15)] hover:bg-bg-secondary hover:-translate-y-1 transition-all duration-300 flex items-center justify-between group overflow-hidden relative"
                      >
                        {/* Corner visual gradient overlay */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-accent/5 to-transparent rounded-bl-full pointer-events-none group-hover:from-accent/15 transition-all duration-300"></div>

                        <div className="flex items-center space-x-4 z-10">
                          <div className="w-12 h-12 rounded-2xl bg-accent/5 border border-accent/15 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white group-hover:border-transparent transition-all duration-300 shadow-inner">
                            <BookOpen className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2 mb-1.5">
                              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-accent/8 border border-accent/20 text-accent font-semibold tracking-wider uppercase">
                                {sub.code}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/25 text-green-400 font-medium">
                                Active PYQs
                              </span>
                            </div>
                            <h3 className="font-display font-bold text-text-primary text-base leading-snug group-hover:text-accent transition-colors duration-250">
                              {sub.name}
                            </h3>
                            <p className="text-xs text-text-secondary flex items-center space-x-1.5 mt-1">
                              <span>📚 {sub.syllabus?.length || 0} Units Indexed</span>
                              <span className="text-text-muted">•</span>
                              <span className="text-accent/80 font-medium">Auto Mapped</span>
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-accent group-hover:translate-x-1 transition-all duration-300 z-10" />
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-12 col-span-2">
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
                    <div className="text-[10px] text-center text-text-muted border-t border-border-primary/50 pt-4 col-span-2">
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
