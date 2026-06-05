'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/auth-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { 
  ArrowLeft, 
  GraduationCap, 
  Code, 
  Cpu, 
  Settings, 
  Wrench, 
  Layers,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

const branchIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  CSE: Code,
  IT: Cpu,
  ECE: Cpu,
  "ECE-IOT": Cpu,
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
          <p className="text-sm">Loading onboarding...</p>
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
  const { user, fbUser, loading, refreshProfile } = useAuth();

  const isReset = searchParams.get('reset') === 'true';

  // Onboarding Wizard steps: 
  // 1: Name
  // 2: University
  // 3: College
  // 4: Course
  // 5: Branch (only if Course.isBranchRequired === true)
  // 6: Semester
  // 7: Completion Loader & Migration
  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState('');
  
  const [selectedUniversity, setSelectedUniversity] = useState<string | null>(null);
  const [selectedCollege, setSelectedCollege] = useState<string | null>(null);
  const [customCollegeName, setCustomCollegeName] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // DB-driven selection lists
  const [universities, setUniversities] = useState<{ _id: string; name: string; code: string; isActive: boolean }[]>([]);
  const [colleges, setColleges] = useState<{ _id: string; name: string; code: string; universityId: string; isActive: boolean }[]>([]);
  const [courses, setCourses] = useState<{ _id: string; name: string; code: string; durationYears: number; maxSemesters: number; isBranchRequired: boolean; isActive: boolean }[]>([]);
  const [branches, setBranches] = useState<{ _id: string; name: string; code: string; courseId: string; isActive: boolean }[]>([]);

  const [loadingUniversities, setLoadingUniversities] = useState(false);
  const [loadingColleges, setLoadingColleges] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [savingOnboarding, setSavingOnboarding] = useState(false);

  // If reset=true parameter is present, wipe sessional completed status in DB & LocalStorage
  useEffect(() => {
    if (isReset && fbUser && !loading) {
      const runReset = async () => {
        try {
          const token = await fbUser.getIdToken();
          await fetch('/api/users/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              onboardingCompleted: false,
              profile: {
                name: fbUser.displayName || '',
                universityId: null,
                collegeId: null,
                courseId: null,
                branchId: null,
                semester: null
              }
            })
          });
          
          // Clear local states
          setName(fbUser.displayName || '');
          setSelectedUniversity(null);
          setSelectedCollege(null);
          setCustomCollegeName('');
          setSelectedCourse(null);
          setSelectedBranch(null);
          setSelectedSemester(null);
          setStep(1);

          // Clear local storage
          localStorage.removeItem('selectedCollege');
          localStorage.removeItem('selectedBranch');
          localStorage.removeItem('selectedSemester');
          
          await refreshProfile();
          router.replace('/onboarding');
        } catch (err) {
          console.error('Failed to reset onboarding parameters:', err);
        }
      };
      runReset();
    }
  }, [isReset, fbUser, loading]);

  // Authenticated route protection
  useEffect(() => {
    if (!loading && !fbUser && !isReset) {
      router.push('/login');
    }
  }, [fbUser, loading, router, isReset]);

  // Load existing profile name if available in auth user
  useEffect(() => {
    if (fbUser && fbUser.displayName && !name) {
      setName(fbUser.displayName);
    }
  }, [fbUser, name]);

  // Fetch Universities on step 2 load
  useEffect(() => {
    if (fbUser && step === 2 && universities.length === 0) {
      setLoadingUniversities(true);
      fetch('/api/onboarding?step=universities')
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((data) => {
          if (data.universities) setUniversities(data.universities);
        })
        .catch((err) => console.error('Failed to load universities:', err))
        .finally(() => setLoadingUniversities(false));
    }
  }, [fbUser, step, universities.length]);

  // Fetch Colleges on step 3 load
  useEffect(() => {
    if (selectedUniversity && step === 3) {
      setLoadingColleges(true);
      fetch(`/api/onboarding?step=colleges&universityId=${selectedUniversity}`)
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((data) => {
          if (data.colleges) setColleges(data.colleges);
        })
        .catch((err) => console.error('Failed to load colleges:', err))
        .finally(() => setLoadingColleges(false));
    }
  }, [selectedUniversity, step]);

  // Fetch Courses on step 4 load
  useEffect(() => {
    if (selectedUniversity && step === 4) {
      setLoadingCourses(true);
      fetch(`/api/onboarding?step=courses&universityId=${selectedUniversity}`)
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((data) => {
          if (data.courses) setCourses(data.courses);
        })
        .catch((err) => console.error('Failed to load courses:', err))
        .finally(() => setLoadingCourses(false));
    }
  }, [selectedUniversity, step]);

  // Fetch Branches on step 5 load
  useEffect(() => {
    if (selectedCourse && step === 5) {
      setLoadingBranches(true);
      fetch(`/api/onboarding?step=branches&courseId=${selectedCourse}`)
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
  }, [selectedCourse, step]);

  // Complete onboarding profile save & Guest data migration
  const handleOnboardingComplete = async () => {
    if (!fbUser) return;
    setSavingOnboarding(true);
    setErrorMsg(null);

    // Read guest data from localStorage for migration
    let migrationData = null;
    try {
      const guestBookmarksStr = localStorage.getItem('guest_bookmarks');
      const guestNotesStr = localStorage.getItem('guest_notes');
      const guestIncorrectStr = localStorage.getItem('guest_incorrect');

      const bookmarks = guestBookmarksStr ? JSON.parse(guestBookmarksStr) : [];
      const incorrectAttempts = guestIncorrectStr ? JSON.parse(guestIncorrectStr) : [];
      
      let notes = [];
      if (guestNotesStr) {
        const parsedNotes = JSON.parse(guestNotesStr);
        if (Array.isArray(parsedNotes)) {
          notes = parsedNotes;
        } else if (typeof parsedNotes === 'object') {
          notes = Object.entries(parsedNotes).map(([questionId, noteText]) => ({
            questionId,
            noteText
          }));
        }
      }

      if (bookmarks.length > 0 || notes.length > 0 || incorrectAttempts.length > 0) {
        migrationData = { bookmarks, notes, incorrectAttempts };
      }
    } catch (e) {
      console.warn('Failed to parse guest data for migration:', e);
    }

    try {
      const token = await fbUser.getIdToken();
      let finalCollegeId = selectedCollege;

      // Handle custom college registration
      if (selectedCollege === 'custom') {
        const customRes = await fetch('/api/onboarding/request-college', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            universityId: selectedUniversity,
            collegeName: customCollegeName
          })
        });
        if (!customRes.ok) {
          const errBody = await customRes.json();
          throw new Error(errBody.error || 'Failed to submit custom college request.');
        }
        const customData = await customRes.json();
        finalCollegeId = customData.collegeId;
      }

      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          profile: {
            name,
            universityId: selectedUniversity,
            collegeId: finalCollegeId,
            courseId: selectedCourse,
            branchId: selectedBranch,
            semester: selectedSemester
          },
          onboardingCompleted: true,
          migrationData
        })
      });

      if (!res.ok) {
        let errMsg = 'Failed to save onboarding parameters. Please retry.';
        try {
          const errBody = await res.json();
          if (errBody.error) errMsg = errBody.error;
        } catch (_) {}
        throw new Error(errMsg);
      }

      // Sync the auth provider profiles
      await refreshProfile();

      // Clear guest keys ONLY on successful migration
      try {
        localStorage.removeItem('guest_bookmarks');
        localStorage.removeItem('guest_notes');
        localStorage.removeItem('guest_incorrect');
      } catch (_) {}

      // Save local storage values for backward compatibility
      const colObj = colleges.find(c => c._id === finalCollegeId);
      const branchObj = branches.find(b => b._id === selectedBranch);

      localStorage.setItem('selectedCollege', colObj ? colObj.code : 'TEMP');
      localStorage.setItem('selectedBranch', branchObj ? branchObj.code : 'CSE');
      localStorage.setItem('selectedSemester', String(selectedSemester || '1'));
      localStorage.setItem('useLocalFallback', 'false');

      // Forward to landing page / dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (err: any) {
      setErrorMsg(err.message || 'Server error compiling your syllabus details.');
      setStep(6); // Return to semester select so they can try again
      setSavingOnboarding(false);
    }
  };

  // Trigger complete action on final step transition
  useEffect(() => {
    if (step === 7) {
      handleOnboardingComplete();
    }
  }, [step]);

  const canProceed = (): boolean => {
    if (step === 1) return name.trim().length >= 2;
    if (step === 2) return selectedUniversity !== null;
    if (step === 3) {
      if (selectedCollege === 'custom') {
        return customCollegeName.trim().length >= 3;
      }
      return selectedCollege !== null;
    }
    if (step === 4) return selectedCourse !== null;
    if (step === 5) return selectedBranch !== null;
    if (step === 6) return selectedSemester !== null;
    return false;
  };

  const goNext = () => {
    if (!canProceed()) return;
    if (step === 4) {
      const courseObj = courses.find(c => c._id === selectedCourse);
      if (courseObj && !courseObj.isBranchRequired) {
        setSelectedBranch(null);
        setStep(6); // Skip Branch selection and go directly to Semester
        return;
      }
    }
    setStep(s => s + 1);
  };

  const goBack = () => {
    if (step === 6) {
      const courseObj = courses.find(c => c._id === selectedCourse);
      if (courseObj && !courseObj.isBranchRequired) {
        setStep(4); // Go back to course, skipping branch
        return;
      }
    }
    if (step > 1) {
      setStep(s => s - 1);
      setErrorMsg(null);
    }
  };

  const getHeaderInfo = () => {
    switch (step) {
      case 1:
        return { title: 'What should we call you?', subtitle: 'Enter your name to personalize your dashboard.' };
      case 2:
        return { title: 'Select your University', subtitle: 'This configures syllabus guidelines and course blueprints.' };
      case 3:
        return { title: 'Select your affiliated College', subtitle: 'This links your studies with your campus ecosystem.' };
      case 4:
        return { title: 'What is your Course / Degree?', subtitle: 'Select your target education program.' };
      case 5:
        return { title: 'Select your Branch / Stream', subtitle: 'Choose your academic specialization.' };
      case 6:
        return { title: 'Select Current Semester', subtitle: 'Allows grouping your studies for this term.' };
      case 7:
        return { title: 'Initializing Ecosystem', subtitle: 'Preparing your personalized university preparation path.' };
      default:
        return { title: '', subtitle: '' };
    }
  };

  const info = getHeaderInfo();

  return (
    <div className="min-h-screen flex flex-col justify-between relative transition-colors duration-300 bg-bg-primary text-text-primary">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[140px] pointer-events-none dark:block hidden" />

      {/* Top Navbar */}
      <header className="border-b border-border-primary/50 bg-bg-primary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {step > 1 && step < 7 && (
              <button 
                onClick={goBack} 
                className="p-2 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary transition-colors"
                aria-label="Go Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <Link href="/" className="flex items-center space-x-2">
              <span className="font-display font-bold text-lg">PaperHub</span>
              <span className="text-xs px-2 py-0.5 rounded bg-border-primary text-text-secondary font-medium">Onboarding</span>
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main content Area */}
      <main className="flex-grow flex items-center justify-center py-12 px-6 relative overflow-hidden">
        <div className={`w-full transition-all duration-500 ease-in-out ${step === 5 ? 'max-w-3xl' : 'max-w-xl'}`}>
          
          {/* Stepper Progress Bar */}
          {step < 7 && (
            <div className="max-w-md mx-auto mb-10 px-4 relative">
              <div className="h-1 w-full bg-border-primary/50 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-accent"
                  initial={{ width: '15%' }}
                  animate={{ width: `${(step / 6) * 100}%` }}
                  transition={{ ease: 'easeInOut', duration: 0.3 }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-text-muted mt-2 font-mono uppercase tracking-wider font-extrabold">
                <span>Step {step} of 6</span>
                <span>{Math.round((step / 6) * 100)}% Complete</span>
              </div>
            </div>
          )}

          {step < 7 && (
            <div className="text-center mb-8">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 text-text-primary">
                {info.title}
              </h1>
              <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
                {info.subtitle}
              </p>
            </div>
          )}

          {/* Step Cards with Transition */}
          <div className="relative min-h-[280px]">
            {errorMsg && (
              <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-xs flex items-start space-x-2.5 max-w-md mx-auto mb-6">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{errorMsg}</p>
              </div>
            )}

            <AnimatePresence mode="wait" initial={false}>
              
              {/* Step 1: Your Name */}
              {step === 1 && (
                <motion.div
                  key="step-name"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6 max-w-md mx-auto"
                >
                  <div className="w-24 h-24 mx-auto flex items-center justify-center relative bg-accent/5 border border-accent/15 rounded-full shadow-inner">
                    <svg viewBox="0 0 100 100" className="w-16 h-16 text-accent">
                      <path d="M 30,85 Q 50,75 70,85" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                      <path d="M 50,80 Q 30,55 45,35" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                      <circle cx="55" cy="30" r="16" fill="currentColor" className="opacity-15" />
                      <path d="M 42,22 Q 58,15 70,28 L 52,42 Z" fill="currentColor" />
                      <line x1="68" y1="36" x2="80" y2="48" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="animate-pulse" />
                      <line x1="56" y1="46" x2="62" y2="60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="animate-pulse" />
                      <circle cx="53" cy="27" r="2.5" fill="currentColor" />
                      <circle cx="62" cy="33" r="2.5" fill="currentColor" />
                    </svg>
                    <div className="absolute top-12 left-12 w-12 h-12 bg-accent/20 rounded-full blur-[12px] animate-pulse" />
                  </div>

                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && canProceed() && goNext()}
                      className="w-full text-center px-4 py-3 rounded-xl border border-border-primary bg-bg-secondary/40 focus:border-accent font-display text-base transition-colors"
                      autoFocus
                    />
                    <button
                      onClick={goNext}
                      disabled={!canProceed()}
                      className="w-full py-3 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all flex items-center justify-center space-x-2 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
                    >
                      <span>Get Started</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: University Select */}
              {step === 2 && (
                <motion.div
                  key="step-university"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  {loadingUniversities ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-3">
                      <Loader2 className="w-8 h-8 text-accent animate-spin" />
                      <p className="text-xs text-text-secondary">Loading university directory...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3.5">
                       {universities.map((univ) => (
                        <button
                          key={univ._id}
                          onClick={() => { setSelectedUniversity(univ._id); setStep(3); }}
                          className={`p-5 rounded-2xl border text-left flex items-start justify-between group transition-all duration-300 relative overflow-hidden ${
                            selectedUniversity === univ._id
                              ? 'border-accent bg-accent/5 ring-2 ring-accent/15'
                              : 'border-border-primary bg-bg-secondary/60 hover:border-accent/40 hover:-translate-y-0.5 hover:bg-bg-secondary'
                          }`}
                        >
                          <div className="flex items-start space-x-3.5 z-10">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300 ${
                              selectedUniversity === univ._id
                                ? 'bg-accent text-white border-transparent'
                                : 'bg-accent/5 border-accent/10 text-accent group-hover:bg-accent group-hover:text-white'
                            }`}>
                              <GraduationCap className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-display font-bold text-text-primary text-sm group-hover:text-accent transition-colors">{univ.name}</h3>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-border-primary text-text-secondary font-bold uppercase tracking-wider">{univ.code}</span>
                              </div>
                              <p className="text-[10px] text-text-secondary">
                                {univ.isActive ? '🟢 Curriculum and syllabi verified' : '🟠 Coming Soon'}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-text-muted mt-3 group-hover:text-accent group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 3: College Select */}
              {step === 3 && (
                <motion.div
                  key="step-college"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  {loadingColleges ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-3">
                      <Loader2 className="w-8 h-8 text-accent animate-spin" />
                      <p className="text-xs text-text-secondary">Loading affiliated colleges...</p>
                    </div>
                  ) : selectedCollege === 'custom' ? (
                    <div className="space-y-4 p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm max-w-md mx-auto">
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">Custom College Name</label>
                        <input
                          type="text"
                          placeholder="Enter your college's full name"
                          value={customCollegeName}
                          onChange={(e) => setCustomCollegeName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && canProceed() && setStep(4)}
                          className="w-full px-4 py-3 rounded-xl border border-border-primary bg-bg-secondary focus:border-accent text-sm transition-colors"
                          autoFocus
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3 pt-2">
                        <button
                          onClick={() => { setSelectedCollege(null); setCustomCollegeName(''); }}
                          className="px-4 py-2.5 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-xs font-semibold text-text-secondary transition-colors"
                        >
                          Back to List
                        </button>
                        <button
                          onClick={() => setStep(4)}
                          disabled={!canProceed()}
                          className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all disabled:opacity-50"
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3.5">
                       {colleges.map((col) => (
                        <button
                          key={col._id}
                          onClick={() => { setSelectedCollege(col._id); setStep(4); }}
                          className={`p-5 rounded-2xl border text-left flex items-start justify-between group transition-all duration-300 relative overflow-hidden ${
                            selectedCollege === col._id
                              ? 'border-accent bg-accent/5 ring-2 ring-accent/15'
                              : 'border-border-primary bg-bg-secondary/60 hover:border-accent/40 hover:-translate-y-0.5 hover:bg-bg-secondary'
                          }`}
                        >
                          <div className="flex items-start space-x-3.5 z-10">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300 ${
                              selectedCollege === col._id
                                ? 'bg-accent text-white border-transparent'
                                : 'bg-accent/5 border-accent/10 text-accent group-hover:bg-accent group-hover:text-white'
                            }`}>
                              <GraduationCap className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-display font-bold text-text-primary text-sm group-hover:text-accent transition-colors">{col.name}</h3>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-border-primary text-text-secondary font-bold uppercase tracking-wider">{col.code}</span>
                              </div>
                              <p className="text-[10px] text-text-secondary">
                                {col.isActive ? '🟢 Blueprint PYQs mapped' : '🟠 Under mapping'}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-text-muted mt-3 group-hover:text-accent group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      ))}

                      {/* Option for unlisted college */}
                      <button
                        onClick={() => setSelectedCollege('custom')}
                        className="p-5 rounded-2xl border border-dashed border-purple-500/30 text-left flex items-start justify-between group transition-all duration-300 bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-500/50"
                      >
                        <div className="flex items-start space-x-3.5">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-purple-500/15 border-purple-500/30 text-purple-400">
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-display font-bold text-text-primary text-sm group-hover:text-purple-400 transition-colors">My college is not listed</h3>
                            <p className="text-[10px] text-text-secondary">
                              Request to add your college and proceed immediately.
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-purple-400 mt-3 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 4: Course Select */}
              {step === 4 && (
                <motion.div
                  key="step-course"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  {loadingCourses ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-3">
                      <Loader2 className="w-8 h-8 text-accent animate-spin" />
                      <p className="text-xs text-text-secondary">Loading courses...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {courses.map((c) => (
                        <button
                          key={c._id}
                          onClick={() => { 
                            setSelectedCourse(c._id); 
                            if (c.isBranchRequired) {
                              setStep(5); 
                            } else {
                              setSelectedBranch(null);
                              setStep(6);
                            }
                          }}
                          className={`p-6 rounded-2xl border text-left flex flex-col justify-between h-36 transition-all duration-300 relative overflow-hidden group ${
                            selectedCourse === c._id
                              ? 'border-accent bg-accent/5 ring-2 ring-accent/15'
                              : 'border-border-primary bg-bg-secondary/60 hover:border-accent/40 hover:-translate-y-1 hover:bg-bg-secondary hover:shadow-lg'
                          }`}
                        >
                          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-accent/5 to-transparent rounded-bl-full pointer-events-none" />
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all ${
                            selectedCourse === c._id 
                              ? 'bg-accent text-white border-transparent' 
                              : 'bg-bg-primary border-border-primary text-text-secondary group-hover:text-accent group-hover:border-accent/35'
                          }`}>
                            <GraduationCap className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center justify-between">
                              <h4 className="font-display font-extrabold text-sm text-text-primary group-hover:text-accent transition-colors">{c.code}</h4>
                              {!c.isActive && (
                                <span className="text-[8px] font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 uppercase tracking-wide">Soon</span>
                              )}
                            </div>
                            <p className="text-[9px] text-text-muted mt-0.5">{c.name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 5: Branch Select */}
              {step === 5 && (
                <motion.div
                  key="step-branch"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="w-full"
                >
                  {loadingBranches ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-3">
                      <Loader2 className="w-8 h-8 text-accent animate-spin" />
                      <p className="text-xs text-text-secondary">Loading branches...</p>
                    </div>
                  ) : branches.length === 0 ? (
                    <div className="text-center py-8 px-6 rounded-2xl border border-dashed border-border-primary bg-bg-secondary/40 space-y-4 max-w-md mx-auto">
                      <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                      <p className="text-xs text-text-secondary leading-relaxed">
                        No branches are currently configured for this course.
                      </p>
                      <button 
                        onClick={goBack}
                        className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-hover transition-colors"
                      >
                        Go Back
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {branches.map((b) => {
                        const IconComponent = branchIconMap[b.code] || Layers;
                        return (
                          <button
                            key={b._id}
                            onClick={() => { setSelectedBranch(b._id); setStep(6); }}
                            className={`p-6 rounded-2xl border text-left flex flex-col justify-between h-36 transition-all duration-300 relative overflow-hidden group ${
                              selectedBranch === b._id
                                ? 'border-accent bg-accent/5 ring-2 ring-accent/15'
                                : 'border-border-primary bg-bg-secondary/60 hover:border-accent/40 hover:-translate-y-1 hover:bg-bg-secondary hover:shadow-lg'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all ${
                              selectedBranch === b._id ? 'bg-accent text-white border-transparent' : 'bg-bg-primary border-border-primary text-text-secondary group-hover:text-accent'
                            }`}>
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-display font-extrabold text-xs text-text-primary group-hover:text-accent leading-snug">{b.name}</h4>
                              <p className={`text-[9px] mt-0.5 font-bold ${b.isActive ? 'text-green-400' : 'text-amber-500'}`}>
                                {b.isActive ? '🟢 Active Syllabus' : '🟠 Coming Soon'}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 6: Semester Select */}
              {step === 6 && (
                <motion.div
                  key="step-semester"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-3.5"
                >
                  {(() => {
                    const courseObj = courses.find(c => c._id === selectedCourse);
                    const maxSem = courseObj ? courseObj.maxSemesters : 8;
                    const semArr = Array.from({ length: maxSem }, (_, i) => i + 1);
                    return semArr.map((sem) => (
                      <button
                        key={sem}
                        onClick={() => { setSelectedSemester(sem); setStep(7); }}
                        className={`p-5 rounded-2xl border text-center flex flex-col items-center justify-center space-y-2.5 transition-all duration-300 group ${
                          selectedSemester === sem
                            ? 'border-accent bg-accent/5 ring-2 ring-accent/15'
                            : 'border-border-primary bg-bg-secondary/60 hover:border-accent/40 hover:-translate-y-1 hover:bg-bg-secondary'
                        }`}
                      >
                        <span className="font-display font-black text-xl text-accent group-hover:scale-105 transition-transform">Sem {sem}</span>
                        <span className="text-[8px] text-text-muted font-semibold uppercase tracking-wider bg-bg-primary px-1.5 py-0.5 rounded">
                          {sem <= 2 ? '1st Yr' : sem <= 4 ? '2nd Yr' : sem <= 6 ? '3rd Yr' : '4th Yr'}
                        </span>
                      </button>
                    ));
                  })()}
                </motion.div>
              )}

              {/* Step 7: Initializing Loader & Migration */}
              {step === 7 && (
                <motion.div
                  key="step-completion"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-8 px-6 rounded-2xl border border-border-primary/80 bg-bg-secondary/40 backdrop-blur-md shadow-xl text-center space-y-6 max-w-sm mx-auto relative overflow-hidden"
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-accent/10 rounded-full blur-[30px] pointer-events-none animate-pulse" />

                  <div className="relative z-10 space-y-6">
                    <div className="w-12 h-12 rounded-xl bg-accent/5 border border-accent/25 flex items-center justify-center text-accent mx-auto">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="font-display font-extrabold text-base text-text-primary">Aligning Syllabus Trees</h3>
                      <p className="text-xs text-text-secondary leading-relaxed max-w-[240px] mx-auto">
                        Preparing your personalized university preparation path and migrating guest logs.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-border-primary/40 text-left space-y-2.5">
                      <div className="flex items-center space-x-2.5 text-xs text-text-secondary">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 stroke-[2.5px] animate-bounce" />
                        <span>Registered as B.Tech student</span>
                      </div>
                      <div className="flex items-center space-x-2.5 text-xs text-text-secondary">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 stroke-[2.5px] animate-bounce" />
                        <span>Syllabus mapped for Sem {selectedSemester}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer status bar */}
      <footer className="border-t border-border-primary/50 bg-bg-secondary/20 py-4 text-center text-xs text-text-secondary transition-colors duration-300">
        <p>Onboarding Profile: {name || 'Anonymous'} {selectedUniversity ? `• Univ` : ''} {selectedCollege ? `• College` : ''} {selectedCourse ? `• Course` : ''} {selectedBranch ? `• Branch` : ''} {selectedSemester ? `• Sem ${selectedSemester}` : ''}</p>
      </footer>
    </div>
  );
}
