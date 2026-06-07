'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Navbar } from '@/components/navbar';
import { useAuth } from '@/components/auth-provider';
import { 
  User as UserIcon, 
  Settings, 
  CreditCard, 
  Calendar, 
  HelpCircle, 
  CheckCircle2, 
  Target, 
  Compass, 
  Loader2, 
  ChevronRight,
  Flame,
  Zap,
  TrendingUp,
  X,
  Download,
  GraduationCap,
  BookOpen,
  Atom,
  Sigma,
  Network,
  Monitor,
  Code,
  Rocket,
  Edit2,
  AlertCircle,
  Clock,
  Flag,
  Cpu,
  AlertTriangle,
  XCircle,
  MessageSquare,
  Users,
  Globe,
  Activity,
  Database,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserAvatar } from '@/components/user-avatar';

export default function ProfilePage() {
  const { user, fbUser, loading: authLoading } = useAuth();
  const router = useRouter();

  // Client-side authentication & authorization redirect guard
  useEffect(() => {
    if (!authLoading) {
      if (!fbUser) {
        router.push('/login');
      } else if (fbUser && user && user.role === 'student' && !user.onboardingCompleted) {
        router.push('/onboarding');
      }
    }
  }, [user, fbUser, authLoading, router]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [localCollege, setLocalCollege] = useState<string | null>(null);
  const [localBranch, setLocalBranch] = useState<string | null>(null);
  const [showIdModal, setShowIdModal] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [staffStats, setStaffStats] = useState<any>(null);
  const [loadingStaffStats, setLoadingStaffStats] = useState(false);

  // Edit Profile States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editGender, setEditGender] = useState<'male' | 'female' | 'other'>('male');
  const [editUniversityId, setEditUniversityId] = useState<string>('');
  const [editCollegeId, setEditCollegeId] = useState<string>('');
  const [editCourseId, setEditCourseId] = useState<string>('');
  const [editBranchId, setEditBranchId] = useState<string>('');
  const [editSemester, setEditSemester] = useState<number>(1);

  const [univList, setUnivList] = useState<any[]>([]);
  const [collList, setCollList] = useState<any[]>([]);
  const [courseList, setCourseList] = useState<any[]>([]);
  const [branchList, setBranchList] = useState<any[]>([]);

  const [loadingUnivs, setLoadingUnivs] = useState(false);
  const [loadingColls, setLoadingColls] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editError, setEditError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { refreshProfile } = useAuth();

  const fetchCollegesAndCourses = async (univId: string, initialCollegeId = '', initialCourseId = '', initialBranchId = '') => {
    setLoadingColls(true);
    setLoadingCourses(true);
    try {
      const [collRes, courseRes] = await Promise.all([
        fetch(`/api/onboarding?step=colleges&universityId=${univId}`),
        fetch(`/api/onboarding?step=courses&universityId=${univId}`)
      ]);
      
      let coursesData: any[] = [];
      if (collRes.ok) {
        const data = await collRes.json();
        setCollList(data.colleges || []);
      }
      if (courseRes.ok) {
        const data = await courseRes.json();
        coursesData = data.courses || [];
        setCourseList(coursesData);
      }

      if (initialCourseId) {
        const selectedCrs = coursesData.find(c => c._id === initialCourseId);
        if (selectedCrs && selectedCrs.isBranchRequired) {
          fetchBranches(initialCourseId, initialBranchId);
        }
      }
    } catch (err) {
      console.error('Error fetching colleges and courses:', err);
    } finally {
      setLoadingColls(false);
      setLoadingCourses(false);
    }
  };

  const fetchBranches = async (crsId: string, initialBranchId = '') => {
    setLoadingBranches(true);
    try {
      const res = await fetch(`/api/onboarding?step=branches&courseId=${crsId}`);
      if (res.ok) {
        const data = await res.json();
        setBranchList(data.branches || []);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
    } finally {
      setLoadingBranches(false);
    }
  };

  const openEditProfileModal = async () => {
    setEditError('');
    setSuccessMsg('');
    
    const p = user?.profile || {};
    setEditName(p.name || activeName);
    setEditGender((p as any).gender || 'male');
    
    const uId = p.universityId ? String(p.universityId) : '';
    const cId = p.collegeId ? String(p.collegeId) : '';
    const crsId = p.courseId ? String(p.courseId) : '';
    const brId = p.branchId ? String(p.branchId) : '';
    setEditUniversityId(uId);
    setEditCollegeId(cId);
    setEditCourseId(crsId);
    setEditBranchId(brId);
    setEditSemester(p.semester || 1);

    setShowEditModal(true);

    setLoadingUnivs(true);
    try {
      const res = await fetch('/api/onboarding?step=universities');
      if (res.ok) {
        const data = await res.json();
        setUnivList(data.universities || []);
      }
    } catch (err) {
      console.error('Failed to load universities:', err);
    } finally {
      setLoadingUnivs(false);
    }

    if (uId) {
      fetchCollegesAndCourses(uId, cId, crsId, brId);
    }
  };

  const handleUniversityChange = (univId: string) => {
    setEditUniversityId(univId);
    setEditCollegeId('');
    setEditCourseId('');
    setEditBranchId('');
    setEditSemester(1);
    setCollList([]);
    setCourseList([]);
    setBranchList([]);
    if (univId) {
      fetchCollegesAndCourses(univId);
    }
  };

  const handleCourseChange = (crsId: string) => {
    setEditCourseId(crsId);
    setEditBranchId('');
    setEditSemester(1);
    setBranchList([]);
    const selectedCrs = courseList.find(c => c._id === crsId);
    if (selectedCrs && selectedCrs.isBranchRequired) {
      fetchBranches(crsId);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbUser) return;
    setSavingProfile(true);
    setEditError('');

    const selectedCrs = courseList.find(c => c._id === editCourseId);
    if (user?.role === 'student' && selectedCrs && selectedCrs.isBranchRequired && !editBranchId) {
      setEditError('Branch is required for this course.');
      setSavingProfile(false);
      return;
    }

    try {
      const token = await fbUser.getIdToken();
      const profileData: any = {
        name: editName,
        gender: editGender
      };

      if (user?.role === 'student') {
        profileData.universityId = editUniversityId;
        profileData.collegeId = editCollegeId;
        profileData.courseId = editCourseId;
        profileData.branchId = selectedCrs?.isBranchRequired ? editBranchId : null;
        profileData.semester = Number(editSemester);
      }

      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          profile: profileData
        })
      });

      if (res.ok) {
        const colObj = collList.find(c => c._id === editCollegeId);
        const branchObj = branchList.find(b => b._id === editBranchId);

        if (colObj) {
          localStorage.setItem('selectedCollege', colObj.code);
          setLocalCollege(colObj.code);
        }
        if (branchObj) {
          localStorage.setItem('selectedBranch', branchObj.code);
          setLocalBranch(branchObj.code);
        }
        localStorage.setItem('selectedSemester', String(editSemester));

        await refreshProfile();
        setShowEditModal(false);
      } else {
        const data = await res.json();
        setEditError(data.error || 'Failed to update profile.');
      }
    } catch (err) {
      console.error(err);
      setEditError('An error occurred. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const selectedCrsObj = courseList.find(c => c._id === editCourseId);
  const maxSemesters = selectedCrsObj ? selectedCrsObj.maxSemesters : 8;
  const semestersArray = Array.from({ length: maxSemesters }, (_, i) => i + 1);

  // Generate a deterministic unique barcode array based on user name and UID
  const getBarcodeBars = () => {
    const seed = `${fbUser?.uid || 'MEMBER'}${user?.profile?.name || fbUser?.displayName || 'Explorer'}`;
    const bars: number[] = [];
    for (let i = 0; i < seed.length; i++) {
      const code = seed.charCodeAt(i);
      bars.push((code % 3) + 1);
      bars.push(((code >> 1) % 3) + 1);
    }
    while (bars.length < 24) {
      bars.push(1, 2, 1, 3);
    }
    return bars.slice(0, 24);
  };

  // Unique Student Identification string based on DB ID
  const studentIdNumber = fbUser?.uid 
    ? `PH-2026-${fbUser.uid.substring(fbUser.uid.length - 6).toUpperCase()}` 
    : 'PH-2026-MEMBER';

  // Download ID card as PNG
  const downloadIdCard = async () => {
    const card = document.getElementById('student-id-card');
    if (!card) return;

    try {
      const html2canvasModule = await import('html2canvas');
      const canvas = await html2canvasModule.default(card, {
        useCORS: true,
        scale: 3,
        backgroundColor: null,
        logging: false
      });
      
      const link = document.createElement('a');
      link.download = `paperhub-id-${(user?.profile?.name || fbUser?.displayName || 'student').toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to export ID Card image:', err);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLocalCollege(localStorage.getItem('selectedCollege'));
      setLocalBranch(localStorage.getItem('selectedBranch'));
    }
  }, []);

  // Fetch actual enrolled subjects matching user details
  useEffect(() => {
    if (authLoading || !fbUser) return;
    const college = user?.profile?.college || localCollege;
    const branch = user?.profile?.branch || localBranch;
    const semester = user?.profile?.semester || 1;

    if (!college || !branch) {
      setLoadingSubjects(false);
      return;
    }

    setLoadingSubjects(true);
    fbUser.getIdToken().then((token: string) => 
      fetch(`/api/subjects?collegeCode=${college}&branchCode=${branch}&semester=${semester}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
    )
    .then((res: any) => res.ok ? res.json() : [])
    .then((data: any) => {
      setSubjects(Array.isArray(data) ? data : (data.subjects || []));
    })
    .catch((err: any) => console.error("Error loading subjects in profile:", err))
    .finally(() => setLoadingSubjects(false));
  }, [authLoading, fbUser, user, localCollege, localBranch]);

  useEffect(() => {
    if (authLoading || !fbUser || !user || user.role === 'student') return;
    
    setLoadingStaffStats(true);
    fbUser.getIdToken().then((token: string) => {
      const endpoint = user.role === 'admin' ? '/api/admin/platform-stats' : `/api/stats/${user.role}`;
      return fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    })
    .then((res: any) => res && res.ok ? res.json() : null)
    .then((data: any) => {
      if (data) {
        if (user.role === 'admin') {
          setStaffStats(data);
        } else {
          setStaffStats(data.metrics);
        }
      }
    })
    .catch((err: any) => console.error("Error loading staff stats in profile:", err))
    .finally(() => setLoadingStaffStats(false));
  }, [fbUser, user, authLoading]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <div className="text-center space-y-3">
          <Loader2 className="w-7 h-7 text-accent animate-spin mx-auto" />
          <p className="text-xs text-text-secondary">Loading learning insights…</p>
        </div>
      </div>
    );
  }

  const activeName = user?.profile?.name || fbUser?.displayName || 'Explorer';
  const activeEmail = user?.email || fbUser?.email || '';
  const activeCollege = user?.profile?.college || localCollege || 'MMMUT';
  const activeBranch = user?.profile?.branch || localBranch || 'Computer Science Engineering';
  const activeSemester = user?.profile?.semester || 1;
  const joinedDate = (user as any)?.createdAt ? new Date((user as any).createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'June 2026';
  const avatarUrl = user?.image || fbUser?.photoURL || '/default-avatar.png';

  // Helper mapping database subjects to math/code visuals
  const getSubjectVisual = (subName: string) => {
    const n = subName.toLowerCase();
    if (n.includes('physics') || n.includes('phy')) {
      return {
        formula: 'E = mc²',
        icon: Atom,
        colorBar: 'bg-purple-500',
        textColor: 'text-purple-400'
      };
    }
    if (n.includes('math') || n.includes('calculus') || n.includes('algebra') || n.includes('discrete')) {
      return {
        formula: 'x = -b ± √b²-4ac\n      2a',
        icon: Sigma,
        colorBar: 'bg-blue-500',
        textColor: 'text-blue-400'
      };
    }
    if (n.includes('bhs') || n.includes('humanities') || n.includes('communication') || n.includes('english')) {
      return {
        formula: 'A → B → C',
        icon: Network,
        colorBar: 'bg-emerald-500',
        textColor: 'text-emerald-400'
      };
    }
    if (n.includes('programming') || n.includes('code') || n.includes(' c ') || n.includes('introduction to c') || n.includes('datastructure')) {
      return {
        formula: '#include <stdio.h>\nint main() {\n  return 0;\n}',
        icon: Code,
        colorBar: 'bg-orange-500',
        textColor: 'text-orange-400'
      };
    }
    if (n.includes('web') || n.includes('design') || n.includes('html') || n.includes('css')) {
      return {
        formula: '<html>\n  <body>\n  </body>\n</html>',
        icon: Monitor,
        colorBar: 'bg-rose-500',
        textColor: 'text-rose-400'
      };
    }
    return {
      formula: 'PaperHub\nStudy Room',
      icon: BookOpen,
      colorBar: 'bg-indigo-500',
      textColor: 'text-indigo-400'
    };
  };

  const defaultSubjects = [
    {
      name: 'Physics',
      description: 'Explore the laws of nature and how the universe works.',
      formula: 'F = ma',
      icon: Atom,
      colorBar: 'bg-purple-500',
      textColor: 'text-purple-400'
    },
    {
      name: 'Mathematics',
      description: 'Build problem solving skills with algebra, calculus and more.',
      formula: 'a_n = a_1 + (n-1)d',
      icon: Sigma,
      colorBar: 'bg-blue-500',
      textColor: 'text-blue-400'
    },
    {
      name: 'BHS',
      description: 'Understand human behavior and professional communication.',
      formula: 'A → B → C',
      icon: Network,
      colorBar: 'bg-emerald-500',
      textColor: 'text-emerald-400'
    },
    {
      name: 'Introduction to C',
      description: 'Start your programming journey with the basics of C language.',
      formula: '#include <stdio.h>\nint main()',
      icon: Code,
      colorBar: 'bg-orange-500',
      textColor: 'text-orange-400'
    },
    {
      name: 'Web Designing',
      description: 'Learn to design beautiful and responsive websites.',
      formula: '<html>\n  <body>',
      icon: Monitor,
      colorBar: 'bg-rose-500',
      textColor: 'text-rose-400'
    }
  ];

  const displayedSubjects = subjects.length > 0 
    ? subjects.map(sub => {
        const visual = getSubjectVisual(sub.name);
        return {
          _id: sub._id,
          name: sub.name,
          description: sub.description || `Prepare for your college examination in ${sub.name} with sessional tests.`,
          formula: visual.formula,
          icon: visual.icon,
          colorBar: visual.colorBar,
          textColor: visual.textColor
        };
      })
    : defaultSubjects;

  return (
    <div className="flex min-h-screen bg-bg-primary text-text-primary overflow-hidden relative">
      {/* Ambient decorative glow */}
      <div className="hidden dark:block fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] rounded-full bg-purple-900/10 blur-[150px] pointer-events-none" />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-grow flex flex-col min-h-screen overflow-y-auto z-10 relative">
        <Navbar onMenuToggle={() => setSidebarOpen(true)} />

        {/* Floating coding backdrops decorative illustration */}
        <div className="absolute inset-x-0 top-0 h-[280px] overflow-hidden pointer-events-none opacity-20 dark:opacity-25 select-none z-0">
          <div className="absolute left-10 top-20 text-[56px] font-mono text-purple-500/20 font-black">{"{"}</div>
          <div className="absolute left-24 top-24 text-[10px] font-mono text-purple-400/20 whitespace-pre leading-relaxed">
            {`int main() {\n  return 0;\n}`}
          </div>
          <div className="absolute left-[38%] top-16 text-[48px] font-mono text-indigo-500/25 font-black">{"</>"}</div>
          <div className="absolute left-[36%] top-28 text-[9px] font-mono text-indigo-400/20 tracking-widest leading-none">
            {"01010101\n10101010"}
          </div>
          <div className="absolute right-[28%] top-20 text-[11px] font-mono text-purple-400/20 whitespace-pre leading-relaxed">
            {"x = -b ± √b² - 4ac\n      2a"}
          </div>
          <div className="absolute right-12 top-12 w-48 h-24 border border-purple-500/10 rounded-2xl flex flex-col p-3 gap-2">
            <div className="w-12 h-1.5 bg-purple-500/15 rounded" />
            <div className="w-28 h-1.5 bg-purple-500/10 rounded" />
            <div className="flex gap-1.5 mt-1">
              <div className="w-4 h-4 rounded bg-purple-500/15" />
              <div className="w-4 h-4 rounded bg-purple-500/15" />
              <div className="w-4 h-4 rounded bg-purple-500/15" />
            </div>
          </div>
        </div>

        <main className="flex-grow w-full max-w-5xl mx-auto px-6 py-8 space-y-8 z-10 relative">
          
          {/* Breadcrumbs & Title */}
          <div className="space-y-1">
            <nav className="flex items-center space-x-2 text-[10px] sm:text-xs font-bold text-text-muted uppercase tracking-wider">
              <Link href="/dashboard" className="hover:text-text-primary transition-colors">Home</Link>
              <span>/</span>
              <span className="text-text-primary">My Profile</span>
            </nav>
            <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight leading-none text-text-primary mt-1">
              My Profile
            </h1>
            <p className="text-[11px] sm:text-xs text-text-secondary">
              {user?.role === 'student' ? 'Your academic identity and information.' : 'Your staff workspace identity and statistics.'}
            </p>
          </div>

          {/* Premium Profile Hero Card */}
          <div className="bg-bg-secondary/60 dark:bg-[#0c0b16]/60 border border-border-primary/40 backdrop-blur-md rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-2xl">
            {/* Inner glowing core */}
            <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-purple-500/10 rounded-full blur-[40px] pointer-events-none" />
            <div className="absolute -right-20 -top-20 w-48 h-48 bg-accent/10 rounded-full blur-[40px] pointer-events-none" />

            {/* Left side: Avatar details */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 z-10 w-full md:w-auto">
              {/* avatar circle */}
              <div className="relative shrink-0">
                <UserAvatar 
                  gender={user?.profile?.gender} 
                  imageUrl={avatarUrl} 
                  name={activeName} 
                  className="w-24 h-24 border-2 border-purple-500/40 shadow-lg" 
                />
                {/* online green status dot */}
                <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-bg-secondary rounded-full shadow-md z-15" />
              </div>

              {/* info fields */}
              <div className="space-y-2.5 text-center sm:text-left flex-grow">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h2 className="font-display font-black text-2xl text-text-primary tracking-tight leading-none">
                    {activeName}
                  </h2>
                  <button 
                    onClick={openEditProfileModal}
                    className="p-1 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-accent transition-all"
                    title="Edit Profile"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                {user?.role === 'student' ? (
                  <span className="inline-block px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                    {activeBranch}
                  </span>
                ) : (
                  <span className="inline-block px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider font-mono">
                    {user?.role === 'verifier' ? 'Verifier Partner' : user?.role === 'moderator' ? 'Moderator Admin' : 'Super Administrator'}
                  </span>
                )}

                {user?.role === 'student' ? (
                  <div className="flex items-center gap-3.5 flex-wrap justify-center sm:justify-start text-[10.5px] font-bold text-text-secondary">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> {activeCollege}
                    </span>
                    <span className="text-text-muted">•</span>
                    <span>Semester {activeSemester}</span>
                    <span className="text-text-muted">•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Joined {joinedDate}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3.5 flex-wrap justify-center sm:justify-start text-[10.5px] font-bold text-text-secondary">
                    <span>{activeEmail}</span>
                    <span className="text-text-muted">•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Joined {joinedDate}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right side: Quote & isometric laptop illustration */}
            <div className="flex items-center gap-6 z-10 w-full md:w-auto justify-between md:justify-end border-t md:border-0 border-border-primary/30 pt-4 md:pt-0">
              {/* quote block */}
              <div className="space-y-1.5 max-w-[200px] text-left">
                <span className="text-2xl font-serif text-purple-400 font-bold block leading-none">“</span>
                <p className="text-[10px] text-text-secondary font-bold leading-normal italic">
                  {user?.role === 'student'
                    ? "Code. Learn. Build. Repeat. Every line of code is a step towards a better future."
                    : user?.role === 'verifier'
                    ? "Strive for absolute precision in examination digitizations. Accuracy defines PaperHub."
                    : user?.role === 'moderator'
                    ? "Ensure absolute fairness, quality content checks, and audit integrity across all queues."
                    : "Orchestrate, monitor, and scale the learning ecosystem with system health and metrics."
                  }
                </p>
              </div>

              {/* isometric laptop SVG graphic */}
              <div className="hidden md:flex items-center justify-center shrink-0 w-36 h-28 relative">
                <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl pointer-events-none animate-pulse" />
                <svg viewBox="0 0 100 80" className="w-full h-full z-10 filter drop-shadow-[0_0_12px_rgba(124,102,255,0.45)]">
                  <rect x="15" y="10" width="70" height="46" rx="4" fill="#080614" stroke="#7c66ff" strokeWidth="1.5" />
                  <rect x="19" y="14" width="62" height="38" rx="2" fill="#0c0a21" />
                  <text x="32" y="36" fill="#7c66ff" fontSize="13" fontWeight="900" fontFamily="monospace" letterSpacing="1">{user?.role === 'student' ? '</>' : '{}'}</text>
                  <path d="M 12 56 L 88 56 L 82 62 L 18 62 Z" fill="#181438" stroke="#7c66ff" strokeWidth="1" />
                  <path d="M 8 62 L 92 62 L 94 65 L 6 65 Z" fill="#0c0a21" stroke="#7c66ff" strokeWidth="1" />
                  <ellipse cx="50" cy="67" rx="36" ry="4" fill="#7c66ff" fillOpacity="0.25" />
                </svg>
              </div>
            </div>
          </div>

          {/* Academic Information Grid (Student Only) */}
          {user?.role === 'student' && (
            <div className="space-y-4">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-purple-400" /> Academic Information
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* College Card */}
                <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm flex items-center gap-3.5 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/15 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[10px] text-text-muted font-bold uppercase tracking-wider">College</h4>
                    <p className="font-display font-black text-xs text-text-primary mt-0.5 truncate max-w-[140px] uppercase tracking-wide font-mono">
                      {activeCollege}
                    </p>
                  </div>
                </div>

                {/* Branch Card */}
                <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm flex items-center gap-3.5 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/15 flex items-center justify-center shrink-0">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Branch</h4>
                    <p className="font-display font-black text-xs text-text-primary mt-0.5 truncate max-w-[140px] uppercase tracking-wide font-mono">
                      {activeBranch}
                    </p>
                  </div>
                </div>

                {/* Semester Card */}
                <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm flex items-center gap-3.5 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Semester</h4>
                    <p className="font-display font-black text-xs text-text-primary mt-0.5 truncate max-w-[140px] uppercase tracking-wide font-mono">
                      Semester {activeSemester}
                    </p>
                  </div>
                </div>

                {/* Student ID Card trigger Option */}
                <button 
                  onClick={() => setShowIdModal(true)}
                  className="p-5 rounded-2xl border border-purple-500/25 bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-500/40 transition-all flex items-center gap-3.5 text-left shadow-sm group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/35 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">ID Card</h4>
                    <p className="font-display font-black text-xs text-text-primary mt-0.5 flex items-center gap-1">
                      Show My ID <ChevronRight className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Current Subjects section (Student Only) */}
          {user?.role === 'student' && (
            <div className="space-y-4">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-purple-400" /> Current Subjects
              </h3>

              {loadingSubjects ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                  {displayedSubjects.map((subject, idx) => {
                    const SubjectIcon = subject.icon;
                    return (
                      <div 
                        key={(subject as any)._id || idx}
                        className="bg-bg-secondary/40 border border-border-primary/50 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between h-36 hover:scale-[1.02] hover:border-accent/30 transition-all duration-300 group shadow-sm select-none"
                      >
                        {/* Ambient subject visual background formula */}
                        <span className="absolute right-3.5 top-3 text-[10.5px] font-mono font-extrabold opacity-[0.025] dark:opacity-[0.045] select-none text-right leading-relaxed whitespace-pre pointer-events-none max-w-[120px] overflow-hidden h-[60px]">
                          {subject.formula}
                        </span>

                        {/* Icon */}
                        <div className="w-9 h-9 rounded-lg bg-bg-tertiary/60 border border-border-primary/50 flex items-center justify-center shrink-0">
                          <SubjectIcon className="w-4.5 h-4.5 text-text-secondary" />
                        </div>

                        {/* Text */}
                        <div className="space-y-1 mt-3">
                          <h4 className="font-display font-bold text-xs text-text-primary truncate">
                            {subject.name}
                          </h4>
                          <p className="text-[9px] text-text-secondary line-clamp-2 leading-relaxed" title={subject.description}>
                            {subject.description}
                          </p>
                        </div>

                        {/* Accent color strip at bottom */}
                        <div className={`absolute bottom-0 inset-x-0 h-1.5 ${subject.colorBar}`} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Staff Workspace activity statistics */}
          {user?.role !== 'student' && (
            <div className="space-y-6 text-left">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-purple-400" /> Workspace Activity Metrics
              </h3>

              {loadingStaffStats ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-accent mx-auto" />
                  <p className="text-xs text-text-secondary mt-2">Loading workspace metrics...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Grid layout for staff statistics */}
                  {user?.role === 'verifier' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm">
                        <div className="flex items-center justify-between text-text-muted">
                          <span className="text-[10px] font-black uppercase tracking-wider">Verified Questions</span>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                        <h3 className="font-display font-black text-3xl mt-2 text-text-primary">{staffStats?.verifiedQuestions ?? 0}</h3>
                        <p className="text-[9px] text-text-secondary mt-1">Successfully approved</p>
                      </div>

                      <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm">
                        <div className="flex items-center justify-between text-text-muted">
                          <span className="text-[10px] font-black uppercase tracking-wider">Flagged Content</span>
                          <Flag className="w-4 h-4 text-red-500" />
                        </div>
                        <h3 className="font-display font-black text-3xl mt-2 text-text-primary">{staffStats?.flaggedQuestions ?? 0}</h3>
                        <p className="text-[9px] text-text-secondary mt-1">Reported to moderator</p>
                      </div>

                      <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm">
                        <div className="flex items-center justify-between text-text-muted">
                          <span className="text-[10px] font-black uppercase tracking-wider">Pipeline Batches</span>
                          <Cpu className="w-4 h-4 text-purple-400" />
                        </div>
                        <h3 className="font-display font-black text-3xl mt-2 text-text-primary">{staffStats?.processingBatches ?? 0}</h3>
                        <p className="text-[9px] text-text-secondary mt-1">Active document uploads</p>
                      </div>

                      <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm">
                        <div className="flex items-center justify-between text-text-muted">
                          <span className="text-[10px] font-black uppercase tracking-wider">Workspace Access</span>
                          <Shield className="w-4 h-4 text-accent" />
                        </div>
                        <h3 className="font-display font-black text-xs mt-3.5 text-emerald-400 uppercase tracking-wide">ACTIVE PARTNER</h3>
                        <p className="text-[9px] text-text-secondary mt-1">Verifier privileges enabled</p>
                      </div>
                    </div>
                  )}

                  {user?.role === 'moderator' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm">
                        <div className="flex items-center justify-between text-text-muted">
                          <span className="text-[10px] font-black uppercase tracking-wider">Flagged Items</span>
                          <Flag className="w-4 h-4 text-red-500" />
                        </div>
                        <h3 className="font-display font-black text-3xl mt-2 text-text-primary">{staffStats?.flaggedQuestions ?? 0}</h3>
                        <p className="text-[9px] text-text-secondary mt-1">Awaiting moderation</p>
                      </div>

                      <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm">
                        <div className="flex items-center justify-between text-text-muted">
                          <span className="text-[10px] font-black uppercase tracking-wider">Grade Appeals</span>
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        </div>
                        <h3 className="font-display font-black text-3xl mt-2 text-text-primary">{staffStats?.pendingAppeals ?? 0}</h3>
                        <p className="text-[9px] text-text-secondary mt-1">Student disputes open</p>
                      </div>

                      <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm">
                        <div className="flex items-center justify-between text-text-muted">
                          <span className="text-[10px] font-black uppercase tracking-wider">Feedback Tickets</span>
                          <MessageSquare className="w-4 h-4 text-purple-400" />
                        </div>
                        <h3 className="font-display font-black text-3xl mt-2 text-text-primary">{staffStats?.openFeedback ?? 0}</h3>
                        <p className="text-[9px] text-text-secondary mt-1">Bugs / queries pending</p>
                      </div>

                      <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm">
                        <div className="flex items-center justify-between text-text-muted">
                          <span className="text-[10px] font-black uppercase tracking-wider">Moderation Level</span>
                          <Shield className="w-4 h-4 text-accent" />
                        </div>
                        <h3 className="font-display font-black text-xs mt-3.5 text-purple-400 uppercase tracking-wide">STAFF ADMIN</h3>
                        <p className="text-[9px] text-text-secondary mt-1">All queues active</p>
                      </div>
                    </div>
                  )}

                  {user?.role === 'admin' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm">
                        <div className="flex items-center justify-between text-text-muted">
                          <span className="text-[10px] font-black uppercase tracking-wider">Total Registrations</span>
                          <Users className="w-4 h-4 text-purple-400" />
                        </div>
                        <h3 className="font-display font-black text-3xl mt-2 text-text-primary">{staffStats?.users?.total ?? 0}</h3>
                        <p className="text-[9px] text-text-secondary mt-1">User database size</p>
                      </div>

                      <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm">
                        <div className="flex items-center justify-between text-text-muted">
                          <span className="text-[10px] font-black uppercase tracking-wider">Daily Active Users</span>
                          <Globe className="w-4 h-4 text-emerald-400" />
                        </div>
                        <h3 className="font-display font-black text-3xl mt-2 text-text-primary">{staffStats?.users?.dailyActiveUsers ?? 0}</h3>
                        <p className="text-[9px] text-text-secondary mt-1">Active within 24h</p>
                      </div>

                      <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm">
                        <div className="flex items-center justify-between text-text-muted">
                          <span className="text-[10px] font-black uppercase tracking-wider">Practice Sessions</span>
                          <BookOpen className="w-4 h-4 text-accent" />
                        </div>
                        <h3 className="font-display font-black text-3xl mt-2 text-text-primary">{staffStats?.sessions?.total ?? 0}</h3>
                        <p className="text-[9px] text-text-secondary mt-1">{staffStats?.sessions?.today ?? 0} started today</p>
                      </div>

                      <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm">
                        <div className="flex items-center justify-between text-text-muted">
                          <span className="text-[10px] font-black uppercase tracking-wider">System Health</span>
                          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                        </div>
                        <h3 className="font-display font-black text-xs mt-3.5 text-emerald-400 uppercase tracking-wide font-mono font-bold">HEALTHY</h3>
                        <p className="text-[9px] text-text-secondary mt-1">Database & Redis connected</p>
                      </div>
                    </div>
                  )}

                  {/* Navigation Panel */}
                  <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/20 space-y-4">
                    <h4 className="font-display font-bold text-xs uppercase tracking-wider text-text-primary">
                      Quick Workspace Navigation
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {user?.role === 'verifier' && (
                        <>
                          <Link 
                            href="/verifier?tab=queue" 
                            className="p-4 rounded-xl border border-border-primary/50 bg-bg-primary hover:border-accent/30 transition-all flex items-center justify-between group"
                          >
                            <span className="text-xs font-semibold text-text-primary">Verification Queue</span>
                            <ChevronRight className="w-4 h-4 text-text-secondary group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                          <Link 
                            href="/verifier?tab=review" 
                            className="p-4 rounded-xl border border-border-primary/50 bg-bg-primary hover:border-accent/30 transition-all flex items-center justify-between group"
                          >
                            <span className="text-xs font-semibold text-text-primary">Grade Review Queue</span>
                            <ChevronRight className="w-4 h-4 text-text-secondary group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        </>
                      )}
                      {user?.role === 'moderator' && (
                        <>
                          <Link 
                            href="/moderator?status=flagged" 
                            className="p-4 rounded-xl border border-border-primary/50 bg-bg-primary hover:border-red-500/20 transition-all flex items-center justify-between group"
                          >
                            <span className="text-xs font-semibold text-text-primary">Flagged Questions</span>
                            <ChevronRight className="w-4 h-4 text-text-secondary group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                          <Link 
                            href="/verifier?tab=review" 
                            className="p-4 rounded-xl border border-border-primary/50 bg-bg-primary hover:border-amber-500/20 transition-all flex items-center justify-between group"
                          >
                            <span className="text-xs font-semibold text-text-primary">Appeals Review</span>
                            <ChevronRight className="w-4 h-4 text-text-secondary group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                          <Link 
                            href="/admin?tab=feedback" 
                            className="p-4 rounded-xl border border-border-primary/50 bg-bg-primary hover:border-purple-500/20 transition-all flex items-center justify-between group"
                          >
                            <span className="text-xs font-semibold text-text-primary">User Feedbacks</span>
                            <ChevronRight className="w-4 h-4 text-text-secondary group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        </>
                      )}
                      {user?.role === 'admin' && (
                        <>
                          <Link 
                            href="/admin?tab=users" 
                            className="p-4 rounded-xl border border-border-primary/50 bg-bg-primary hover:border-accent/30 transition-all flex items-center justify-between group"
                          >
                            <span className="text-xs font-semibold text-text-primary">User Management</span>
                            <ChevronRight className="w-4 h-4 text-text-secondary group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                          <Link 
                            href="/admin?tab=monitoring" 
                            className="p-4 rounded-xl border border-border-primary/50 bg-bg-primary hover:border-emerald-500/30 transition-all flex items-center justify-between group"
                          >
                            <span className="text-xs font-semibold text-text-primary">System Monitoring</span>
                            <ChevronRight className="w-4 h-4 text-text-secondary group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                          <Link 
                            href="/staff/audit" 
                            className="p-4 rounded-xl border border-border-primary/50 bg-bg-primary hover:border-purple-500/20 transition-all flex items-center justify-between group"
                          >
                            <span className="text-xs font-semibold text-text-primary">Audit Log View</span>
                            <ChevronRight className="w-4 h-4 text-text-secondary group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        </>
                      )}
                      <Link 
                        href="/settings" 
                        className="p-4 rounded-xl border border-border-primary/50 bg-bg-primary hover:border-accent/30 transition-all flex items-center justify-between group"
                      >
                        <span className="text-xs font-semibold text-text-primary">System Settings</span>
                        <ChevronRight className="w-4 h-4 text-text-secondary group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* Unique ID Card Modal Overlay */}
      <AnimatePresence>
        {showIdModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bg-secondary/90 border border-border-primary/80 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative overflow-hidden space-y-6"
            >
              {/* Top glow border */}
              <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

              {/* Close Button */}
              <button 
                onClick={() => setShowIdModal(false)}
                className="absolute top-4 right-4 p-2 rounded-xl border border-border-primary hover:bg-bg-tertiary text-text-secondary transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center space-y-1">
                <h3 className="font-display font-black text-lg text-text-primary">PaperHub Student Identification</h3>
                <p className="text-xs text-text-secondary">Official student card for college exam preparation.</p>
              </div>

              {/* ID Card structure */}
              <div className="relative group perspective-1000 my-4">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-purple-500/20 rounded-3xl blur-2xl opacity-60 pointer-events-none" />
                
                <div 
                  id="student-id-card"
                  className="w-full aspect-[1.58/1] rounded-3xl border border-border-primary/60 p-6 flex flex-col justify-between relative overflow-hidden shadow-2xl"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--bg-secondary)) 0%, hsl(var(--bg-primary)) 100%)',
                  }}
                >
                  {/* Glowing background halo */}
                  <div className="absolute -right-20 -top-20 w-44 h-44 bg-accent/20 rounded-full blur-[40px] pointer-events-none" />
                  <div className="absolute -left-20 -bottom-20 w-44 h-44 bg-purple-500/10 rounded-full blur-[40px] pointer-events-none" />

                  {/* Card Header */}
                  <div className="flex justify-between items-start z-10">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-accent tracking-[0.2em] uppercase">PaperHub Member</span>
                      <span className="text-[8px] font-bold text-text-muted mt-0.5">EST. 2026</span>
                    </div>
                    {/* Golden Card Chip */}
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
                        {activeName}
                      </div>
                    </div>
                    {/* Barcode generated dynamically */}
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

                  {/* Card Footer: University/College/Course details */}
                  <div className="pt-3 border-t border-border-primary/50 flex justify-between items-center z-10">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[9px] w-full">
                      <div>
                        <span className="text-text-muted block font-semibold leading-normal pb-0.5">UNIVERSITY</span>
                        <span className="font-bold text-text-primary uppercase tracking-wide truncate max-w-[120px] block font-mono pb-1 leading-normal">
                          {user?.profile?.university || 'AKTU'}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-muted block font-semibold leading-normal pb-0.5">COLLEGE</span>
                        <span className="font-bold text-text-primary uppercase tracking-wide truncate max-w-[120px] block font-mono pb-1 leading-normal">
                          {activeCollege}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-muted block font-semibold leading-normal pb-0.5">COURSE</span>
                        <span className="font-bold text-text-primary uppercase tracking-wide truncate max-w-[120px] block font-mono pb-1 leading-normal">
                          {user?.profile?.course || 'B.TECH'}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-muted block font-semibold leading-normal pb-0.5">BRANCH & SEM</span>
                        <span className="font-bold text-text-primary uppercase tracking-wide truncate max-w-[120px] block font-mono pb-1 leading-normal">
                          {activeBranch} • Sem {activeSemester}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Download and Close Actions */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowIdModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-bg-primary border border-border-primary hover:bg-bg-tertiary text-text-secondary font-bold text-xs transition-all flex items-center justify-center"
                >
                  Close
                </button>
                <button
                  onClick={downloadIdCard}
                  className="flex-grow-[2] py-3 px-4 rounded-xl bg-accent text-white font-bold text-xs transition-all flex items-center justify-center space-x-2 shadow-md hover:-translate-y-0.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Image</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bg-secondary border border-border-primary/80 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6 scrollbar-none"
            >
              {/* Top accent glow border */}
              <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

              {/* Close Button */}
              <button 
                onClick={() => setShowEditModal(false)}
                className="absolute top-4 right-4 p-2 rounded-xl border border-border-primary hover:bg-bg-tertiary text-text-secondary transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center space-y-1">
                <h3 className="font-display font-black text-lg text-text-primary">Edit Academic Profile</h3>
                <p className="text-xs text-text-secondary">Update your student information and enrolled course details.</p>
              </div>

              {editError && (
                <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-xs text-red-500 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4 text-left">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border-primary/60 bg-bg-primary/45 focus:border-accent focus:ring-1 focus:ring-accent text-xs font-semibold outline-none transition-all"
                    placeholder="Enter your name"
                  />
                </div>

                {/* Gender */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Gender</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-xl border border-border-primary/60 bg-bg-primary/45 focus:border-accent text-xs font-semibold outline-none transition-all"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other / Rather not say</option>
                  </select>
                </div>

                {/* University Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">University</label>
                  {loadingUnivs ? (
                    <div className="flex items-center gap-2 py-3 text-xs text-text-muted">
                      <Loader2 className="w-4 h-4 animate-spin text-accent" /> Loading universities...
                    </div>
                  ) : (
                    <select
                      required
                      value={editUniversityId}
                      onChange={(e) => handleUniversityChange(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border-primary/60 bg-bg-primary/45 focus:border-accent text-xs font-semibold outline-none transition-all font-mono"
                    >
                      <option value="">Select University</option>
                      {univList.map((u) => (
                        <option key={u._id} value={u._id}>{u.name} ({u.code})</option>
                      ))}
                    </select>
                  )}
                </div>

                {editUniversityId && (
                  <>
                    {/* College Selector */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">College</label>
                      {loadingColls ? (
                        <div className="flex items-center gap-2 py-3 text-xs text-text-muted">
                          <Loader2 className="w-4 h-4 animate-spin text-accent" /> Loading affiliated colleges...
                        </div>
                      ) : (
                        <select
                          required
                          value={editCollegeId}
                          onChange={(e) => setEditCollegeId(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-border-primary/60 bg-bg-primary/45 focus:border-accent text-xs font-semibold outline-none transition-all font-mono"
                        >
                          <option value="">Select College</option>
                          {collList.map((c) => (
                            <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Course Selector */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Course</label>
                      {loadingCourses ? (
                        <div className="flex items-center gap-2 py-3 text-xs text-text-muted">
                          <Loader2 className="w-4 h-4 animate-spin text-accent" /> Loading courses...
                        </div>
                      ) : (
                        <select
                          required
                          value={editCourseId}
                          onChange={(e) => handleCourseChange(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-border-primary/60 bg-bg-primary/45 focus:border-accent text-xs font-semibold outline-none transition-all font-mono"
                        >
                          <option value="">Select Course</option>
                          {courseList.map((c) => (
                            <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </>
                )}

                {editCourseId && (
                  <>
                    {/* Branch (Conditional) */}
                    {selectedCrsObj?.isBranchRequired && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Branch</label>
                        {loadingBranches ? (
                          <div className="flex items-center gap-2 py-3 text-xs text-text-muted">
                            <Loader2 className="w-4 h-4 animate-spin text-accent" /> Loading branches...
                          </div>
                        ) : (
                          <select
                            required
                            value={editBranchId}
                            onChange={(e) => setEditBranchId(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-border-primary/60 bg-bg-primary/45 focus:border-accent text-xs font-semibold outline-none transition-all font-mono"
                          >
                            <option value="">Select Branch</option>
                            {branchList.map((b) => (
                              <option key={b._id} value={b._id}>{b.name} ({b.code})</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    {/* Semester Selector */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Current Semester</label>
                      <select
                        required
                        value={editSemester}
                        onChange={(e) => setEditSemester(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border border-border-primary/60 bg-bg-primary/45 focus:border-accent text-xs font-semibold outline-none transition-all font-mono"
                      >
                        {semestersArray.map((sem) => (
                          <option key={sem} value={sem}>Semester {sem}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Form Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 py-3 px-4 rounded-xl bg-bg-primary border border-border-primary hover:bg-bg-tertiary text-text-secondary font-bold text-xs transition-all flex items-center justify-center font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="flex-grow-[2] py-3 px-4 rounded-xl bg-accent text-white font-bold text-xs transition-all flex items-center justify-center space-x-2 shadow-md hover:-translate-y-0.5"
                  >
                    {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{savingProfile ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
