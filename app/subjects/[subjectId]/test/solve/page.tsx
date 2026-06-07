'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const MathMarkdown = dynamic(() => import('@/components/math-markdown').then((mod) => mod.MathMarkdown), {
  ssr: false,
  loading: () => <div className="animate-pulse h-12 bg-bg-secondary rounded-lg border border-border-primary/50 w-full" />,
});

import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/components/auth-provider';
import { SessionLoader } from '@/components/session-loader';

import { 
  Clock, 
  ShieldAlert, 
  Maximize2, 
  Minimize2, 
  PenTool, 
  Loader2,
  HelpCircle as QuestionIcon,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Lock,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  BadgeCheck,
  Trophy,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateTestPaperPDF } from '@/lib/generatePDF';

interface SolutionStep {
  stepNumber: number;
  heading: string;
  content: string;
}

interface SolutionData {
  content?: string;
  steps?: SolutionStep[];
  type?: string;
  code?: string;
  explanation?: string;
  complexity?: {
    time: string;
    space: string;
  };
  inputOutput?: string;
  mermaid?: string;
  generatedAt?: string | Date;
  error?: string | boolean;
}

interface HistoryEntry {
  questionId: string | { _id: string };
  viewedSolution?: boolean;
}

export default function TestSolve() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-secondary">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-sm">Loading exam environment...</p>
        </div>
      </div>
    }>
      <TestSolveContent />
    </Suspense>
  );
}

function TestSolveContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectId = params.subjectId as string;
  const { fbUser, loading: authLoading } = useAuth();

  // URL parameters
  const sessionId = searchParams.get('sessionId');
  const durationParam = parseInt(searchParams.get('duration') || '90', 10);

  interface TestQuestion {
    _id: string;
    unit: number;
    topic: string;
    questionText: string;
    difficulty: string;
    repetitionFrequency: number;
    marks?: number;
    sourcePapers?: { year: number; examType: string }[];
  }

  // Core test states
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isLoaderVisible, setIsLoaderVisible] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [timeLeft, setTimeLeft] = useState(durationParam * 60); // seconds
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userNotes, setUserNotes] = useState<{[key: string]: string}>({});

  // Self Grading and Evaluation states
  const [evaluationMethod, setEvaluationMethod] = useState<'self' | 'photo'>('self');
  const [responses, setResponses] = useState<{[qId: string]: { selfScore?: 'correct' | 'partial' | 'incorrect'; score?: number; notes?: string }}>({});
  const [revealedQuestions, setRevealedQuestions] = useState<{[qId: string]: boolean}>({});
  const [solutionsLoading, setSolutionsLoading] = useState<{[qId: string]: boolean}>({});
  const [solutions, setSolutions] = useState<{[qId: string]: SolutionData}>({});
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Anti-cheat trackers
  const [tabSwitches, setTabSwitches] = useState(0);
  const [focusLosses, setFocusLosses] = useState(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [showCheatNotice, setShowCheatNotice] = useState(false);
  const [cheatNoticeMsg, setCheatNoticeMsg] = useState('');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Refs for container
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load questions and saved stats
  useEffect(() => {
    if (authLoading) return;

    if (!sessionId) {
      router.push(`/subjects/${subjectId}`);
      return;
    }

    if (!fbUser) {
      router.push('/login');
      return;
    }

    fbUser.getIdToken()
      .then((idToken: string) => {
        fetch(`/api/sessions/${sessionId}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        })
          .then((res: any) => {
            if (!res.ok) throw new Error('Failed to load session');
            return res.json();
          })
          .then((data) => {
            if (data.session && data.session.questions) {
              setQuestions(data.session.questions);
              setCurrentIdx(data.session.currentQuestionIndex || 0);
              setEvaluationMethod(data.session.evaluationMethod || 'self');
              setHistory(data.session.history || []);
              
              if (data.session.history) {
                const initialRevealed: typeof revealedQuestions = {};
                data.session.history.forEach((h: HistoryEntry) => {
                  const qIdStr = typeof h.questionId === 'object' && h.questionId !== null ? h.questionId._id : h.questionId;
                  if (h.viewedSolution) {
                    initialRevealed[qIdStr] = true;
                  }
                });
                setRevealedQuestions(initialRevealed);
              }

              if (data.session.timeRemaining !== undefined) {
                setTimeLeft(data.session.timeRemaining);
              } else if (data.session.examDuration !== undefined) {
                setTimeLeft(data.session.examDuration);
              }

              if (data.session.testResponses) {
                const initialResp: typeof responses = {};
                data.session.testResponses.forEach((resItem: { questionId: string | { _id: string }; selfScore?: 'correct' | 'partial' | 'incorrect'; score?: number; notes?: string }) => {
                  const qIdStr = typeof resItem.questionId === 'object' && resItem.questionId !== null ? resItem.questionId._id : resItem.questionId;
                  initialResp[qIdStr] = {
                    selfScore: resItem.selfScore,
                    score: resItem.score,
                    notes: resItem.notes || ''
                  };
                });
                setResponses(initialResp);
              }
              setIsInitialized(true);
            } else {
              router.push(`/subjects/${subjectId}`);
            }
          })
          .catch((err: any) => {
            console.error('Error loading test session:', err);
            router.push(`/subjects/${subjectId}`);
          })
          .finally(() => {
            setLoading(false);
          });
      })
      .catch((err: any) => {
        console.error('Error getting id token:', err);
        router.push(`/subjects/${subjectId}`);
      });
  }, [subjectId, sessionId, router, fbUser, authLoading]);

  // Periodic server authoritative timer sync
  const syncTimeWithServer = async (time: number) => {
    if (!sessionId || loading || !isInitialized) return;
    try {
      const token = await fbUser?.getIdToken();
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ timeRemaining: time })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.timeExpired || data.session?.status === 'completed') {
          setTimeLeft(0);
          handleSubmitExam(true, true);
        } else if (data.session?.timeRemaining !== undefined) {
          setTimeLeft(data.session.timeRemaining);
        }
      }
    } catch (e) {
      console.error("Error syncing timer with server:", e);
    }
  };

  // Sync current question index to database when it changes
  useEffect(() => {
    if (!isInitialized || loading || questions.length === 0 || !sessionId) return;
    
    fbUser?.getIdToken().then((token: string) => {
      fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ currentQuestionIndex: currentIdx })
      }).catch((e: any) => console.error("Error syncing question index:", e));
    }).catch((e: any) => console.error("Error getting token:", e));
  }, [currentIdx, sessionId, loading, questions.length, isInitialized, fbUser]);

  // Auto-fetch solution if the active question is already revealed but not loaded
  useEffect(() => {
    if (loading || questions.length === 0) return;
    const qId = questions[currentIdx]?._id;
    if (qId && revealedQuestions[qId] && !solutions[qId] && !solutionsLoading[qId]) {
      fetchSolutionForQuestion(qId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, revealedQuestions, solutions, loading, questions]);

  // Listen to window scroll events to toggle Scroll to Top / Bottom buttons
  useEffect(() => {
    const handleWindowScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      const isNearBottom = documentHeight - scrollY - windowHeight < 120;
      const isScrollable = documentHeight > windowHeight + 50;
      
      setShowScrollBottom(!isNearBottom && isScrollable);
      setShowScrollTop(scrollY > 200);
    };

    window.addEventListener('scroll', handleWindowScroll);
    // Initial check after a small delay to allow KaTeX layout calculations to finish
    const timer = setTimeout(handleWindowScroll, 150);

    return () => {
      window.removeEventListener('scroll', handleWindowScroll);
      clearTimeout(timer);
    };
  }, [currentIdx, revealedQuestions, solutions, loading]);

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Intercept browser back/navigation and close
  useEffect(() => {
    // Push dummy state to handle browser back button
    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      setShowLeaveModal(true);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [router, subjectId]);

  // Timer countdown with server-authoritative sync
  useEffect(() => {
    if (!isInitialized) return;
    if (timeLeft <= 0) {
      handleSubmitExam(true, true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const nextTime = prev - 1;
        if (nextTime <= 0) {
          clearInterval(timer);
          handleSubmitExam(true, true);
          return 0;
        }
        // Sync with server every 30 seconds to prevent client-side timer manipulation
        if (nextTime % 30 === 0) {
          syncTimeWithServer(nextTime);
        }
        return nextTime;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, sessionId, isInitialized]);

  // Anti-cheat event listeners
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches((prev) => {
          const val = prev + 1;
          triggerCheatWarning('Tab switch detected! Maintain focus on your test sandbox.');
          syncAntiCheatState({ tabSwitches: val });
          return val;
        });
      }
    };

    const handleWindowBlur = () => {
      setFocusLosses((prev) => {
        const val = prev + 1;
        triggerCheatWarning('Focus loss detected! Unapproved system interaction logged.');
        syncAntiCheatState({ focusLosses: val });
        return val;
      });
    };

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      if (!isCurrentlyFullscreen && isFullscreen) {
        setFullscreenExits((prev) => {
          const val = prev + 1;
          triggerCheatWarning('Exited focus mode. Standard test constraints breached.');
          syncAntiCheatState({ fullscreenExits: val });
          return val;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullscreen]);

  const triggerCheatWarning = (msg: string) => {
    setCheatNoticeMsg(msg);
    setShowCheatNotice(true);
    setTimeout(() => {
      setShowCheatNotice(false);
    }, 4000);
  };

  const syncAntiCheatState = async (payload: { tabSwitches?: number; focusLosses?: number; fullscreenExits?: number }) => {
    if (!sessionId) return;
    try {
      const token = await fbUser?.getIdToken();
      fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ testAnalytics: payload })
      }).catch((e) => console.error(e));
    } catch (e) {
      console.error("Error syncing anti cheat state:", e);
    }
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  const handleNotesChange = (text: string) => {
    const currentQId = currentQuestion._id || String(currentIdx);
    setUserNotes((prev) => ({
      ...prev,
      [currentQId]: text
    }));
  };

  const fetchSolutionForQuestion = async (qId: string) => {
    setSolutionsLoading(prev => ({ ...prev, [qId]: true }));
    try {
      const token = await fbUser?.getIdToken();
      const res = await fetch(`/api/ai/solve?questionId=${qId}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) throw new Error('Failed to load solution');
      const data = await res.json();
      if (data.solution) {
        setSolutions(prev => ({ ...prev, [qId]: data.solution }));
      } else {
        setSolutions(prev => ({ ...prev, [qId]: { error: true } }));
      }
    } catch (err) {
      console.error(err);
      setSolutions(prev => ({ ...prev, [qId]: { error: true } }));
    } finally {
      setSolutionsLoading(prev => ({ ...prev, [qId]: false }));
    }
  };

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleGradeResponse = async (selfScore: 'correct' | 'partial' | 'incorrect') => {
    const currentQ = questions[currentIdx];
    const qId = currentQ._id;
    const maxMarks = currentQ.marks || 10;
    let score = 0;
    if (selfScore === 'correct') score = maxMarks;
    else if (selfScore === 'partial') score = Math.round(maxMarks / 2);

    const updatedResponses = {
      ...responses,
      [qId]: {
        ...responses[qId],
        selfScore,
        score
      }
    };
    
    setResponses(updatedResponses);

    // Sync to backend immediately
    const testResponsesPayload = Object.keys(updatedResponses).map((key) => ({
      questionId: key,
      selfScore: updatedResponses[key].selfScore,
      score: updatedResponses[key].score,
      notes: updatedResponses[key].notes || ''
    }));

    try {
      const token = await fbUser?.getIdToken();
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          testResponses: testResponsesPayload
        })
      });
    } catch (err) {
      console.error('Error saving self-evaluation response:', err);
    }
  };

  const handleSubmitExam = async (isAutoSubmit = false, bypassConfirm = false) => {
    if (!isAutoSubmit && !bypassConfirm) {
      setShowSubmitModal(true);
      return;
    }

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    
    if (sessionId) {
      localStorage.removeItem(`test_time_left_${sessionId}`);
    }
    
    const totalQuestions = questions.length;
    const attemptedCount = evaluationMethod === 'self' 
      ? Object.keys(responses).filter((k) => responses[k].selfScore !== undefined).length
      : Object.keys(userNotes).filter((k) => userNotes[k].trim().length > 0).length;
      
    const timeSpentSeconds = durationParam * 60 - timeLeft;

    if (!sessionId) {
      router.push(`/subjects/${subjectId}`);
      return;
    }

    if (evaluationMethod === 'photo') {
      try {
        const token = await fbUser?.getIdToken();
        await fetch(`/api/sessions/${sessionId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            testAnalytics: { tabSwitches, focusLosses, fullscreenExits }
          })
        });
        
        sessionStorage.setItem('localTestSummary', JSON.stringify({
          totalQuestions,
          attemptedCount,
          timeSpentSeconds,
          tabSwitches,
          focusLosses,
          fullscreenExits
        }));

        router.push(`/subjects/${subjectId}/test/upload?sessionId=${sessionId}`);
      } catch (err) {
        console.error('Error submitting exam for photo upload:', err);
        router.push(`/subjects/${subjectId}/test/upload?sessionId=${sessionId}`);
      }
      return;
    }

    // Submit session updates to DB for Self-Evaluation
    try {
      // Calculate obtained and total marks
      const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 10), 0);
      const obtainedMarks = Object.keys(responses).reduce((sum, key) => sum + (responses[key].score || 0), 0);

      const evaluationResult = {
        totalMarks,
        obtainedMarks,
        summaryFeedback: `Self-Evaluation completed. You answered ${attemptedCount} of ${totalQuestions} questions. You rated your performance as ${obtainedMarks}/${totalMarks} total marks. Check the breakdown below to review your answers.`,
        details: questions.map((q) => ({
          questionId: q._id,
          marksAwarded: responses[q._id]?.score || 0,
          feedback: `Self-graded as ${responses[q._id]?.selfScore || 'not answered'}.`
        }))
      };

      const testResponsesPayload = Object.keys(responses).map((key) => ({
        questionId: key,
        selfScore: responses[key].selfScore,
        score: responses[key].score,
        notes: responses[key].notes || ''
      }));

      const token = await fbUser?.getIdToken();
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          status: 'completed',
          testAnalytics: { tabSwitches, focusLosses, fullscreenExits },
          testResponses: testResponsesPayload,
          evaluationResult
        })
      });
      
      sessionStorage.setItem('localTestSummary', JSON.stringify({
        totalQuestions,
        attemptedCount,
        timeSpentSeconds,
        tabSwitches,
        focusLosses,
        fullscreenExits
      }));
      
      router.push(`/subjects/${subjectId}/test/summary?sessionId=${sessionId}`);
    } catch (err) {
      console.error('Error submitting exam:', err);
      router.push(`/subjects/${subjectId}/test/summary`);
    }
  };

  if (isLoaderVisible) {
    return (
      <SessionLoader 
        type="test"
        isDataReady={!loading}
        onFinished={() => setIsLoaderVisible(false)}
      />
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary text-text-primary p-6 text-center">
        <QuestionIcon className="w-12 h-12 text-text-muted mb-4 animate-pulse" />
        <h2 className="font-display font-bold text-xl mb-2">No Test Questions Seeded</h2>
        <p className="text-sm text-text-secondary max-w-sm mb-6">
          Unable to pull exam papers for this subject.
        </p>
        <Link href={`/subjects/${subjectId}`} className="px-6 py-2.5 bg-accent text-white font-medium rounded-lg">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const currentQId = currentQuestion._id;
  const currentNote = userNotes[currentQId] || '';

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: 'spring' as const, 
        stiffness: 90, 
        damping: 15 
      } 
    }
  };

  const isTimeUrgent = timeLeft < 300;
  const isTimeCritical = timeLeft < 60;

  return (
    <div 
      className="min-h-screen flex flex-col justify-between bg-bg-primary text-text-primary transition-colors duration-300 relative overflow-hidden"
      ref={containerRef}
    >
      {/* Background ambient space glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-accent/8 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-[450px] h-[450px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />

      {/* Timed test header */}
      <header className="border-b border-border-primary/45 bg-bg-secondary/70 backdrop-blur-xl h-16 px-4 md:px-6 flex items-center justify-between sticky top-0 z-50 shadow-lg shadow-black/5">
        <div className="flex items-center space-x-2 md:space-x-4">
          <span className="font-display font-black text-xs md:text-sm tracking-widest uppercase bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent hover:scale-105 transition-all duration-300 select-none flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
            <span className="hidden xs:inline">Exam Arena</span>
          </span>
          <span className="text-border-primary/60 hidden xs:inline">|</span>
          <nav className="flex items-center space-x-1 md:space-x-2 text-[10px] md:text-xs text-text-secondary font-semibold">
            <span>Q. <span className="text-accent font-extrabold">{currentIdx + 1}</span> of <span className="text-text-primary font-extrabold">{questions.length}</span></span>
          </nav>
        </div>

        {/* Action Widgets */}
        <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-6">
          {/* Timer Countdown Widget */}
          <div className={`flex items-center space-x-1.5 md:space-x-2.5 font-mono text-xs md:text-sm font-bold bg-bg-secondary/40 border px-2 py-1 md:px-3.5 md:py-1.5 rounded-xl shadow-xl transition-all duration-300 ${
            isTimeCritical 
              ? 'border-red-500 text-red-500 animate-bounce shadow-red-500/10' 
              : isTimeUrgent 
                ? 'border-yellow-500 text-yellow-500 shadow-yellow-500/10 animate-pulse' 
                : 'border-accent/25 text-text-primary shadow-accent/5'
          }`}>
            <Clock className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isTimeCritical ? 'text-red-500' : isTimeUrgent ? 'text-yellow-500' : 'text-accent'} animate-pulse`} />
            <span>{formatTimer(timeLeft)}</span>
          </div>

          {/* Download Blank Question Paper PDF */}
          <button
            onClick={async () => {
              try {
                // Fetch full session details with populated questions
                const token = await fbUser?.getIdToken();
                const res = await fetch(`/api/sessions/${sessionId}`, {
                  headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                  }
                });
                if (res.ok) {
                  const data = await res.json();
                  const mappedSession = {
                    ...data.session,
                    questions: data.session.questions.map((q: any) => ({
                      _id: q._id,
                      unit: q.unit,
                      topic: q.topic,
                      questionText: q.questionText,
                      marks: q.marks || 10
                    }))
                  };
                  await generateTestPaperPDF(
                    mappedSession,
                    'Mock Sessional Examination',
                    subjectId.slice(-6).toUpperCase(),
                    data.session.subType || 'Mock Exam',
                    durationParam
                  );
                }
              } catch (err) {
                console.error('Failed to download question paper:', err);
              }
            }}
            className="p-2 rounded-xl border border-border-primary/80 bg-bg-secondary/50 hover:bg-bg-tertiary text-text-secondary hover:text-text-primary hover:border-accent/40 shadow-sm transition-all duration-300"
            title="Download Question Paper PDF"
          >
            <Download className="w-4 h-4 text-emerald-400" />
          </button>

          {/* Fullscreen focus button */}
          <button
            onClick={toggleFullscreen}
            className="hidden sm:inline-flex p-2 rounded-xl border border-border-primary/80 bg-bg-secondary/50 hover:bg-bg-tertiary text-text-secondary hover:text-text-primary hover:border-accent/40 shadow-sm transition-all duration-300"
            title={isFullscreen ? 'Exit Focus Mode' : 'Enter Focus Mode'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Theme Toggle Button */}
          <ThemeToggle />

          <button
            onClick={() => handleSubmitExam(false)}
            className="px-2.5 py-1.5 sm:px-5 sm:py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold text-[10px] md:text-xs hover:from-rose-600 hover:to-red-700 hover:shadow-lg hover:shadow-rose-500/25 hover:scale-[1.03] active:scale-95 transition-all duration-300 shadow-md border border-rose-400/20"
          >
            <span className="hidden xs:inline">Submit Exam</span>
            <span className="xs:hidden">Submit</span>
          </button>
        </div>
      </header>

      {/* Main timed test layout */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 items-start">
        
        {/* Left Side: Question Sheet (lg:col-span-5) */}
        <motion.div 
          key={`question-${currentIdx}`}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5 p-6 md:p-8 rounded-2xl border border-border-primary/80 bg-gradient-to-br from-bg-secondary/40 via-bg-secondary/60 to-bg-secondary/40 backdrop-blur-xl shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[520px] transition-all duration-300 hover:border-accent/30 group"
        >
          <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full bg-accent/5 blur-2xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] uppercase font-black tracking-wider px-3 py-1.5 rounded-lg border border-accent/25 bg-accent/5 text-accent shadow-sm flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 animate-pulse text-accent" />
                Unit {currentQuestion.unit} • Descriptive
              </span>
              <span className="text-[10px] uppercase font-black px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-500 dark:text-yellow-400 border border-yellow-500/20 shadow-sm flex items-center gap-1">
                <BadgeCheck className="w-3.5 h-3.5 text-yellow-500 dark:text-yellow-400" />
                {currentQuestion.marks ? `${currentQuestion.marks} Marks` : '10 Marks'}
              </span>
            </div>
            
            <div className="p-6 rounded-xl border border-border-primary/45 bg-bg-primary/25 backdrop-blur-md leading-relaxed shadow-inner group-hover:border-accent/20 transition-all duration-300">
              <MathMarkdown content={currentQuestion.questionText} />
            </div>
          </div>

          {/* Guidelines */}
          <div className="border-t border-border-primary/30 pt-5 mt-6 text-[10px] text-text-secondary flex items-start space-x-3 bg-bg-primary/10 p-3 rounded-lg border border-border-primary/20">
            <div className="p-1.5 rounded-lg bg-accent/10 text-accent border border-accent/25 shadow-sm">
              <PenTool className="w-3.5 h-3.5" />
            </div>
            <p className="leading-relaxed">
              {evaluationMethod === 'self' 
                ? "Solve this descriptive question on paper. Click 'Show Model Solution' when you are ready to compare and self-grade your answer."
                : "Write the detailed descriptive resolution on your physical sheet. Use the scratchpad on the right to outline your derivation parameters."}
            </p>
          </div>
        </motion.div>

        {/* Right Side: Evaluation / Outline (lg:col-span-7) */}
        {evaluationMethod === 'self' ? (
          <motion.div 
            key={`sol-panel-${currentIdx}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
            className="lg:col-span-7 p-6 md:p-8 rounded-2xl border border-border-primary/80 bg-bg-secondary/40 backdrop-blur-xl shadow-2xl transition-all duration-300 min-h-[520px] overflow-hidden flex flex-col justify-between hover:border-accent/20"
          >
            <div className="flex-grow flex flex-col h-full overflow-y-auto pr-1">
              {!revealedQuestions[currentQuestion._id] ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center space-y-8 py-12 relative">
                  {/* Glowing blurred background elements */}
                  <div className="absolute inset-0 flex flex-col justify-center items-center opacity-10 pointer-events-none select-none">
                    <div className="w-full max-w-md h-3 bg-text-secondary/30 rounded mb-3 animate-pulse" />
                    <div className="w-full max-w-xs h-3 bg-text-secondary/30 rounded mb-6 animate-pulse" />
                    <div className="w-32 h-16 bg-accent/20 rounded border border-accent/20 mb-6 flex items-center justify-center">
                      <span className="font-mono text-[10px] text-accent">{"$$\\int x\\,dx = \\frac{x^2}{2} + C$$"}</span>
                    </div>
                    <div className="w-full max-w-sm h-3 bg-text-secondary/30 rounded mb-3" />
                    <div className="w-full max-w-md h-3 bg-text-secondary/30 rounded" />
                  </div>

                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/10 to-purple-500/10 border border-accent/30 flex items-center justify-center text-accent shadow-[0_0_30px_rgba(124,102,255,0.25)] relative transition-transform duration-500 hover:scale-105">
                    <div className="absolute inset-0 rounded-2xl border border-accent/30 animate-pulse" />
                    <Lock className="w-9 h-9 text-accent drop-shadow-[0_0_8px_rgba(124,102,255,0.5)]" />
                  </div>
                  
                  <div className="space-y-3 max-w-sm relative z-10">
                    <h3 className="font-display font-black text-xl text-text-primary tracking-wide">Model Answer Locked</h3>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Complete your calculation on paper, then unlock the syllabus-compliant model derivation to check your steps and self-grade.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const qId = currentQuestion._id;
                      setRevealedQuestions(prev => ({ ...prev, [qId]: true }));
                      if (!solutions[qId]) {
                        fetchSolutionForQuestion(qId);
                      }

                      // Sync viewedSolution to database history
                      const updatedHistory = history.map((item: HistoryEntry) => {
                        const itemQId = typeof item.questionId === 'object' && item.questionId !== null ? (item.questionId as { _id: string })._id : item.questionId;
                        if (itemQId === qId) {
                          return { ...item, viewedSolution: true };
                        }
                        return item;
                      });
                      setHistory(updatedHistory);
                      
                      fetch(`/api/sessions/${sessionId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ history: updatedHistory })
                      }).catch(e => console.error("Error syncing history:", e));
                    }}
                    className="relative z-10 px-8 py-4 rounded-xl bg-gradient-to-r from-accent to-purple-600 text-white font-extrabold text-xs tracking-wider uppercase shadow-[0_8px_20px_rgba(124,102,255,0.25)] hover:shadow-[0_8px_25px_rgba(124,102,255,0.4)] hover:scale-105 hover:-translate-y-0.5 active:scale-95 transition-all duration-300 border-0 flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-white animate-spin-slow" />
                    <span>Show Model Solution</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-border-primary/40 pb-3">
                    <h3 className="font-display font-black text-sm tracking-wide text-text-primary bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                      Model Solution
                    </h3>
                    <span className="text-[9px] px-2.5 py-1 rounded-md bg-accent/10 text-accent border border-accent/20 uppercase tracking-widest font-black">
                      {solutions[currentQuestion._id]?.type || 'descriptive'}
                    </span>
                  </div>

                  {solutionsLoading[currentQuestion._id] ? (
                    <div className="py-24 text-center space-y-4">
                      <div className="w-10 h-10 rounded-full border-2 border-accent/20 border-t-accent animate-spin mx-auto" />
                      <p className="text-xs text-text-secondary animate-pulse">Generating premium model answer...</p>
                    </div>
                  ) : (
                    <div className="text-xs text-text-secondary space-y-5">
                      {solutions[currentQuestion._id] && !solutions[currentQuestion._id].error ? (
                        <>
                          <div className="leading-relaxed bg-bg-primary/20 backdrop-blur-md p-5 rounded-xl border border-border-primary/45 shadow-sm">
                            <MathMarkdown content={solutions[currentQuestion._id].content || ''} />
                          </div>
                          
                          {solutions[currentQuestion._id]?.steps && (solutions[currentQuestion._id]?.steps?.length ?? 0) > 0 && (
                            <div className="space-y-5 mt-6">
                              <h4 className="font-black text-text-primary text-xs uppercase tracking-wider pl-1 border-l-2 border-accent flex items-center gap-1.5">
                                <Trophy className="w-3.5 h-3.5 text-accent animate-pulse" />
                                <span>Evaluation Steps:</span>
                              </h4>
                              
                              {/* Step Timeline */}
                              <motion.div 
                                variants={containerVariants}
                                initial="hidden"
                                animate="show"
                                className="relative border-l border-border-primary/30 pl-6 ml-3 space-y-6 mt-4"
                              >
                                {solutions[currentQuestion._id]?.steps?.map((step: SolutionStep, sIdx: number) => (
                                  <motion.div 
                                    key={sIdx} 
                                    variants={itemVariants}
                                    className="relative group"
                                  >
                                    {/* Timeline Circle */}
                                    <span className="absolute -left-[35px] top-0 w-6 h-6 rounded-full bg-bg-secondary border border-accent text-accent shadow-[0_0_12px_rgba(124,102,255,0.3)] flex items-center justify-center text-xs font-black select-none z-10 transition-transform duration-300 group-hover:scale-110">
                                      {step.stepNumber}
                                    </span>
                                    
                                    {/* Step Card */}
                                    <div className="p-5 rounded-2xl border border-border-primary bg-bg-primary/25 backdrop-blur-md hover:border-accent/30 hover:bg-accent/[0.015] hover:shadow-lg transition-all duration-300 space-y-3">
                                      <div className="text-xs font-black text-text-primary tracking-wide flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                                        {step.heading}
                                      </div>
                                      <div className="text-[11px] leading-relaxed text-text-secondary">
                                        <MathMarkdown content={step.content} />
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                              </motion.div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 border border-rose-500/20 bg-rose-500/5 rounded-xl p-6">
                          <AlertTriangle className="w-8 h-8 text-rose-500 animate-pulse" />
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-text-primary">Failed to load model solution</p>
                            <p className="text-[10px] text-text-secondary">There was an issue retrieving the derivation steps from the server.</p>
                          </div>
                          <button
                            onClick={() => fetchSolutionForQuestion(currentQuestion._id)}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold text-xs hover:from-rose-600 hover:to-red-700 hover:shadow-lg hover:shadow-rose-500/25 active:scale-95 transition-all duration-300 shadow-md border border-rose-400/20"
                          >
                            Retry Loading
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rating Dashboard */}
                  {!solutionsLoading[currentQuestion._id] && solutions[currentQuestion._id] && !solutions[currentQuestion._id].error && (
                    <div className="mt-8 border-t border-border-primary/40 pt-6 space-y-5 bg-gradient-to-b from-bg-primary/20 to-bg-primary/45 -mx-6 md:-mx-8 px-6 md:px-8 pb-4 rounded-b-2xl border-x-0">
                      <div className="text-center space-y-1">
                        <h4 className="font-display font-black text-[11px] text-text-primary uppercase tracking-widest flex items-center justify-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                          <span>Self-Grade Your Answer</span>
                        </h4>
                        <p className="text-[10px] text-text-muted">Rate your response honestly based on the model steps above.</p>
                      </div>

                      <div className="grid grid-cols-3 gap-3.5">
                        {([
                          { 
                            id: 'correct', 
                            label: 'Fully Correct', 
                            desc: '100% Marks', 
                            icon: CheckCircle2,
                            color: 'border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-emerald-500/80', 
                            activeColor: 'border-emerald-500 bg-emerald-500/10 text-emerald-400 dark:text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)] font-extrabold border-2' 
                          },
                          { 
                            id: 'partial', 
                            label: 'Partially Correct', 
                            desc: '50% Marks', 
                            icon: AlertTriangle,
                            color: 'border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/5 text-amber-500/80', 
                            activeColor: 'border-amber-500 bg-amber-500/10 text-amber-400 dark:text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.15)] font-extrabold border-2' 
                          },
                          { 
                            id: 'incorrect', 
                            label: 'Incorrect', 
                            desc: '0% Marks', 
                            icon: XCircle,
                            color: 'border-rose-500/20 hover:border-rose-500/50 hover:bg-rose-500/5 text-rose-500/80', 
                            activeColor: 'border-rose-500 bg-rose-500/10 text-rose-400 dark:text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.15)] font-extrabold border-2' 
                          }
                        ] as const).map((opt) => {
                          const active = responses[currentQuestion._id]?.selfScore === opt.id;
                          const Icon = opt.icon;
                          return (
                            <motion.button
                              key={opt.id}
                              type="button"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleGradeResponse(opt.id)}
                              className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all duration-300 ${
                                active ? opt.activeColor : `bg-bg-primary/20 text-text-secondary ${opt.color}`
                              }`}
                            >
                              <Icon className={`w-4 h-4 mb-1.5 transition-transform duration-300 ${active ? 'scale-110 rotate-[360deg]' : 'opacity-70'}`} />
                              <span className="text-[10px] font-black">{opt.label}</span>
                              <span className="text-[8px] uppercase tracking-wider font-bold opacity-75 mt-0.5">{opt.desc}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            
          </motion.div>
        ) : (
          /* Photo upload solver view */
          <motion.div 
            key={`notes-panel-${currentIdx}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
            className="lg:col-span-7 p-6 md:p-8 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-xl shadow-2xl transition-all duration-300 min-h-[520px] flex flex-col justify-between hover:border-accent/20"
          >
            <div className="space-y-6">
              {/* Exam Info Card */}
              <div className="p-5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 space-y-2.5">
                <h4 className="text-xs font-black text-yellow-600 dark:text-yellow-400 flex items-center space-x-1.5 uppercase tracking-widest">
                  <span>📝 Offline Answer Sheet Mode</span>
                </h4>
                <p className="text-[10px] text-text-secondary leading-relaxed">
                  Solve your answers on physical paper sheets. Draw clear margins, write question numbers visibly (e.g., <strong>&quot;Ans 1&quot;</strong>), and keep the writing neat. 
                  Once the exam ends or you submit, you will use our premium visual captures flow to submit your pages.
                </p>
              </div>

              <div className="flex-grow flex flex-col h-full">
                <h3 className="font-display font-black text-xs uppercase tracking-wider text-text-secondary mb-3 flex items-center space-x-2">
                  <span className="p-1.5 rounded-lg bg-accent/5 text-accent border border-accent/15 shadow-sm">
                    <PenTool className="w-3.5 h-3.5" />
                  </span>
                  <span>Scratchpad Outline</span>
                </h3>
                
                <textarea
                  value={currentNote}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Outline your steps, write down variables, matrices equations, or type pseudo-code here..."
                  className="w-full p-4 rounded-xl bg-bg-primary/50 text-xs font-mono border border-border-primary/80 text-text-primary focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20 transition-all duration-200 resize-none min-h-[240px]"
                />
              </div>
            </div>
            
            <div className="mt-4 flex justify-between items-center text-[10px] text-text-muted pt-4 border-t border-border-primary/30">
              <span>Notes auto-saved per question.</span>
              <span>Character Count: <span className="text-text-secondary font-bold">{currentNote.length}</span></span>
            </div>
          </motion.div>
        )}

        {/* Subtle Floating Anti-Cheat Warnings */}
        <AnimatePresence>
          {showCheatNotice && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 flex items-center space-x-2.5 px-5 py-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 text-yellow-500 dark:text-yellow-400 text-xs font-bold shadow-2xl backdrop-blur-md"
            >
              <ShieldAlert className="w-4 h-4 flex-shrink-0 animate-bounce" />
              <span>{cheatNoticeMsg} (Focus Breaches: <span className="font-bold">{tabSwitches + focusLosses}</span>)</span>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom control row */}
      <footer className="border-t border-border-primary/45 bg-bg-secondary/80 backdrop-blur-md py-4 px-6 flex items-center justify-between sticky bottom-0 z-40">
        <div className="flex items-center space-x-2">
          {/* Integrity indicators */}
          <div className="flex items-center space-x-2 text-[9px] uppercase tracking-wider font-extrabold text-text-secondary bg-bg-primary/50 border border-border-primary/60 px-3 py-1.5 rounded-lg shadow-sm">
            <span>Security Violations:</span>
            <span className={`font-bold ${tabSwitches + focusLosses > 0 ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>
              {tabSwitches + focusLosses}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3.5">
          <button
            onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
            disabled={currentIdx === 0}
            className="px-4 py-2 rounded-xl border border-border-primary/80 bg-bg-secondary/50 hover:bg-bg-tertiary text-xs font-black text-text-primary hover:text-accent transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
          
          <button
            onClick={() => setCurrentIdx(Math.min(questions.length - 1, currentIdx + 1))}
            disabled={currentIdx === questions.length - 1}
            className="px-4 py-2 rounded-xl border border-border-primary/80 bg-bg-secondary/50 hover:bg-bg-tertiary text-xs font-black text-text-primary hover:text-accent transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95 flex items-center gap-1.5"
          >
            <span>Next</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </footer>

      {/* Premium In-website Leave Confirmation Dialog */}
      <AnimatePresence>
        {showLeaveModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-bg-secondary/95 border border-border-primary/80 max-w-sm w-full p-6 rounded-2xl shadow-2xl flex flex-col items-center text-center space-y-5"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/5 border border-accent/20 flex items-center justify-center text-accent shadow-sm shadow-accent/5">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-bold text-base text-text-primary">Leave Exam?</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Are you sure you want to leave the exam? Your progress will not be saved.
                </p>
              </div>
              <div className="flex items-center space-x-3 w-full pt-2">
                <button
                  onClick={() => setShowLeaveModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-border-primary bg-bg-primary hover:bg-bg-tertiary text-xs font-bold text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (sessionId) {
                      localStorage.removeItem(`test_time_left_${sessionId}`);
                    }
                    setShowLeaveModal(false);
                    router.push(`/subjects/${subjectId}`);
                  }}
                  className="flex-1 py-2.5 rounded-lg bg-accent text-white hover:bg-accent-hover text-xs font-bold transition-all shadow-md shadow-accent/10"
                >
                  Leave
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Premium In-website Submit Confirmation Dialog */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-bg-secondary/95 border border-border-primary/80 max-w-sm w-full p-6 rounded-2xl shadow-2xl flex flex-col items-center text-center space-y-5"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/5 border border-accent/20 flex items-center justify-center text-accent shadow-sm shadow-accent/5">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-bold text-base text-text-primary">Submit Exam Sheet?</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Are you sure you want to submit your exam sheet and end this session?
                </p>
              </div>
              <div className="flex items-center space-x-3 w-full pt-2">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-border-primary bg-bg-primary hover:bg-bg-tertiary text-xs font-bold text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowSubmitModal(false);
                    handleSubmitExam(false, true);
                  }}
                  className="flex-1 py-2.5 rounded-lg bg-accent text-white hover:bg-accent-hover text-xs font-bold transition-all shadow-md shadow-accent/10"
                >
                  Submit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Viewport-Fixed Scroll Stack Container */}
      <div className="fixed bottom-24 right-8 z-[99] flex flex-col gap-3.5">
        {/* Scroll to Top Button */}
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={scrollToTop}
              className="p-3 rounded-full bg-gradient-to-r from-accent to-purple-600 text-white shadow-[0_4px_20px_rgba(124,102,255,0.4)] border border-accent/30 hover:shadow-[0_6px_25px_rgba(124,102,255,0.6)] hover:border-accent/60 transition-all duration-300 flex items-center justify-center cursor-pointer"
              title="Scroll to Top"
            >
              <ArrowUp className="w-5 h-5 animate-pulse" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Scroll to Bottom Button */}
        <AnimatePresence>
          {showScrollBottom && (
            <motion.button
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={scrollToBottom}
              className="p-3 rounded-full bg-gradient-to-r from-accent to-purple-600 text-white shadow-[0_4px_20px_rgba(124,102,255,0.4)] border border-accent/30 hover:shadow-[0_6px_25px_rgba(124,102,255,0.6)] hover:border-accent/60 transition-all duration-300 flex items-center justify-center cursor-pointer"
              title="Scroll to Bottom"
            >
              <ArrowDown className="w-5 h-5 animate-bounce" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
