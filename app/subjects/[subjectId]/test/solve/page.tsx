'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const MathMarkdown = dynamic(() => import('@/components/math-markdown').then((mod) => mod.MathMarkdown), {
  ssr: false,
  loading: () => <div className="animate-pulse h-12 bg-bg-secondary rounded-lg border border-border-primary/50 w-full" />,
});
import { 
  Clock, 
  ShieldAlert, 
  Maximize2, 
  Minimize2, 
  PenTool, 
  Loader2,
  HelpCircle as QuestionIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

  // URL parameters
  const sessionId = searchParams.get('sessionId');
  const durationParam = parseInt(searchParams.get('duration') || '90', 10);

  interface TestQuestion {
    _id?: string;
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
  const [timeLeft, setTimeLeft] = useState(durationParam * 60); // seconds
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userNotes, setUserNotes] = useState<{[key: string]: string}>({});

  // Anti-cheat trackers
  const [tabSwitches, setTabSwitches] = useState(0);
  const [focusLosses, setFocusLosses] = useState(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [showCheatNotice, setShowCheatNotice] = useState(false);
  const [cheatNoticeMsg, setCheatNoticeMsg] = useState('');

  // Refs for requestAnimationFrame / timers
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load questions
  useEffect(() => {
    if (!sessionId) {
      router.push(`/subjects/${subjectId}`);
      return;
    }

    fetch(`/api/sessions/${sessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load session');
        return res.json();
      })
      .then((data) => {
        if (data.session && data.session.questions) {
          setQuestions(data.session.questions);
          setCurrentIdx(data.session.currentQuestionIndex || 0);
        } else {
          router.push(`/subjects/${subjectId}`);
        }
      })
      .catch((err) => {
        console.error('Error loading test session:', err);
        router.push(`/subjects/${subjectId}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [subjectId, sessionId, router]);

  // Intercept browser back/navigation and close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Push dummy state to handle browser back button
    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      const confirm = window.confirm("Are you sure you want to leave the exam? Your progress will not be saved.");
      if (confirm) {
        router.push(`/subjects/${subjectId}`);
      } else {
        window.history.pushState(null, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [router, subjectId]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmitExam(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

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
    // Hide notice after 4 seconds
    setTimeout(() => {
      setShowCheatNotice(false);
    }, 4000);
  };

  const syncAntiCheatState = async (payload: { tabSwitches?: number; focusLosses?: number; fullscreenExits?: number }) => {
    if (!sessionId) return;
    // PUT API updates to database
    fetch(`/api/sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testAnalytics: payload })
    }).catch((e) => console.error(e));
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
    const currentQId = currentQuestion._id || currentIdx;
    setUserNotes((prev) => ({
      ...prev,
      [currentQId]: text
    }));
  };

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmitExam = async (isAutoSubmit = false) => {
    if (!isAutoSubmit) {
      const confirm = window.confirm("Are you sure you want to submit your exam sheet and end this session?");
      if (!confirm) return;
    }

    // Exit fullscreen if active
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    
    // Save attempts stats
    const totalQuestions = questions.length;
    const attemptedCount = Object.keys(userNotes).filter((k) => userNotes[k].trim().length > 0).length;
    const timeSpentSeconds = durationParam * 60 - timeLeft;

    if (!sessionId) {
      router.push(`/subjects/${subjectId}`);
      return;
    }

    // Submit session updates to DB
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
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
      
      router.push(`/subjects/${subjectId}/test/summary?sessionId=${sessionId}`);
    } catch (err) {
      console.error('Error submitting exam:', err);
      router.push(`/subjects/${subjectId}/test/summary`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
          <p className="text-xs text-text-secondary">Loading your exam sheet...</p>
        </div>
      </div>
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
  const currentQId = currentQuestion._id || currentIdx;
  const currentNote = userNotes[currentQId] || '';

  return (
    <div 
      className="min-h-screen flex flex-col justify-between bg-bg-primary text-text-primary transition-colors duration-300 relative overflow-hidden"
      ref={containerRef}
    >
      {/* Background ambient space glows */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/3 blur-[120px] pointer-events-none" />

      {/* timed test header */}
      <header className="border-b border-border-primary/50 bg-bg-secondary/80 backdrop-blur-md h-16 px-6 flex items-center justify-between sticky top-0 z-50 transition-all">
        <div className="flex items-center space-x-4">
          <span className="font-display font-bold text-sm tracking-tight text-accent dark:gradient-heading">Exam Arena</span>
          <span className="text-text-muted">|</span>
          <nav className="flex items-center space-x-2 text-xs text-text-secondary font-medium">
            <span>Q. <span className="text-accent font-semibold">{currentIdx + 1}</span> of <span className="text-text-primary font-semibold">{questions.length}</span></span>
          </nav>
        </div>

        {/* Action Widgets */}
        <div className="flex items-center space-x-6">
          {/* Timer Countdown */}
          <div className="flex items-center space-x-2 text-text-primary font-mono text-sm font-semibold bg-bg-secondary/80 backdrop-blur-sm border border-border-primary px-3 py-1.5 rounded-lg shadow-sm">
            <Clock className="w-4 h-4 text-accent animate-pulse" />
            <span>{formatTimer(timeLeft)}</span>
          </div>

          {/* Fullscreen focus button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg border border-border-primary bg-bg-secondary/50 hover:bg-bg-tertiary text-text-secondary transition-all hover:text-text-primary duration-200"
            title={isFullscreen ? 'Exit Focus Mode' : 'Enter Focus Mode'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => handleSubmitExam(false)}
            className="px-4 py-2 rounded-lg bg-red-600/90 text-white font-semibold text-xs hover:bg-red-600 transition-all duration-200 shadow-sm shadow-red-900/10 hover:shadow-red-600/20 hover:scale-[1.02]"
          >
            Submit Exam
          </button>
        </div>
      </header>

      {/* Main timed test layout */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        
        {/* Left Side: Question Sheet */}
        <div className="p-6 md:p-8 rounded-xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm glow-hover flex flex-col justify-between shadow-lg min-h-[480px] transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded badge-premium">
                Descriptive Written Question • Unit {currentQuestion.unit}
              </span>
              <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded bg-yellow-500/10 text-yellow-500 dark:text-yellow-400 border border-yellow-500/20">
                {currentQuestion.marks ? `${currentQuestion.marks} Marks` : '10 Marks'}
              </span>
            </div>
            
            <div className="prose dark:prose-invert max-w-none text-text-primary leading-relaxed my-6">
              <MathMarkdown content={currentQuestion.questionText} />
            </div>
          </div>

          {/* Guidelines */}
          <div className="border-t border-border-primary/40 pt-4 text-[10px] text-text-secondary flex items-start space-x-2.5">
            <div className="p-1 rounded-md bg-accent/5 text-accent border border-accent/15">
              <PenTool className="w-3.5 h-3.5" />
            </div>
            <p className="leading-normal">
              Please write the detailed descriptive step-by-step resolution on your physical examination sheet. Use the scratchpad on the right to outline your derivation parameters or scratch math.
            </p>
          </div>
        </div>

        {/* Right Side: Outline / Scratchpad */}
        <div className="p-6 md:p-8 rounded-xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm glow-hover flex flex-col justify-between shadow-lg transition-all duration-300">
          <div className="flex-grow flex flex-col h-full">
            <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-text-secondary mb-3 flex items-center space-x-2">
              <span className="p-1 rounded bg-accent/5 text-accent border border-accent/15">
                <PenTool className="w-3.5 h-3.5" />
              </span>
              <span>Scratchpad Outline</span>
            </h3>
            
            <textarea
              value={currentNote}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Outline your steps, write down variables, matrices equations, or type pseudo-code here..."
              className="w-full flex-grow p-4 rounded-lg bg-bg-primary/50 text-xs font-mono border border-border-primary/80 text-text-primary focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20 transition-all duration-200 resize-none min-h-[320px]"
            />
          </div>
          
          <div className="mt-4 flex justify-between items-center text-[10px] text-text-muted">
            <span>Notes auto-saved per question.</span>
            <span>Character Count: <span className="text-text-secondary font-semibold">{currentNote.length}</span></span>
          </div>
        </div>

        {/* Subtle Floating Anti-Cheat Warnings */}
        <AnimatePresence>
          {showCheatNotice && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 flex items-center space-x-2.5 px-4.5 py-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 text-yellow-500 dark:text-yellow-400 text-xs font-semibold shadow-xl backdrop-blur-md"
            >
              <ShieldAlert className="w-4 h-4 flex-shrink-0 animate-bounce" />
              <span>{cheatNoticeMsg} (Focus Breaches: <span className="font-bold">{tabSwitches + focusLosses}</span>)</span>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom control row */}
      <footer className="border-t border-border-primary/50 bg-bg-secondary/60 backdrop-blur-md py-4 px-6 flex items-center justify-between sticky bottom-0 z-40">
        <div className="flex items-center space-x-2">
          {/* Integrity indicators */}
          <div className="flex items-center space-x-1.5 text-[9px] uppercase tracking-wider font-semibold text-text-secondary bg-bg-secondary/40 border border-border-primary/50 px-2.5 py-1 rounded-md">
            <span>Security Violations:</span>
            <span className={`font-bold ${tabSwitches + focusLosses > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {tabSwitches + focusLosses}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
            disabled={currentIdx === 0}
            className="px-4 py-2 rounded-lg border border-border-primary bg-bg-secondary/50 hover:bg-bg-tertiary text-xs font-bold text-text-primary hover:text-accent transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-text-primary"
          >
            Previous
          </button>
          
          <button
            onClick={() => setCurrentIdx(Math.min(questions.length - 1, currentIdx + 1))}
            disabled={currentIdx === questions.length - 1}
            className="px-4 py-2 rounded-lg border border-border-primary bg-bg-secondary/50 hover:bg-bg-tertiary text-xs font-bold text-text-primary hover:text-accent transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-text-primary"
          >
            Next
          </button>
        </div>
      </footer>
    </div>
  );
}

