'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MathMarkdown } from '@/components/math-markdown';
import { seedQuestions } from '@/lib/seedData';
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
  const countParam = parseInt(searchParams.get('count') || '5', 10);

  interface TestQuestion {
    _id?: string;
    unit: number;
    topic: string;
    questionText: string;
    difficulty: string;
    repetitionFrequency: number;
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
    const isLocalFallback = localStorage.getItem('useLocalFallback') === 'true' || !sessionId;

    if (isLocalFallback) {
      const subjectCode = subjectId.replace('mock-', '');
      const filtered = seedQuestions.filter((q) => q.subjectCode === subjectCode);
      const shuffled = [...filtered].sort(() => 0.5 - Math.random());
      setQuestions(shuffled.slice(0, countParam));
      setLoading(false);
    } else {
      fetch(`/api/sessions/${sessionId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.session && data.session.questions) {
            setQuestions(data.session.questions);
            setCurrentIdx(data.session.currentQuestionIndex || 0);
          } else {
            router.push(`/subjects/${subjectId}`);
          }
        })
        .catch(() => {
          router.push(`/subjects/${subjectId}`);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [subjectId, sessionId, countParam, router]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmitExam();
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
    const isLocalFallback = localStorage.getItem('useLocalFallback') === 'true' || !sessionId;
    if (isLocalFallback) {
      // Save in session storage to display in local mock summary
      const saved = JSON.parse(sessionStorage.getItem('localTestAnalytics') || '{"tabSwitches":0,"focusLosses":0,"fullscreenExits":0}');
      const merged = { ...saved, ...payload };
      sessionStorage.setItem('localTestAnalytics', JSON.stringify(merged));
    } else {
      // PUT API updates to database
      fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testAnalytics: payload })
      }).catch((e) => console.error(e));
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

  const handleSubmitExam = async () => {
    // Exit fullscreen if active
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    const isLocalFallback = localStorage.getItem('useLocalFallback') === 'true' || !sessionId;
    
    // Save attempts stats
    const totalQuestions = questions.length;
    const attemptedCount = Object.keys(userNotes).filter((k) => userNotes[k].trim().length > 0).length;
    const timeSpentSeconds = durationParam * 60 - timeLeft;

    if (isLocalFallback) {
      sessionStorage.setItem('localTestSummary', JSON.stringify({
        totalQuestions,
        attemptedCount,
        timeSpentSeconds,
        tabSwitches,
        focusLosses,
        fullscreenExits
      }));
      router.push(`/subjects/${subjectId}/test/summary`);
    } else {
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
      } catch {
        router.push(`/subjects/${subjectId}/test/summary`);
      }
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
      className="min-h-screen flex flex-col justify-between bg-bg-primary text-text-primary transition-colors duration-300"
      ref={containerRef}
    >
      {/* timed test header */}
      <header className="border-b border-border-primary/50 bg-bg-secondary h-16 px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <span className="font-display font-bold text-sm tracking-tight text-accent">Exam Arena</span>
          <span className="text-text-muted">|</span>
          <nav className="flex items-center space-x-2 text-xs text-text-secondary">
            <span>Q. {currentIdx + 1} of {questions.length}</span>
          </nav>
        </div>

        {/* Action Widgets */}
        <div className="flex items-center space-x-6">
          {/* Timer Countdown */}
          <div className="flex items-center space-x-2 text-text-primary font-mono text-sm font-semibold bg-bg-primary border border-border-primary px-3 py-1.5 rounded-lg">
            <Clock className="w-4 h-4 text-accent animate-pulse" />
            <span>{formatTimer(timeLeft)}</span>
          </div>

          {/* Fullscreen focus button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg border border-border-primary bg-bg-primary hover:bg-bg-tertiary text-text-secondary transition-colors"
            title={isFullscreen ? 'Exit Focus Mode' : 'Enter Focus Mode'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={handleSubmitExam}
            className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold text-xs hover:bg-red-700 transition-colors shadow-sm"
          >
            Submit Exam
          </button>
        </div>
      </header>

      {/* Main timed test layout */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        
        {/* Left Side: Question Sheet */}
        <div className="p-6 rounded-xl border border-border-primary bg-bg-secondary flex flex-col justify-between shadow-sm min-h-[450px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-border-primary text-text-secondary">
                Descriptive Written Question
              </span>
              <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                10 Marks
              </span>
            </div>
            
            <div className="prose dark:prose-invert max-w-none text-text-primary leading-relaxed my-6">
              <MathMarkdown content={currentQuestion.questionText} />
            </div>
          </div>

          {/* Guidelines */}
          <div className="border-t border-border-primary/50 pt-4 text-[10px] text-text-muted flex items-start space-x-2">
            <PenTool className="w-3.5 h-3.5 mt-0.5 text-accent" />
            <p>
              Please write the detailed descriptive step-by-step resolution on your physical examination sheet. Use the scratchpad on the right to outline your derivation parameters or scratch math.
            </p>
          </div>
        </div>

        {/* Right Side: Outline / Scratchpad */}
        <div className="p-6 rounded-xl border border-border-primary bg-bg-secondary flex flex-col justify-between shadow-sm">
          <div className="flex-grow flex flex-col h-full">
            <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-text-secondary mb-3 flex items-center space-x-1.5">
              <PenTool className="w-3.5 h-3.5 text-accent" />
              <span>Scratchpad Outline</span>
            </h3>
            
            <textarea
              value={currentNote}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Outline your steps, write down variables, matrices equations, or type pseudo-code here..."
              className="w-full flex-grow p-4 rounded-lg bg-bg-primary text-xs font-mono border border-border-primary text-text-primary focus:outline-none focus:border-accent resize-none min-h-[300px]"
            />
          </div>
          
          <div className="mt-4 flex justify-between items-center text-[10px] text-text-muted">
            <span>Notes auto-saved per question.</span>
            <span>Character Count: {currentNote.length}</span>
          </div>
        </div>

        {/* Subtle Floating Anti-Cheat Warnings */}
        <AnimatePresence>
          {showCheatNotice && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-lg border border-yellow-500/20 bg-yellow-500/10 text-yellow-500 text-xs font-semibold shadow-lg backdrop-blur-md"
            >
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{cheatNoticeMsg} (Focus Breaches: {tabSwitches + focusLosses})</span>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom control row */}
      <footer className="border-t border-border-primary/50 bg-bg-secondary/40 py-4 px-6 flex items-center justify-between sticky bottom-0 z-40 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          {/* Integrity indicators */}
          <div className="flex items-center space-x-1 text-[9px] uppercase tracking-wider font-semibold text-text-secondary">
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
            className="px-4 py-2 rounded-lg border border-border-primary bg-bg-primary text-xs font-bold text-text-primary hover:bg-bg-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <button
            onClick={() => setCurrentIdx(Math.min(questions.length - 1, currentIdx + 1))}
            disabled={currentIdx === questions.length - 1}
            className="px-4 py-2 rounded-lg border border-border-primary bg-bg-primary text-xs font-bold text-text-primary hover:bg-bg-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </footer>
    </div>
  );
}
