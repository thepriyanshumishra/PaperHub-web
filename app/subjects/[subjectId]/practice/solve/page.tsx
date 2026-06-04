'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import dynamic from 'next/dynamic';

const MathMarkdown = dynamic(() => import('@/components/math-markdown').then((mod) => mod.MathMarkdown), {
  ssr: false,
  loading: () => <div className="animate-pulse h-12 bg-bg-secondary rounded-lg border border-border-primary/50 w-full" />,
});
import { 
  ArrowLeft, 
  Sparkles, 
  HelpCircle, 
  BookOpen, 
  ArrowRight, 
  X, 
  Send,
  Loader2,
  CheckCircle,
  HelpCircle as QuestionIcon,
  ArrowUp,
  ArrowDown,
  Clock,
  Layers,
  Terminal,
  Code2,
  Workflow,
  FileText,
  Info,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function PracticeSolve() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-secondary">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-sm">Loading practice solver...</p>
        </div>
      </div>
    }>
      <PracticeSolveContent />
    </Suspense>
  );
}

function PracticeSolveContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectId = params.subjectId as string;
  
  // URL Params
  const sessionId = searchParams.get('sessionId');

  interface PracticeQuestion {
    _id?: string;
    unit: number;
    topic: string;
    questionText: string;
    difficulty: 'easy' | 'medium' | 'hard';
    repetitionFrequency: number;
    marks?: number;
    sourcePapers?: { year: number; examType: string }[];
    cachedSolution?: {
      content: string;
      steps?: { stepNumber: number; heading: string; content: string }[];
      type?: 'stepwise' | 'theoretical' | 'coding' | 'flowchart' | 'theory' | 'maths';
      code?: string;
      explanation?: string;
      complexity?: { time: string; space: string };
      inputOutput?: string;
      mermaid?: string;
    };
  }

  interface SolutionStep {
    stepNumber: number;
    heading: string;
    content: string;
  }

  interface SolutionDetail {
    content: string;
    steps?: SolutionStep[];
    type?: 'stepwise' | 'theoretical' | 'coding' | 'flowchart' | 'theory' | 'maths';
    code?: string;
    explanation?: string;
    complexity?: { time: string; space: string };
    inputOutput?: string;
    mermaid?: string;
  }

  // App state
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  
  // Solution states
  const [solutionVisible, setSolutionVisible] = useState(false);
  const [solutionLoading, setSolutionLoading] = useState(false);
  const [solutionProgress, setSolutionProgress] = useState(0);
  const [activeSolution, setActiveSolution] = useState<SolutionDetail | null>(null);
  const [solutionError, setSolutionError] = useState<string | null>(null);

  // Explain Step states
  const [explainingStep, setExplainingStep] = useState<number | null>(null);
  const [stepExplanation, setStepExplanation] = useState<string | null>(null);
  const [stepExplanationLoading, setStepExplanationLoading] = useState(false);
  const [explainingStepText, setExplainingStepText] = useState<string | null>(null);
  const stepRefs = useRef<{[key: number]: HTMLDivElement | null}>({});

  // Ask AI states
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Load configuration and filter questions
  useEffect(() => {
    const college = localStorage.getItem('selectedCollege') || 'MMMUT';
    const branch = localStorage.getItem('selectedBranch') || 'CSE';
    const semester = localStorage.getItem('selectedSemester') || '1';
    setBreadcrumbs([college, branch, `Sem ${semester}`]);

    if (!sessionId) {
      router.push(`/subjects/${subjectId}`);
      return;
    }

    // Fetch session details from real MongoDB API
    fetch(`/api/sessions/${sessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch session');
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
        console.error('Error loading session:', err);
        router.push(`/subjects/${subjectId}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [subjectId, sessionId, router]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Intercept browser back/navigation and close
  useEffect(() => {
    // Push dummy state to handle browser back button
    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      setShowConfirmModal(true);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [router, subjectId]);

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
  }, [currentIdx, solutionVisible, activeSolution, loading]);

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

  const currentQuestion = questions[currentIdx];

  // Perceived performance loading simulation for solution
  const triggerSolutionFetch = () => {
    if (solutionLoading) return;
    
    setSolutionLoading(true);
    setSolutionVisible(false);
    setSolutionError(null);
    setSolutionProgress(0);
    setExplainingStep(null);
    setStepExplanation(null);

    // Progressive loading animation (perceived performance psychology)
    // 0 to 90% quickly, then slow
    const interval = setInterval(() => {
      setSolutionProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        const stepSize = Math.max(1, (90 - prev) * 0.25);
        return parseFloat((prev + stepSize).toFixed(1));
      });
    }, 100);

    // Real API fetch
    fetch(`/api/ai/solve?questionId=${currentQuestion._id}`)
      .then((res) => {
        if (!res.ok) throw new Error('API server returned a non-200 status');
        return res.json();
      })
      .then((data) => {
        clearInterval(interval);
        setSolutionProgress(100);
        setTimeout(() => {
          if (data.error) {
            throw new Error(data.error);
          }
          setActiveSolution(data.solution);
          setSolutionError(null);
          setSolutionLoading(false);
          setSolutionVisible(true);
        }, 300);
      })
      .catch((err: unknown) => {
        clearInterval(interval);
        setSolutionProgress(100);
        setTimeout(() => {
          setSolutionError((err as Error).message || "MongoDB/Groq API server returned an error. Please verify your connection configuration.");
          setActiveSolution(null);
          setSolutionLoading(false);
          setSolutionVisible(false);
        }, 300);
      });
  };

  const handleExplainStep = (stepNumber: number, stepText: string, event: React.MouseEvent) => {
    if (stepExplanationLoading) return;
    event.stopPropagation();

    setExplainingStep(stepNumber);
    setExplainingStepText(stepText);
    setStepExplanationLoading(true);
    setStepExplanation(null);

    fetch('/api/ai/explain-step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: currentQuestion._id,
        stepNumber,
        stepText,
        subjectId,
        fallbackContext: {
          solutionType: activeSolution?.type
        }
      })
    })
      .then((res) => res.json())
      .then((data) => {
        setStepExplanation(data.explanation);
        setStepExplanationLoading(false);
      })
      .catch(() => {
        setStepExplanation(activeSolution?.type === 'theoretical' ? "Failed to load explanation from server." : "Failed to load step explanation from server.");
        setStepExplanationLoading(false);
      });
  };

  const handleAskAi = () => {
    setAiDrawerOpen(true);
    // If chat is empty, pre-populate with welcome context
    if (chatMessages.length === 0) {
      setChatMessages([
        {
          role: 'assistant',
          content: `Hi! I'm your syllabus-aware assistant for **${currentQuestion.topic}**. Ask me doubts about this question or request hints to solve it on your own!`
        }
      ]);
    }
  };

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput;
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: localStorage.getItem('anonymousUserId') || 'guest',
          questionId: currentQuestion._id,
          message: userMsg,
          history: chatMessages
        })
      });
      const data = await res.json();
      setChatMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Connection error. Failed to send message to Groq layer.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const nextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSolutionVisible(false);
      setActiveSolution(null);
      setSolutionError(null);
      setExplainingStep(null);
      setStepExplanation(null);
      setChatMessages([]);
    } else {
      setIsCompleted(true);
    }
  };

  const prevQuestion = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
      setSolutionVisible(false);
      setActiveSolution(null);
      setSolutionError(null);
      setExplainingStep(null);
      setStepExplanation(null);
      setChatMessages([]);
    }
  };

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

  const finishSession = () => {
    setShowConfirmModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
          <p className="text-xs text-text-secondary">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary text-text-primary p-6 text-center">
        <QuestionIcon className="w-12 h-12 text-text-muted mb-4 animate-pulse" />
        <h2 className="font-display font-bold text-xl mb-2">No Questions Found</h2>
        <p className="text-sm text-text-secondary max-w-sm mb-6">
          There are no questions seeded matching this selection yet.
        </p>
        <Link href={`/subjects/${subjectId}`} className="px-6 py-2.5 bg-accent text-white font-medium rounded-lg">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary text-text-primary p-6 text-center transition-colors duration-300">
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>
        <div className="max-w-md w-full p-8 rounded-2xl border border-border-primary bg-bg-secondary shadow-sm">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-4">Well Done!</h1>
          <p className="text-text-secondary leading-relaxed mb-8">
            You&apos;ve successfully completed all the relevant questions! More questions will be added soon.
          </p>
          <Link
            href={`/subjects/${subjectId}`}
            className="w-full inline-flex items-center justify-center px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between transition-colors duration-300">
      {/* Top Navbar */}
      <header className="border-b border-border-primary/50 bg-bg-primary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={finishSession} 
              className="p-2 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary transition-colors"
              aria-label="Exit Practice"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <nav className="flex items-center space-x-2 text-xs text-text-secondary font-medium">
              <span>{breadcrumbs[0]}</span>
              <span>/</span>
              <span className="text-text-primary font-bold">Solve</span>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-xs font-semibold px-2 py-1 rounded bg-accent/10 text-accent">
              Q. {currentIdx + 1} of {questions.length}
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Solver Sandbox */}
      <main className="flex-grow max-w-4xl w-full mx-auto px-6 py-8 flex flex-col md:flex-row gap-6 relative overflow-hidden">
        {/* Subtle glowing space background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-accent/5 rounded-full blur-[120px] pointer-events-none dark:block hidden"></div>

        <div className="flex-grow space-y-6 max-w-3xl z-10 relative">
          {/* Question Card */}
          <div className="p-8 rounded-2xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm shadow-[0_0_30px_rgba(0,0,0,0.25)] relative overflow-hidden z-10">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded bg-border-primary/50 text-text-secondary">
                Unit {currentQuestion.unit} • {currentQuestion.topic}
              </span>
              <div className="flex items-center space-x-2">
                {currentQuestion.repetitionFrequency > 1 && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 inline-flex items-center space-x-0.5 animate-pulse">
                    <span>🔥 Repeated {currentQuestion.repetitionFrequency}x</span>
                  </span>
                )}
                {currentQuestion.sourcePapers?.map((paper: { year: number; examType: string }, pIdx: number) => (
                  <span key={pIdx} className="text-[9px] font-bold px-2 py-0.5 rounded bg-accent/8 border border-accent/15 text-accent">
                    {paper.year} {paper.examType}
                  </span>
                ))}

                {currentQuestion.marks !== undefined && (
                  <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded border ${
                    currentQuestion.marks <= 2 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    currentQuestion.marks <= 4 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                    'bg-purple-500/10 text-purple-500 border-purple-500/20'
                  }`}>
                    {currentQuestion.marks} Marker
                  </span>
                )}
              </div>
            </div>
            
            <h2 className="text-lg font-semibold leading-relaxed text-text-primary mb-6">
              <MathMarkdown content={currentQuestion.questionText} />
            </h2>

            {/* Buttons Row */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {!solutionVisible && !solutionLoading && (
                <button
                  onClick={triggerSolutionFetch}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2 hover:-translate-y-0.5"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Show Solution</span>
                </button>
              )}
              
              <button
                onClick={handleAskAi}
                className="w-full sm:w-auto px-6 py-3 rounded-xl border border-border-primary bg-bg-primary/50 text-text-primary text-sm font-semibold hover:bg-bg-tertiary transition-all duration-200 flex items-center justify-center space-x-2 hover:-translate-y-0.5"
              >
                <Sparkles className="w-4 h-4 text-accent animate-pulse" />
                <span>Ask AI Assistant</span>
              </button>
            </div>
          </div>

          {/* Solution Loading Bar */}
          {solutionLoading && (
            <div className="p-8 rounded-2xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm text-center space-y-4">
              <div className="max-w-xs mx-auto space-y-2">
                <div className="flex items-center justify-between text-xs text-text-secondary font-medium">
                  <span>Formatting university step-by-step solution...</span>
                  <span>{Math.round(solutionProgress)}%</span>
                </div>
                <div className="w-full h-1.5 bg-bg-primary border border-border-primary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent transition-all duration-100 ease-out" 
                    style={{ width: `${solutionProgress}%` }}
                  />
                </div>
              </div>
              <p className="text-[10px] text-text-muted">Perceived latency is normal. Groq is analyzing syllabus-aware constraints.</p>
            </div>
          )}

          {/* Solution Error Card */}
          {solutionError && (
            <motion.div
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="p-8 rounded-2xl border border-rose-500/20 bg-bg-secondary/60 backdrop-blur-sm shadow-[0_0_30px_rgba(0,0,0,0.15)] flex flex-col items-center text-center space-y-6"
            >
              <div className="w-14 h-14 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 shadow-sm border border-rose-500/20">
                <AlertTriangle className="w-7 h-7" />
              </div>
              
              <div className="space-y-2 max-w-md">
                <h3 className="font-display font-bold text-base text-text-primary">Failed to Generate Solution</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {solutionError}
                </p>
              </div>

              <button
                onClick={triggerSolutionFetch}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover active:scale-[0.98] transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Fetching Solution</span>
              </button>
            </motion.div>
          )}

          {/* Digital Textbook Solution View */}
          {solutionVisible && activeSolution && (
            <motion.div
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="p-8 rounded-2xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm shadow-[0_0_30px_rgba(0,0,0,0.25)]"
            >
              <h3 className="font-display font-bold text-base text-text-primary border-b border-border-primary pb-3 mb-6 flex items-center space-x-2.5">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Syllabus-Aligned Solution</span>
              </h3>

              {/* Pathway A: Coding */}
              {activeSolution.type === 'coding' && (
                <div className="space-y-6">
                  {/* Approach Description */}
                  {activeSolution.content && (
                    <div className="p-5 rounded-xl bg-bg-primary/20 border border-border-primary/50 text-sm leading-relaxed text-text-secondary">
                      <div className="flex items-center gap-2 mb-2 text-text-primary font-semibold">
                        <Info className="w-4 h-4 text-accent" />
                        <span>Approach & Implementation Strategy</span>
                      </div>
                      <MathMarkdown content={activeSolution.content} />
                    </div>
                  )}

                  {/* Time & Space Complexity Badges */}
                  {activeSolution.complexity && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-border-primary bg-bg-primary/30 flex items-start gap-3 hover:border-accent/20 transition-colors duration-200">
                        <div className="p-2 rounded-lg bg-accent/10 text-accent">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider font-bold text-text-muted">Time Complexity</div>
                          <div className="text-xs font-semibold text-text-primary mt-0.5">{activeSolution.complexity.time}</div>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl border border-border-primary bg-bg-primary/30 flex items-start gap-3 hover:border-accent/20 transition-colors duration-200">
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider font-bold text-text-muted">Space Complexity</div>
                          <div className="text-xs font-semibold text-text-primary mt-0.5">{activeSolution.complexity.space}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* pristine Complete Code Block */}
                  {activeSolution.code && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-text-primary flex items-center gap-1.5 px-1">
                        <Code2 className="w-4 h-4 text-accent" />
                        <span>Complete C Program</span>
                      </div>
                      <MathMarkdown content={`\`\`\`c\n${activeSolution.code}\n\`\`\``} />
                    </div>
                  )}

                  {/* Line-by-Line Code Explanation */}
                  {activeSolution.explanation && (
                    <div className="p-6 rounded-xl border border-border-primary bg-bg-primary/10">
                      <div className="text-xs font-bold text-text-primary flex items-center gap-1.5 mb-4 border-b border-border-primary/50 pb-2">
                        <FileText className="w-4 h-4 text-accent" />
                        <span>Code Logic & Explanation</span>
                      </div>
                      <div className="text-xs leading-relaxed text-text-secondary">
                        <MathMarkdown content={activeSolution.explanation} />
                      </div>
                    </div>
                  )}

                  {/* Sample Input/Output Terminal */}
                  {activeSolution.inputOutput && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-text-primary flex items-center gap-1.5 px-1">
                        <Terminal className="w-4 h-4 text-accent" />
                        <span>Dry Run & Example Execution</span>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-[#0f172a] p-4 font-mono text-[11px] leading-relaxed text-slate-300 shadow-inner">
                        <div className="flex items-center gap-1.5 border-b border-white/5 pb-2 mb-2 select-none">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                          <span className="text-[9px] text-slate-500 ml-1.5 font-sans font-medium uppercase tracking-wider">C compiler terminal</span>
                        </div>
                        <pre className="whitespace-pre-wrap select-text">{activeSolution.inputOutput}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pathway B: Flowchart */}
              {activeSolution.type === 'flowchart' && (
                <div className="space-y-6">
                  {/* Approach Description */}
                  {activeSolution.content && (
                    <div className="p-5 rounded-xl bg-bg-primary/20 border border-border-primary/50 text-sm leading-relaxed text-text-secondary">
                      <div className="flex items-center gap-2 mb-2 text-text-primary font-semibold">
                        <Info className="w-4 h-4 text-accent" />
                        <span>Logic Strategy</span>
                      </div>
                      <MathMarkdown content={activeSolution.content} />
                    </div>
                  )}

                  {/* Interactive Flowchart Visual */}
                  {activeSolution.mermaid && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-text-primary flex items-center gap-1.5 px-1">
                        <Workflow className="w-4 h-4 text-accent" />
                        <span>Visual Flow Control Chart</span>
                      </div>
                      <MathMarkdown content={`\`\`\`mermaid\n${activeSolution.mermaid}\n\`\`\``} />
                    </div>
                  )}

                  {/* Detailed Step Explanations */}
                  {activeSolution.explanation && (
                    <div className="p-6 rounded-xl border border-border-primary bg-bg-primary/10">
                      <div className="text-xs font-bold text-text-primary flex items-center gap-1.5 mb-4 border-b border-border-primary/50 pb-2">
                        <FileText className="w-4 h-4 text-accent" />
                        <span>Flow Control Description</span>
                      </div>
                      <div className="text-xs leading-relaxed text-text-secondary">
                        <MathMarkdown content={activeSolution.explanation} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pathway C: Theory */}
              {activeSolution.type === 'theory' && (
                <div className="space-y-6">
                  {/* Core concept intro */}
                  {activeSolution.content && (
                    <div className="p-5 rounded-xl bg-bg-primary/20 border border-border-primary/50 text-sm leading-relaxed text-text-secondary font-medium">
                      <MathMarkdown content={activeSolution.content} />
                    </div>
                  )}

                  {/* Structured Textbook-Style Explanation */}
                  {activeSolution.explanation && (
                    <div className="p-6 rounded-xl border border-border-primary bg-bg-secondary shadow-sm">
                      <div className="text-xs leading-relaxed text-text-secondary">
                        <MathMarkdown content={activeSolution.explanation} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pathway D: Maths / Stepwise Fallback */}
              {(activeSolution.type === 'stepwise' || activeSolution.type === 'maths' || activeSolution.type === 'theoretical' || !activeSolution.type) && 
                activeSolution.steps && activeSolution.steps.length > 0 && (
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="relative border-l border-border-primary/30 pl-6 ml-3 space-y-6 mt-4"
                >
                  {activeSolution.steps.map((step, sIdx) => (
                    <motion.div 
                      key={sIdx} 
                      variants={itemVariants}
                      className="relative group"
                      ref={(el) => { stepRefs.current[step.stepNumber] = el; }}
                    >
                      {/* Timeline Circle */}
                      <span className="absolute -left-[35px] top-0 w-6 h-6 rounded-full bg-bg-secondary border border-accent text-accent shadow-[0_0_12px_rgba(124,102,255,0.3)] flex items-center justify-center text-xs font-black select-none z-10 transition-transform duration-300 group-hover:scale-110">
                        {step.stepNumber}
                      </span>
                      
                      {/* Step Card */}
                      <div className="p-5 rounded-2xl border border-border-primary bg-bg-primary/25 backdrop-blur-md hover:border-accent/30 hover:bg-accent/[0.015] hover:shadow-lg transition-all duration-300 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="text-xs font-black text-text-primary tracking-wide flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                            {activeSolution.type === 'theoretical' 
                              ? `${step.heading}` 
                              : `Step ${step.stepNumber}: ${step.heading}`}
                          </div>
                          
                          {/* Explain This Step - Subtly visible on hover */}
                          <button
                            onClick={(e) => handleExplainStep(step.stepNumber, step.content, e)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-accent font-semibold hover:underline flex items-center space-x-1 outline-none"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>
                              {activeSolution.type === 'theoretical' 
                                ? 'Elaborate On This' 
                                : 'Explain This Step'}
                            </span>
                          </button>
                        </div>
                        
                        <div className="text-xs leading-relaxed text-text-secondary">
                          <MathMarkdown content={step.content} />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      </main>

      {/* ── Explain This Step Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {explainingStep !== null && (
          <>
            {/* Backdrop + flex centering wrapper */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6 p-0"
              onClick={() => { setExplainingStep(null); setStepExplanation(null); setExplainingStepText(null); }}
            >
            {/* Modal Panel — stop clicks propagating to the backdrop */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 24 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:w-[760px] lg:w-[880px] max-h-[88vh] sm:max-h-[80vh] rounded-t-2xl sm:rounded-2xl overflow-hidden border border-accent/20 bg-bg-secondary shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex-none flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-accent/10 via-accent/5 to-transparent border-b border-border-primary">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
                    <HelpCircle className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-text-muted uppercase tracking-widest leading-none mb-0.5">AI Concept Breakdown</p>
                    <p className="text-sm font-bold text-accent leading-none">
                      {activeSolution?.type === 'theoretical' 
                        ? 'Deep Elaboration' 
                        : `Step ${explainingStep} — Deep Explanation`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setExplainingStep(null); setStepExplanation(null); setExplainingStepText(null); }}
                  className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body — side-by-side on md+, stacked on mobile */}
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">

                {/* LEFT COLUMN: Step context preview */}
                <div className="md:w-56 lg:w-64 flex-none bg-bg-primary border-b md:border-b-0 md:border-r border-border-primary p-4 flex flex-col space-y-3 overflow-y-auto max-h-36 md:max-h-none">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Step Content</p>
                  <div className="text-xs text-text-secondary leading-relaxed line-clamp-[12] md:line-clamp-none">
                    <MathMarkdown content={explainingStepText || ''} />
                  </div>
                </div>

                {/* RIGHT COLUMN: AI Explanation */}
                <div className="flex-1 overflow-y-auto p-5 min-w-0">
                  {stepExplanationLoading ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4 text-text-secondary py-10">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
                        <Sparkles className="w-4 h-4 text-accent absolute inset-0 m-auto" />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-sm font-medium text-text-primary">Analysing step context…</p>
                        <p className="text-xs text-text-muted">Groq Llama is generating a tailored explanation</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm leading-relaxed">
                      <MathMarkdown content={stepExplanation || 'Explanation not available.'} />
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex-none flex items-center justify-between px-5 py-3 border-t border-border-primary bg-bg-primary/50 text-[10px] text-text-muted">
                <span className="flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-accent" />
                  <span>Powered by Groq · Llama 3.3 70B</span>
                </span>
                <button
                  onClick={() => { setExplainingStep(null); setStepExplanation(null); setExplainingStepText(null); }}
                  className="px-3 py-1 rounded-md bg-accent/10 hover:bg-accent/20 text-accent font-semibold transition-colors text-[10px]"
                >
                  Close
                </button>
              </div>
            </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Right Drawer: Ask AI Interface */}
      <AnimatePresence>
        {aiDrawerOpen && (
          <>
            {/* Drawer Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setAiDrawerOpen(false)}
              className="fixed inset-0 z-45 bg-black"
            />
            
            {/* Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-96 bg-bg-secondary border-l border-border-primary flex flex-col shadow-2xl"
            >
              {/* Drawer Header */}
              <div className="h-16 px-4 border-b border-border-primary/50 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-accent animate-pulse" />
                  <span className="font-display font-bold text-sm text-text-primary">Syllabus Doubts Assistant</span>
                </div>
                <button 
                  onClick={() => setAiDrawerOpen(false)}
                  className="p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat messages */}
              <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                  >
                    <span className="text-[9px] font-bold text-text-muted mb-1 uppercase tracking-wider">
                      {msg.role === 'user' ? 'Student' : 'Syllabus AI'}
                    </span>
                    <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-accent text-white rounded-tr-none' 
                        : 'bg-bg-primary border border-border-primary text-text-primary rounded-tl-none'
                    }`}>
                      {msg.role === 'user' ? msg.content : <MathMarkdown content={msg.content} />}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex items-center space-x-2 text-text-muted mr-auto pl-2">
                    <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
                    <span className="text-[10px]">Formulating response...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input form */}
              <form onSubmit={sendChatMessage} className="p-4 border-t border-border-primary/50 bg-bg-primary">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a question or ask for a hint..."
                    className="w-full pl-3 pr-10 py-2.5 text-xs rounded-lg border border-border-primary bg-bg-secondary text-text-primary focus:outline-none focus:border-accent"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 p-1.5 rounded-md bg-accent text-white hover:bg-accent-hover transition-colors"
                    aria-label="Send Message"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Solver Control Bar */}
      <footer className="border-t border-border-primary/50 bg-bg-secondary/40 py-4 px-6 flex items-center justify-between sticky bottom-0 z-40 backdrop-blur-md transition-colors duration-300">
        <button
          onClick={finishSession}
          className="text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          Finish Session
        </button>

        <div className="flex items-center space-x-3">
          {currentIdx > 0 && (
            <button
              onClick={prevQuestion}
              className="px-5 py-2 rounded-lg bg-bg-primary border border-border-primary hover:bg-bg-tertiary transition-all text-xs font-bold text-text-primary flex items-center space-x-1.5 group"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Previous Question</span>
            </button>
          )}

          {currentIdx < questions.length - 1 ? (
            <button
              onClick={nextQuestion}
              className="px-5 py-2 rounded-lg bg-bg-primary border border-border-primary hover:bg-bg-tertiary transition-all text-xs font-bold text-text-primary flex items-center space-x-1.5 group"
            >
              <span>Next Question</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          ) : (
            <button
              onClick={finishSession}
              className="px-5 py-2 rounded-lg bg-accent hover:bg-accent-hover transition-all text-xs font-bold text-white flex items-center space-x-1.5"
            >
              <span>Complete Session</span>
            </button>
          )}
        </div>
      </footer>

      {/* Premium In-website Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-bg-secondary/95 border border-border-primary/80 max-w-sm w-full p-6 rounded-2xl shadow-2xl flex flex-col items-center text-center space-y-5"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/5 border border-accent/20 flex items-center justify-center text-accent shadow-sm shadow-accent/5">
                <HelpCircle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-bold text-base text-text-primary">Finish Session?</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Are you sure you want to finish this practice session? Your progress will be lost.
                </p>
              </div>
              <div className="flex items-center space-x-3 w-full pt-2">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-border-primary bg-bg-primary hover:bg-bg-tertiary text-xs font-bold text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    router.push(`/subjects/${subjectId}`);
                  }}
                  className="flex-1 py-2.5 rounded-lg bg-accent text-white hover:bg-accent-hover text-xs font-bold transition-all shadow-md shadow-accent/10"
                >
                  Confirm
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
