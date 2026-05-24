'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { MathMarkdown } from '@/components/math-markdown';
import { seedQuestions } from '@/lib/seedData';
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
  HelpCircle as QuestionIcon
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
  const unitsParam = searchParams.get('units') || 'all';
  const topicsParam = searchParams.get('topics') || '';
  const countParam = parseInt(searchParams.get('count') || '5', 10);

  interface PracticeQuestion {
    _id?: string;
    unit: number;
    topic: string;
    questionText: string;
    difficulty: 'easy' | 'medium' | 'hard';
    repetitionFrequency: number;
    sourcePapers?: { year: number; examType: string }[];
    cachedSolution?: {
      content: string;
      steps: { stepNumber: number; heading: string; content: string }[];
    };
  }

  interface SolutionStep {
    stepNumber: number;
    heading: string;
    content: string;
  }

  interface SolutionDetail {
    content: string;
    steps: SolutionStep[];
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

  // Explain Step states
  const [explainingStep, setExplainingStep] = useState<number | null>(null);
  const [stepExplanation, setStepExplanation] = useState<string | null>(null);
  const [stepExplanationLoading, setStepExplanationLoading] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const stepRefs = useRef<{[key: number]: HTMLDivElement | null}>({});

  // Ask AI states
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Load configuration and filter questions
  useEffect(() => {
    const college = localStorage.getItem('selectedCollege') || 'MMMUT';
    const branch = localStorage.getItem('selectedBranch') || 'CSE';
    const semester = localStorage.getItem('selectedSemester') || '1';
    setBreadcrumbs([college, branch, `Sem ${semester}`]);

    const isLocalFallback = localStorage.getItem('useLocalFallback') === 'true' || !sessionId;

    if (isLocalFallback) {
      // Local fallback question compiler
      const subjectCode = subjectId.replace('mock-', '');
      let filtered = seedQuestions.filter((q) => q.subjectCode === subjectCode);

      // Filter by units if requested
      if (unitsParam !== 'all') {
        const targetUnits = unitsParam.split(',').map(Number);
        filtered = filtered.filter((q) => targetUnits.includes(q.unit));
      }

      // Filter by topics if requested
      if (topicsParam) {
        const targetTopics = decodeURIComponent(topicsParam).split(',');
        filtered = filtered.filter((q) => targetTopics.includes(q.topic));
      }

      // Shuffle and slice
      const shuffled = [...filtered].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, countParam);
      
      setQuestions(selected.length > 0 ? selected : filtered.slice(0, countParam));
      setLoading(false);
    } else {
      // Fetch session details from real MongoDB API
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
          // Local fallback in case database fetch fails
          router.push(`/subjects/${subjectId}`);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [subjectId, sessionId, unitsParam, topicsParam, countParam, router]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const currentQuestion = questions[currentIdx];

  // Perceived performance loading simulation for solution
  const triggerSolutionFetch = () => {
    if (solutionLoading || solutionVisible) return;
    
    setSolutionLoading(true);
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

    const isLocalFallback = localStorage.getItem('useLocalFallback') === 'true' || !sessionId;

    if (isLocalFallback) {
      // Simulate local Groq resolution
      setTimeout(() => {
        clearInterval(interval);
        setSolutionProgress(100);
        
        setTimeout(() => {
          // If mock question already contains cachedSolution, use it
          if (currentQuestion.cachedSolution) {
            setActiveSolution(currentQuestion.cachedSolution);
          } else {
            // Generate standard mock solution step-by-step
            setActiveSolution({
              content: `To solve: **${currentQuestion.questionText}**.\n\nHere is the step-by-step university exam resolution.`,
              steps: [
                {
                  stepNumber: 1,
                  heading: "Identify Given Parameters",
                  content: `Let's analyze the given question text for **${currentQuestion.topic}**. Identify the core functions or matrices from the text:\n\n$$X = \\text{Target topic: } ${currentQuestion.topic}$$\n\nSet up the initial equations matching the university syllabus requirements.`
                },
                {
                  stepNumber: 2,
                  heading: "Perform Core Differentiation / Steps",
                  content: "Differentiating the variables or applying the core equations step-by-step:\n\n$$y_{n} = D^n [ f(x) ]$$\n\nEnsure mathematical notations are clearly tracked. Substitute standard values into the theorem."
                },
                {
                  stepNumber: 3,
                  heading: "Verify and Simplify",
                  content: "Simplify the expression to match the final expected target outcome:\n\n$$\\text{Final solution is verified for } \\tan u \\text{ or corresponding proof.}$$"
                }
              ]
            });
          }
          setSolutionLoading(false);
          setSolutionVisible(true);
        }, 300);
      }, 1500); // 1.5s simulated generation time
    } else {
      // Real API fetch
      fetch(`/api/ai/solve?questionId=${currentQuestion._id}`)
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((data) => {
          clearInterval(interval);
          setSolutionProgress(100);
          setTimeout(() => {
            setActiveSolution(data.solution);
            setSolutionLoading(false);
            setSolutionVisible(true);
          }, 300);
        })
        .catch(() => {
          // Fallback if API fails
          clearInterval(interval);
          setSolutionProgress(100);
          setTimeout(() => {
            setActiveSolution({
              content: "Error loading solution from server. Falling back to local template.",
              steps: [{ stepNumber: 1, heading: "Notice", content: "MongoDB/Groq API server returned an error. Please verify your connection configuration." }]
            });
            setSolutionLoading(false);
            setSolutionVisible(true);
          }, 300);
        });
    }
  };

  const handleExplainStep = (stepNumber: number, stepText: string, event: React.MouseEvent) => {
    if (stepExplanationLoading) return;
    
    // Get mouse position relative to window for rendering floating popover
    const rect = event.currentTarget.getBoundingClientRect();
    setPopoverPosition({
      top: rect.bottom + window.scrollY + 10,
      left: Math.max(10, Math.min(rect.left + window.scrollX - 50, window.innerWidth - 320))
    });

    setExplainingStep(stepNumber);
    setStepExplanationLoading(true);
    setStepExplanation(null);

    const isLocalFallback = localStorage.getItem('useLocalFallback') === 'true' || !sessionId;

    if (isLocalFallback) {
      setTimeout(() => {
        setStepExplanation(`**Concept Explanation:**\nThis step differentiates the product of two functions. According to Leibnitz's theorem:\n\n$$D^n(uv) = u_n v + n u_{n-1} v_1 + \\dots$$\n\nHere we substitute $u = y_2$ and $v = (1-x^2)$ and solve recursively.`);
        setStepExplanationLoading(false);
      }, 800);
    } else {
      fetch('/api/ai/explain-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion._id,
          stepNumber,
          stepText,
          subjectId
        })
      })
        .then((res) => res.json())
        .then((data) => {
          setStepExplanation(data.explanation);
          setStepExplanationLoading(false);
        })
        .catch(() => {
          setStepExplanation("Failed to load step explanation from server.");
          setStepExplanationLoading(false);
        });
    }
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

    const isLocalFallback = localStorage.getItem('useLocalFallback') === 'true' || !sessionId;

    if (isLocalFallback) {
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Regarding your query about **${currentQuestion.topic}**: To solve this university-style, we apply the standard syllabus formulas. \n\nIf you swap the coefficients, remember to keep track of the sign of the discriminant ($b^2 - 4ac$). Let me know if you want me to write down the exact code syntax swaps!`
          }
        ]);
        setChatLoading(false);
      }, 1200);
    } else {
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
    }
  };

  const nextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSolutionVisible(false);
      setActiveSolution(null);
      setExplainingStep(null);
      setStepExplanation(null);
      setChatMessages([]);
    }
  };

  const finishSession = () => {
    // Redirect to dashboard or summary
    router.push(`/subjects/${subjectId}`);
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
      <main className="flex-grow max-w-4xl w-full mx-auto px-6 py-8 flex flex-col md:flex-row gap-6 relative">
        <div className="flex-grow space-y-6 max-w-3xl">
          {/* Question Card */}
          <div className="p-6 rounded-xl border border-border-primary bg-bg-secondary shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-border-primary text-text-secondary">
                Unit {currentQuestion.unit} • {currentQuestion.topic}
              </span>
              <div className="flex items-center space-x-2">
                {currentQuestion.sourcePapers?.map((paper: { year: number; examType: string }, pIdx: number) => (
                  <span key={pIdx} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-accent/5 border border-accent/15 text-accent">
                    {paper.year} {paper.examType}
                  </span>
                ))}
                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                  currentQuestion.difficulty === 'easy' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                  currentQuestion.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                  'bg-red-500/10 text-red-500 border border-red-500/20'
                }`}>
                  {currentQuestion.difficulty}
                </span>
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
                  className="w-full sm:w-auto px-6 py-3 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-colors shadow-sm flex items-center justify-center space-x-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Show Solution</span>
                </button>
              )}
              
              <button
                onClick={handleAskAi}
                className="w-full sm:w-auto px-6 py-3 rounded-lg border border-border-primary bg-bg-primary text-text-primary text-sm font-semibold hover:bg-bg-tertiary transition-colors flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-4 h-4 text-accent" />
                <span>Ask AI Assistant</span>
              </button>
            </div>
          </div>

          {/* Solution Loading Bar */}
          {solutionLoading && (
            <div className="p-8 rounded-xl border border-border-primary bg-bg-secondary text-center space-y-4">
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

          {/* Digital Textbook Solution View */}
          {solutionVisible && activeSolution && (
            <motion.div
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="p-6 rounded-xl border border-border-primary bg-bg-secondary shadow-sm"
            >
              <h3 className="font-display font-bold text-md text-text-primary border-b border-border-primary pb-3 mb-4 flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Syllabus-Aligned Solution</span>
              </h3>

              <div className="space-y-6">
                {activeSolution.steps?.map((step, sIdx) => (
                  <div 
                    key={sIdx} 
                    className="relative group border-l-2 border-border-primary pl-4 py-1"
                    ref={(el) => { stepRefs.current[step.stepNumber] = el; }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-accent">
                        Step {step.stepNumber}: {step.heading}
                      </h4>
                      
                      {/* Explain This Step - Subtly visible on hover */}
                      <button
                        onClick={(e) => handleExplainStep(step.stepNumber, step.content, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-accent font-semibold hover:underline flex items-center space-x-1 mt-1 sm:mt-0 outline-none"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Explain This Step</span>
                      </button>
                    </div>
                    <MathMarkdown content={step.content} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Floating Explain Step Popover */}
      <AnimatePresence>
        {explainingStep !== null && popoverPosition && (
          <>
            {/* Click-away backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => { setExplainingStep(null); setStepExplanation(null); }}
            />
            {/* Popover content card */}
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute z-50 w-80 p-4 rounded-xl border border-accent/20 bg-bg-secondary shadow-lg text-xs leading-relaxed"
              style={{ top: popoverPosition.top, left: popoverPosition.left }}
            >
              <div className="flex items-center justify-between border-b border-border-primary pb-2 mb-2">
                <span className="font-bold text-accent">Step {explainingStep} Concept Breakdown</span>
                <button 
                  onClick={() => { setExplainingStep(null); setStepExplanation(null); }}
                  className="p-1 rounded hover:bg-bg-tertiary text-text-muted"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {stepExplanationLoading ? (
                <div className="flex items-center justify-center py-4 space-x-2 text-text-secondary">
                  <Loader2 className="w-4 h-4 text-accent animate-spin" />
                  <span>Analysing step context...</span>
                </div>
              ) : (
                <MathMarkdown content={stepExplanation || 'Explanation missing.'} />
              )}
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
      </footer>
    </div>
  );
}
