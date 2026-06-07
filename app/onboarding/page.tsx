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
  ArrowRight,
  Search,
  Sparkles,
  User,
  Check,
  Award,
  Layers3,
  Calendar,
  BookOpen,
  Download
} from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';

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

  // Prevent flash/bypass of onboarding page before auth loads or if unauthenticated
  if (loading || !fbUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-secondary">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-sm">Securing session...</p>
        </div>
      </div>
    );
  }

  const [step, setStep] = useState<number>(1);
  const [direction, setDirection] = useState<number>(1);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  
  const [selectedUniversity, setSelectedUniversity] = useState<string | null>(null);
  const [selectedCollege, setSelectedCollege] = useState<string | null>(null);
  const [customCollegeName, setCustomCollegeName] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search states for filtering lists
  const [universitySearch, setUniversitySearch] = useState('');
  const [collegeSearch, setCollegeSearch] = useState('');

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

  // Generate a deterministic unique barcode array based on user's name and UID
  const getBarcodeBars = () => {
    const seed = `${fbUser?.uid || 'MEMBER'}${name}`;
    const bars: number[] = [];
    for (let i = 0; i < seed.length; i++) {
      const code = seed.charCodeAt(i);
      // Map charCode to a deterministic bar width (e.g., 1px, 2px, 3px)
      bars.push((code % 3) + 1);
      bars.push(((code >> 1) % 3) + 1);
    }
    // Pad barcode to have exactly 24 bars for layout consistency
    while (bars.length < 24) {
      bars.push(1, 2, 1, 3);
    }
    return bars.slice(0, 24);
  };

  // Unique Student Identification string based on DB ID
  const studentIdNumber = fbUser?.uid 
    ? `PH-2026-${fbUser.uid.substring(fbUser.uid.length - 6).toUpperCase()}` 
    : 'PH-2026-MEMBER';

  // Download ID card as PNG using html2canvas
  const downloadIdCard = async () => {
    const card = document.getElementById('student-id-card');
    if (!card) return;

    try {
      const html2canvasModule = await import('html2canvas');
      const canvas = await html2canvasModule.default(card, {
        useCORS: true,
        scale: 3, // Premium quality scaling
        backgroundColor: null,
        logging: false
      });
      
      const link = document.createElement('a');
      link.download = `paperhub-id-${name.toLowerCase().replace(/\s+/g, '-') || 'member'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to export ID Card image:', err);
    }
  };

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
    if (!loading && !fbUser) {
      router.push('/login');
    }
  }, [fbUser, loading, router]);

  // Load existing profile name if available in auth user
  useEffect(() => {
    if (fbUser && fbUser.displayName && !name) {
      setName(fbUser.displayName);
    }
  }, [fbUser, name]);

  // Fetch Universities on step 3 load
  useEffect(() => {
    if (fbUser && step === 3 && universities.length === 0) {
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

  // Fetch Colleges on step 4 load
  useEffect(() => {
    if (selectedUniversity && step === 4) {
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

  // Fetch Courses on step 5 load
  useEffect(() => {
    if (selectedUniversity && step === 5) {
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

  // Fetch Branches on step 6 load
  useEffect(() => {
    if (selectedCourse && step === 6) {
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
            gender,
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
      setStep(7); // Return to semester select so they can try again
      setSavingOnboarding(false);
    }
  };

  // Trigger complete action on final step transition
  useEffect(() => {
    if (step === 8) {
      handleOnboardingComplete();
    }
  }, [step]);

  const canProceed = (): boolean => {
    if (step === 1) return name.trim().length >= 2;
    if (step === 2) return gender !== null;
    if (step === 3) return selectedUniversity !== null;
    if (step === 4) {
      if (selectedCollege === 'custom') {
        return customCollegeName.trim().length >= 3;
      }
      return selectedCollege !== null;
    }
    if (step === 5) return selectedCourse !== null;
    if (step === 6) return selectedBranch !== null;
    if (step === 7) return selectedSemester !== null;
    return false;
  };

  const goNext = () => {
    if (!canProceed()) return;
    setDirection(1);
    if (step === 5) {
      const courseObj = courses.find(c => c._id === selectedCourse);
      if (courseObj && !courseObj.isBranchRequired) {
        setSelectedBranch(null);
        setStep(7); // Skip Branch selection and go directly to Semester
        return;
      }
    }
    setStep(s => s + 1);
  };

  const goBack = () => {
    setDirection(-1);
    if (step === 7) {
      const courseObj = courses.find(c => c._id === selectedCourse);
      if (courseObj && !courseObj.isBranchRequired) {
        setStep(5); // Go back to course, skipping branch
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
        return { title: 'What should we call you?', subtitle: 'Enter your name to personalize your premium study suite.' };
      case 2:
        return { title: 'Select your Gender', subtitle: 'This configures your default student profile avatar.' };
      case 3:
        return { title: 'Select your University', subtitle: 'This configures syllabus guidelines and exam blueprints.' };
      case 4:
        return { title: 'Select your College', subtitle: 'This links your studies with your campus ecosystem.' };
      case 5:
        return { title: 'What is your Course / Degree?', subtitle: 'Select your target higher education program.' };
      case 6:
        return { title: 'Select your Branch / Stream', subtitle: 'Choose your academic specialization.' };
      case 7:
        return { title: 'Select Current Semester', subtitle: 'Allows grouping your studies for this term.' };
      case 8:
        return { title: 'Initializing Ecosystem', subtitle: 'Preparing your personalized university preparation path.' };
      default:
        return { title: '', subtitle: '' };
    }
  };

  const info = getHeaderInfo();

  // Find codes to display on the live Student ID preview card
  const selectedUnivObj = universities.find(u => u._id === selectedUniversity);
  const selectedColObj = selectedCollege === 'custom' 
    ? { name: customCollegeName, code: 'CUST' } 
    : colleges.find(c => c._id === selectedCollege);
  const selectedCourseObj = courses.find(c => c._id === selectedCourse);
  const selectedBranchObj = branches.find(b => b._id === selectedBranch);

  // Filter lists based on search
  const filteredUniversities = universities.filter(univ => 
    univ.name.toLowerCase().includes(universitySearch.toLowerCase()) || 
    univ.code.toLowerCase().includes(universitySearch.toLowerCase())
  );

  const filteredColleges = colleges.filter(col => 
    col.name.toLowerCase().includes(collegeSearch.toLowerCase()) || 
    col.code.toLowerCase().includes(collegeSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col justify-between relative transition-colors duration-300 bg-bg-primary text-text-primary overflow-x-hidden">
      {/* Background ambient glowing gradient spheres */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="border-b border-border-primary/40 bg-bg-primary/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {step > 1 && step <= 7 && (
              <button 
                onClick={goBack} 
                className="p-2.5 rounded-xl border border-border-primary bg-bg-secondary/40 hover:bg-bg-tertiary hover:scale-95 transition-all text-text-secondary flex items-center justify-center"
                aria-label="Go Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <Link href="/" className="flex items-center space-x-3 group">
              <span className="font-display font-black text-xl tracking-tight text-text-primary">PaperHub</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-accent font-bold uppercase tracking-wider">Onboarding</span>
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Split Layout */}
      <main className="flex-grow flex items-center justify-center py-10 px-6 relative z-10">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* LEFT SIDEBAR: Live Student ID Card & Timeline Selection (Desktop only) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col space-y-8 sticky top-24">
            <div className="space-y-3">
              <h2 className="font-display text-xl font-black text-text-primary tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent animate-pulse" />
                <span>Academic Blueprint</span>
              </h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                Watch your university identity card populate in real-time as you complete each onboarding step.
              </p>
            </div>

            {/* Premium Dynamic Student ID Card */}
            <div className="relative group perspective-1000">
              {/* Card glowing halo */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-purple-500/20 rounded-3xl blur-2xl opacity-60 group-hover:opacity-90 transition-opacity duration-500" />
              
              {/* Actual card structure */}
              <div 
                id="student-id-card"
                className="w-full aspect-[1.58/1] rounded-3xl border border-border-primary/60 p-6 flex flex-col justify-between relative overflow-hidden shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:-rotate-1"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--bg-secondary)) 0%, hsl(var(--bg-primary)) 100%)',
                }}
              >
                
                {/* Glow effects inside the card */}
                <div className="absolute -right-20 -top-20 w-44 h-44 bg-accent/20 rounded-full blur-[40px] pointer-events-none" />
                <div className="absolute -left-20 -bottom-20 w-44 h-44 bg-purple-500/10 rounded-full blur-[40px] pointer-events-none" />

                {/* Card Top: Branding & Microchip */}
                <div className="flex justify-between items-start z-10">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-accent tracking-[0.2em] uppercase">PaperHub Member</span>
                    <span className="text-[8px] font-bold text-text-muted mt-0.5">EST. 2026</span>
                  </div>
                  {/* Card Microchip */}
                  <div className="w-9 h-7 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg relative overflow-hidden opacity-90 border border-amber-300/30 shadow-sm">
                    <div className="absolute inset-x-0 top-1/2 h-[1px] bg-amber-800/30" />
                    <div className="absolute inset-y-0 left-1/2 w-[1px] bg-amber-800/30" />
                    <div className="absolute top-1.5 left-1.5 w-6 h-4 border border-amber-900/15 rounded-sm" />
                  </div>
                </div>

                {/* Card Middle: Name & Barcode */}
                <div className="z-10 my-4 flex justify-between items-end">
                  <div className="space-y-1">
                    <div className="text-[10px] text-text-muted font-bold tracking-wider uppercase font-mono leading-normal pb-0.5">Student Name</div>
                    <div className="text-xl font-extrabold tracking-tight text-text-primary capitalize whitespace-nowrap overflow-hidden text-ellipsis block pb-1.5 leading-normal">
                      {name.trim() || 'Your Name'}
                    </div>
                  </div>
                  {/* Digital Barcode mockup */}
                  <div className="flex flex-col items-end">
                    <div className="flex items-center space-x-[1.5px] opacity-75 dark:opacity-50">
                      {getBarcodeBars().map((w, idx) => (
                        <div key={idx} className="h-5 bg-text-primary" style={{ width: `${w}px` }} />
                      ))}
                    </div>
                    <span className="text-[7px] text-text-muted mt-1 font-mono tracking-widest uppercase">
                      {studentIdNumber}
                    </span>
                  </div>
                </div>

                {/* Card Footer: University/Academic details */}
                <div className="pt-3 border-t border-border-primary/50 flex justify-between items-center z-10">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[9px] w-full">
                    <div>
                      <span className="text-text-muted block font-semibold leading-normal pb-0.5">UNIVERSITY</span>
                      <span className="font-bold text-text-primary uppercase tracking-wide truncate max-w-[120px] block pb-1 leading-normal">
                        {selectedUnivObj?.code || 'Not Set'}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block font-semibold leading-normal pb-0.5">COLLEGE</span>
                      <span className="font-bold text-text-primary uppercase tracking-wide truncate max-w-[120px] block pb-1 leading-normal">
                        {selectedColObj?.code || 'Not Set'}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block font-semibold leading-normal pb-0.5">COURSE</span>
                      <span className="font-bold text-text-primary uppercase tracking-wide truncate max-w-[120px] block pb-1 leading-normal">
                        {selectedCourseObj?.code || 'Not Set'}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block font-semibold leading-normal pb-0.5">BRANCH & SEM</span>
                      <span className="font-bold text-text-primary uppercase tracking-wide truncate max-w-[120px] block pb-1 leading-normal">
                        {selectedBranchObj ? `${selectedBranchObj.code}` : 'No Branch'}
                        {selectedSemester ? ` • Sem ${selectedSemester}` : ''}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Interactive Download ID Card Button */}
            <div className="w-full max-w-sm mx-auto">
              <button
                onClick={downloadIdCard}
                disabled={!name.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-bg-secondary/50 border border-border-primary hover:border-accent hover:text-accent font-bold text-xs transition-all flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Download ID Card</span>
              </button>
            </div>

            {/* Summary Checkpoints list */}
            <div className="bg-bg-secondary/30 rounded-2xl border border-border-primary/40 p-5 space-y-4">
              <span className="text-[10px] font-bold text-text-muted tracking-widest uppercase block">Completed Blueprint Details</span>
              <div className="space-y-2.5">
                {[
                  { label: 'Display Name', value: name, done: name.trim().length >= 2 },
                  { label: 'Gender', value: gender === 'male' ? 'Male' : 'Female', done: !!gender },
                  { label: 'Selected University', value: selectedUnivObj?.name, done: !!selectedUniversity },
                  { label: 'Campus/College', value: selectedColObj?.name, done: !!selectedCollege },
                  { label: 'Target Program', value: selectedCourseObj?.name, done: !!selectedCourse },
                  { label: 'Academic Stream', value: selectedBranchObj?.name || (selectedCourseObj && !selectedCourseObj.isBranchRequired ? 'Bypassed' : null), done: !!selectedBranch || (selectedCourseObj && !selectedCourseObj.isBranchRequired) },
                  { label: 'Current Semester', value: selectedSemester ? `Semester ${selectedSemester}` : null, done: !!selectedSemester }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-0.5 border-b border-border-primary/20 last:border-none">
                    <span className="text-text-secondary">{item.label}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-text-primary font-bold text-[11px] truncate max-w-[140px] text-right">{item.value || 'Pending...'}</span>
                      {item.done ? (
                        <Check className="w-3.5 h-3.5 text-green-500 stroke-[3px]" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-border-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: The Interactive Glass Wizard Card */}
          <div className="col-span-1 lg:col-span-7 flex flex-col justify-center">
            
            {/* Stepper Progress Bar */}
            {step < 8 && (
              <div className="w-full max-w-xl mx-auto mb-6 px-1">
                <div className="h-1.5 w-full bg-border-primary/40 rounded-full overflow-hidden relative shadow-inner">
                  <motion.div 
                    className="h-full bg-accent"
                    initial={{ width: '10%' }}
                    animate={{ width: `${(step / 7) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 15 }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-text-muted mt-2 font-mono uppercase tracking-wider font-extrabold">
                  <span>Step {step} of 7</span>
                  <span>{Math.round((step / 7) * 100)}% Complete</span>
                </div>
              </div>
            )}

            {/* Wizard Headers */}
            {step < 8 && (
              <div className="text-center lg:text-left mb-6 max-w-xl mx-auto lg:mx-0">
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 text-text-primary leading-tight">
                  {info.title}
                </h1>
                <p className="text-xs text-text-secondary max-w-md leading-relaxed">
                  {info.subtitle}
                </p>
              </div>
            )}

            {/* Main Form Glass Card */}
            <div className="bg-bg-secondary/40 backdrop-blur-2xl border border-border-primary/50 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden max-w-2xl mx-auto w-full min-h-[380px] flex flex-col justify-between">
              
              {/* Card top border glow line */}
              <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

              <div className="relative z-10 flex-grow flex flex-col justify-center">
                {errorMsg && (
                  <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-xs flex items-start space-x-2.5 max-w-md mx-auto mb-6">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{errorMsg}</p>
                  </div>
                )}

                <AnimatePresence mode="wait" custom={direction}>
                  
                  {/* STEP 1: Enter Name */}
                  {step === 1 && (
                    <motion.div
                      key="step-name"
                      custom={direction}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      variants={{
                        enter: (dir: number) => ({ x: dir * 50, opacity: 0 }),
                        center: { x: 0, opacity: 1 },
                        exit: (dir: number) => ({ x: dir * -50, opacity: 0 })
                      }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      className="space-y-6 max-w-md mx-auto w-full"
                    >
                      <div className="w-20 h-20 mx-auto flex items-center justify-center relative bg-accent/5 border border-accent/15 rounded-2xl shadow-inner">
                        <User className="w-10 h-10 text-accent" />
                        <div className="absolute top-10 left-10 w-10 h-10 bg-accent/20 rounded-full blur-[12px] animate-pulse" />
                      </div>

                      <div className="space-y-4">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Type your name..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && canProceed() && goNext()}
                            className="w-full text-center px-4 py-3.5 rounded-xl border border-border-primary bg-bg-primary/50 focus:border-accent font-display text-base font-bold transition-all outline-none"
                            autoFocus
                          />
                        </div>

                        {name.trim().length >= 2 && (
                          <motion.p 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center text-xs text-accent font-bold"
                          >
                            Welcome to the platform, {name}! Let's customize your studies.
                          </motion.p>
                        )}

                        <button
                          onClick={goNext}
                          disabled={!canProceed()}
                          className="w-full py-3.5 px-4 rounded-xl bg-accent text-white text-xs font-bold transition-all flex items-center justify-center space-x-2 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
                        >
                          <span>Continue Onboarding</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2: Gender Select */}
                  {step === 2 && (
                    <motion.div
                      key="step-gender"
                      custom={direction}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      variants={{
                        enter: (dir: number) => ({ x: dir * 50, opacity: 0 }),
                        center: { x: 0, opacity: 1 },
                        exit: (dir: number) => ({ x: dir * -50, opacity: 0 })
                      }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      className="space-y-6 w-full max-w-md mx-auto"
                    >
                      <div className="grid grid-cols-2 gap-6">
                        <button
                          type="button"
                          onClick={() => { setGender('male'); setDirection(1); setStep(3); }}
                          className={`p-6 rounded-2xl border flex flex-col items-center justify-center gap-4 transition-all duration-300 group ${
                            gender === 'male'
                              ? 'border-accent bg-accent/5 ring-2 ring-accent/10 scale-[1.02]'
                              : 'border-border-primary bg-bg-primary/30 hover:border-accent/40 hover:-translate-y-1 hover:bg-bg-primary/50'
                          }`}
                        >
                          <UserAvatar gender="male" className="w-20 h-20" />
                          <span className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors">Male</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setGender('female'); setDirection(1); setStep(3); }}
                          className={`p-6 rounded-2xl border flex flex-col items-center justify-center gap-4 transition-all duration-300 group ${
                            gender === 'female'
                              ? 'border-accent bg-accent/5 ring-2 ring-accent/10 scale-[1.02]'
                              : 'border-border-primary bg-bg-primary/30 hover:border-accent/40 hover:-translate-y-1 hover:bg-bg-primary/50'
                          }`}
                        >
                          <UserAvatar gender="female" className="w-20 h-20" />
                          <span className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors">Female</span>
                        </button>
                      </div>

                      <button
                        onClick={goNext}
                        disabled={!canProceed()}
                        className="w-full py-3.5 px-4 rounded-xl bg-accent text-white text-xs font-bold transition-all flex items-center justify-center space-x-2 hover:-translate-y-0.5"
                      >
                        <span>Continue Onboarding</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}

                  {/* STEP 3: University Select */}
                  {step === 3 && (
                    <motion.div
                      key="step-university"
                      custom={direction}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      variants={{
                        enter: (dir: number) => ({ x: dir * 50, opacity: 0 }),
                        center: { x: 0, opacity: 1 },
                        exit: (dir: number) => ({ x: dir * -50, opacity: 0 })
                      }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      className="space-y-4 w-full"
                    >
                      {/* Search Bar */}
                      <div className="relative max-w-md mx-auto w-full mb-3">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                          type="text"
                          placeholder="Search university (e.g. AKTU, HBTU)..."
                          value={universitySearch}
                          onChange={(e) => setUniversitySearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border-primary bg-bg-primary/50 focus:border-accent outline-none text-sm text-text-primary placeholder:text-text-muted/60 transition-all"
                        />
                      </div>

                      {loadingUniversities ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-3">
                          <Loader2 className="w-8 h-8 text-accent animate-spin" />
                          <p className="text-xs text-text-secondary">Loading university directory...</p>
                        </div>
                      ) : filteredUniversities.length === 0 ? (
                        <div className="text-center py-10 text-text-secondary text-xs">
                          No active universities found matching your search.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-1">
                          {filteredUniversities.map((univ) => (
                            <button
                              key={univ._id}
                              onClick={() => { setSelectedUniversity(univ._id); setDirection(1); setStep(3); }}
                              className={`p-4 rounded-xl border text-left flex items-start justify-between group transition-all duration-300 relative overflow-hidden ${
                                selectedUniversity === univ._id
                                  ? 'border-accent bg-accent/5 ring-2 ring-accent/10'
                                  : 'border-border-primary bg-bg-primary/30 hover:border-accent/40 hover:-translate-y-0.5 hover:bg-bg-primary/60'
                              }`}
                            >
                              <div className="flex items-start space-x-3.5">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all duration-300 ${
                                  selectedUniversity === univ._id
                                    ? 'bg-accent text-white border-transparent'
                                    : 'bg-accent/5 border-accent/10 text-accent group-hover:bg-accent group-hover:text-white'
                                }`}>
                                  <GraduationCap className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <h3 className="font-display font-bold text-text-primary text-xs group-hover:text-accent transition-colors truncate max-w-[280px]">
                                      {univ.name}
                                    </h3>
                                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary font-bold uppercase tracking-wider">{univ.code}</span>
                                  </div>
                                  <p className="text-[9px] text-text-secondary mt-1 flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                                    <span>Curriculum and syllabi verified</span>
                                  </p>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-text-muted mt-2 group-hover:text-accent group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* STEP 4: College Select */}
                  {step === 4 && (
                    <motion.div
                      key="step-college"
                      custom={direction}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      variants={{
                        enter: (dir: number) => ({ x: dir * 50, opacity: 0 }),
                        center: { x: 0, opacity: 1 },
                        exit: (dir: number) => ({ x: dir * -50, opacity: 0 })
                      }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      className="space-y-4 w-full"
                    >
                      {selectedCollege === 'custom' ? (
                        <div className="space-y-4 p-5 rounded-2xl border border-border-primary bg-bg-primary/50 max-w-md mx-auto">
                          <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider">College Name</label>
                            <input
                              type="text"
                              placeholder="Enter your college's full name"
                              value={customCollegeName}
                              onChange={(e) => setCustomCollegeName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && canProceed() && setStep(4)}
                              className="w-full px-4 py-3 rounded-xl border border-border-primary bg-bg-primary focus:border-accent text-sm transition-colors outline-none"
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
                              className="px-5 py-2.5 rounded-xl bg-accent text-white text-xs font-bold transition-all disabled:opacity-50"
                            >
                              Register College
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Search Bar */}
                          <div className="relative max-w-md mx-auto w-full mb-3">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input
                              type="text"
                              placeholder="Search college (e.g. IET, campus)..."
                              value={collegeSearch}
                              onChange={(e) => setCollegeSearch(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border-primary bg-bg-primary/50 focus:border-accent outline-none text-sm text-text-primary placeholder:text-text-muted/60 transition-all"
                            />
                          </div>

                          {loadingColleges ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-3">
                              <Loader2 className="w-8 h-8 text-accent animate-spin" />
                              <p className="text-xs text-text-secondary">Loading affiliated colleges...</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-3 max-h-[260px] overflow-y-auto pr-1">
                              {filteredColleges.map((col) => (
                                <button
                                  key={col._id}
                                  onClick={() => { setSelectedCollege(col._id); setDirection(1); setStep(4); }}
                                  className={`p-4 rounded-xl border text-left flex items-start justify-between group transition-all duration-300 relative overflow-hidden ${
                                    selectedCollege === col._id
                                      ? 'border-accent bg-accent/5 ring-2 ring-accent/10'
                                      : 'border-border-primary bg-bg-primary/30 hover:border-accent/40 hover:-translate-y-0.5 hover:bg-bg-primary/60'
                                  }`}
                                >
                                  <div className="flex items-start space-x-3.5">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all duration-300 ${
                                      selectedCollege === col._id
                                        ? 'bg-accent text-white border-transparent'
                                        : 'bg-accent/5 border-accent/10 text-accent group-hover:bg-accent group-hover:text-white'
                                    }`}>
                                      <GraduationCap className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <div className="flex items-center space-x-2">
                                        <h3 className="font-display font-bold text-text-primary text-xs group-hover:text-accent transition-colors truncate max-w-[280px]">
                                          {col.name}
                                        </h3>
                                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary font-bold uppercase tracking-wider">{col.code}</span>
                                      </div>
                                      <p className="text-[9px] text-text-secondary mt-1 flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                                        <span>Official PYQs integrated</span>
                                      </p>
                                    </div>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-text-muted mt-2 group-hover:text-accent group-hover:translate-x-0.5 transition-transform" />
                                </button>
                              ))}

                              {/* Custom College Option */}
                              <button
                                onClick={() => setSelectedCollege('custom')}
                                className="p-4 rounded-xl border border-dashed border-accent/30 text-left flex items-start justify-between group transition-all duration-300 bg-accent/5 hover:bg-accent/10"
                              >
                                <div className="flex items-start space-x-3.5">
                                  <div className="w-9 h-9 rounded-lg flex items-center justify-center border bg-accent/10 border-accent/20 text-accent">
                                    <PlusCollegeIcon className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h3 className="font-display font-bold text-text-primary text-xs group-hover:text-accent transition-colors">
                                      My college is not listed
                                    </h3>
                                    <p className="text-[9px] text-text-secondary mt-0.5">
                                      Request addition and proceed with studies instantly.
                                    </p>
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-accent mt-2 group-hover:translate-x-0.5 transition-transform" />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </motion.div>
                  )}

                  {/* STEP 5: Course Select */}
                  {step === 5 && (
                    <motion.div
                      key="step-course"
                      custom={direction}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      variants={{
                        enter: (dir: number) => ({ x: dir * 50, opacity: 0 }),
                        center: { x: 0, opacity: 1 },
                        exit: (dir: number) => ({ x: dir * -50, opacity: 0 })
                      }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      className="space-y-4 w-full"
                    >
                      {loadingCourses ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-3">
                          <Loader2 className="w-8 h-8 text-accent animate-spin" />
                          <p className="text-xs text-text-secondary">Loading courses...</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
                          {courses.map((c) => (
                            <button
                              key={c._id}
                              onClick={() => { 
                                setSelectedCourse(c._id); 
                                setDirection(1);
                                if (c.isBranchRequired) {
                                  setStep(5); 
                                } else {
                                  setSelectedBranch(null);
                                  setStep(6);
                                }
                              }}
                              className={`p-5 rounded-2xl border text-left flex flex-col justify-between h-32 transition-all duration-300 relative overflow-hidden group ${
                                selectedCourse === c._id
                                  ? 'border-accent bg-accent/5 ring-2 ring-accent/10'
                                  : 'border-border-primary bg-bg-primary/30 hover:border-accent/40 hover:-translate-y-1 hover:bg-bg-primary/60 hover:shadow-lg'
                              }`}
                            >
                              <div className="absolute top-0 right-0 w-14 h-14 bg-gradient-to-br from-accent/5 to-transparent rounded-bl-full pointer-events-none" />
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                                selectedCourse === c._id 
                                  ? 'bg-accent text-white border-transparent' 
                                  : 'bg-bg-secondary border-border-primary text-text-secondary group-hover:text-accent'
                              }`}>
                                <BookOpen className="w-4 h-4" />
                              </div>
                              <div className="mt-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-display font-extrabold text-sm text-text-primary group-hover:text-accent transition-colors">{c.code}</h4>
                                  {!c.isActive && (
                                    <span className="text-[8px] font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 uppercase tracking-wide">Soon</span>
                                  )}
                                </div>
                                <p className="text-[9px] text-text-muted mt-0.5 truncate max-w-[200px]">{c.name}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* STEP 6: Branch Select */}
                  {step === 6 && (
                    <motion.div
                      key="step-branch"
                      custom={direction}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      variants={{
                        enter: (dir: number) => ({ x: dir * 50, opacity: 0 }),
                        center: { x: 0, opacity: 1 },
                        exit: (dir: number) => ({ x: dir * -50, opacity: 0 })
                      }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      className="w-full space-y-4"
                    >
                      {loadingBranches ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-3">
                          <Loader2 className="w-8 h-8 text-accent animate-spin" />
                          <p className="text-xs text-text-secondary">Loading streams...</p>
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
                          {branches.map((b) => {
                            const IconComponent = branchIconMap[b.code] || Layers3;
                            return (
                              <button
                                key={b._id}
                                onClick={() => { setSelectedBranch(b._id); setDirection(1); setStep(6); }}
                                className={`p-5 rounded-2xl border text-left flex flex-col justify-between h-32 transition-all duration-300 relative overflow-hidden group ${
                                  selectedBranch === b._id
                                    ? 'border-accent bg-accent/5 ring-2 ring-accent/10'
                                    : 'border-border-primary bg-bg-primary/30 hover:border-accent/40 hover:-translate-y-1 hover:bg-bg-primary/60 hover:shadow-lg'
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                                  selectedBranch === b._id ? 'bg-accent text-white border-transparent' : 'bg-bg-secondary border-border-primary text-text-secondary group-hover:text-accent'
                                }`}>
                                  <IconComponent className="w-4 h-4" />
                                </div>
                                <div className="mt-2">
                                  <h4 className="font-display font-extrabold text-xs text-text-primary group-hover:text-accent leading-tight line-clamp-1">{b.name}</h4>
                                  <p className="text-[9px] mt-1 font-bold flex items-center gap-1.5 text-text-secondary">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                                    <span>Active Syllabus</span>
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* STEP 7: Semester Select */}
                  {step === 7 && (
                    <motion.div
                      key="step-semester"
                      custom={direction}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      variants={{
                        enter: (dir: number) => ({ x: dir * 50, opacity: 0 }),
                        center: { x: 0, opacity: 1 },
                        exit: (dir: number) => ({ x: dir * -50, opacity: 0 })
                      }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full"
                    >
                      {(() => {
                        const courseObj = courses.find(c => c._id === selectedCourse);
                        const maxSem = courseObj ? courseObj.maxSemesters : 8;
                        const semArr = Array.from({ length: maxSem }, (_, i) => i + 1);
                        return semArr.map((sem) => (
                          <button
                            key={sem}
                            onClick={() => { setSelectedSemester(sem); setDirection(1); setStep(7); }}
                            className={`p-4 rounded-xl border text-center flex flex-col items-center justify-center space-y-2.5 transition-all duration-300 group ${
                              selectedSemester === sem
                                ? 'border-accent bg-accent/5 ring-2 ring-accent/10'
                                : 'border-border-primary bg-bg-primary/30 hover:border-accent/40 hover:-translate-y-1 hover:bg-bg-primary/60'
                            }`}
                          >
                            <Calendar className="w-5 h-5 text-accent opacity-75 group-hover:scale-110 transition-transform duration-200" />
                            <span className="font-display font-black text-base text-text-primary">Sem {sem}</span>
                            <span className="text-[7px] text-text-muted font-extrabold uppercase tracking-wider bg-bg-secondary px-2 py-0.5 rounded-full">
                              {sem <= 2 ? '1st Yr' : sem <= 4 ? '2nd Yr' : sem <= 6 ? '3rd Yr' : '4th Yr'}
                            </span>
                          </button>
                        ));
                      })()}
                    </motion.div>
                  )}

                  {/* STEP 8: Initializing Ecosystem Loader */}
                  {step === 8 && (
                    <motion.div
                      key="step-completion"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center space-y-6 w-full py-4 relative"
                    >
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 bg-accent/10 rounded-full blur-[40px] pointer-events-none animate-pulse" />

                      <div className="relative z-10 space-y-6 max-w-sm mx-auto">
                        <div className="w-14 h-14 rounded-2xl bg-accent/5 border border-accent/25 flex items-center justify-center text-accent mx-auto shadow-inner">
                          <Loader2 className="w-7 h-7 animate-spin" />
                        </div>

                        <div className="space-y-2">
                          <h3 className="font-display font-black text-lg text-text-primary tracking-tight">Compiling Syllabus Blueprint</h3>
                          <p className="text-xs text-text-secondary leading-relaxed max-w-[260px] mx-auto">
                            Customizing exam branches and synchronizing active study documents.
                          </p>
                        </div>

                        <div className="pt-5 border-t border-border-primary/45 text-left space-y-3">
                          <div className="flex items-center space-x-3 text-xs text-text-secondary">
                            <div className="w-5 h-5 rounded-full bg-green-500/10 border border-green-500/25 flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3 text-green-500 stroke-[3px]" />
                            </div>
                            <span>Registered: {selectedCourseObj?.code} Student</span>
                          </div>
                          <div className="flex items-center space-x-3 text-xs text-text-secondary">
                            <div className="w-5 h-5 rounded-full bg-green-500/10 border border-green-500/25 flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3 text-green-500 stroke-[3px]" />
                            </div>
                            <span>Syllabus mapped for Semester {selectedSemester}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* Card Footer Control panel */}
              {step < 8 && (
                <div className="mt-8 pt-5 border-t border-border-primary/40 flex justify-between items-center gap-4">
                  {/* Previous button */}
                  <div>
                    {step > 1 && (
                      <button
                        onClick={goBack}
                        className="px-5 py-2.5 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary hover:border-border-primary/80 text-text-secondary hover:text-text-primary text-xs font-extrabold flex items-center space-x-2 transition-all hover:scale-95 active:scale-90"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Previous</span>
                      </button>
                    )}
                    {step === 1 && (
                      <div /> /* spacer */
                    )}
                  </div>

                  {/* Step dots indicator */}
                  <div className="flex space-x-1">
                    {Array.from({ length: 7 }).map((_, idx) => (
                      <div 
                        key={idx} 
                        className={`h-1 rounded-full transition-all duration-300 ${
                          idx + 1 === step 
                            ? 'w-4 bg-accent' 
                            : idx + 1 < step 
                            ? 'w-1.5 bg-accent/40' 
                            : 'w-1.5 bg-border-primary/60'
                        }`} 
                      />
                    ))}
                  </div>

                  {/* Next button */}
                  <div>
                    {step > 1 && (
                      <button
                        onClick={goNext}
                        disabled={!canProceed()}
                        className="px-5 py-2.5 rounded-xl bg-accent text-white text-xs font-extrabold flex items-center space-x-2 transition-all hover:scale-95 active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        <span>Next</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                    {step === 1 && (
                      <div /> /* spacer — step 1 uses its own inline CTA button */
                    )}
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      </main>

      {/* Footer bottom details bar */}
      <footer className="border-t border-border-primary/40 bg-bg-secondary/10 py-4 text-center text-xs text-text-secondary transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>Onboarding Profile: <span className="font-semibold text-text-primary capitalize">{name || 'Anonymous'}</span> {selectedUnivObj ? `• ${selectedUnivObj.code}` : ''} {selectedColObj ? `• ${selectedColObj.code}` : ''} {selectedCourseObj ? `• ${selectedCourseObj.code}` : ''} {selectedBranchObj ? `• ${selectedBranchObj.code}` : ''} {selectedSemester ? `• Sem ${selectedSemester}` : ''}</p>
          <p className="text-[10px] text-text-muted">PaperHub Study Suite © 2026. All syllabus details are verified.</p>
        </div>
      </footer>
    </div>
  );
}

// Plus College icon inline helper component
function PlusCollegeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={2.5} 
      stroke="currentColor" 
      className={props.className}
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}
