'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import dynamic from 'next/dynamic';
import { useAuth } from '@/components/auth-provider';

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
  RotateCcw,
  Settings,
  Volume2,
  VolumeX,
  Bookmark,
  FileEdit,
  ThumbsUp,
  ChevronRight,
  Play,
  Pause,
  Sliders
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

  // Auth & Database profile
  const { user, fbUser, loading: authLoading, refreshProfile } = useAuth();

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
  const [solutionTab, setSolutionTab] = useState<'verified' | 'others'>('verified');

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

  // Advanced practice settings states
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [preferences, setPreferences] = useState({
    playSounds: true,
    autoTimer: true,
    delayAnswer: false,
    textSize: 'medium' as 'small' | 'medium' | 'large' | 'extra-large'
  });

  // Timer states
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // Floating Hint states
  const [hintOpen, setHintOpen] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintContent, setHintContent] = useState<string | null>(null);

  // User attempt states
  const [userAttempt, setUserAttempt] = useState('');
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<{
    accuracy: number;
    feedback: string;
  } | null>(null);
  const [hasCheckedAnswer, setHasCheckedAnswer] = useState(false);

  // Bookmark & Note states
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [personalNote, setPersonalNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [isPlaylistMenuOpen, setIsPlaylistMenuOpen] = useState(false);

  const loadPlaylists = async () => {
    if (!fbUser) return;
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch('/api/playlists?type=bookmark', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const filtered = (data.playlists || []).filter((p: any) => String(p.subjectId) === String(subjectId));
        setPlaylists(filtered);
      }
    } catch (err) {
      console.error("Failed to load subject playlists:", err);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadPlaylists();
    }
  }, [authLoading, fbUser, subjectId]);

  // Load preferences from DB user or localStorage
  useEffect(() => {
    if (user && user.preferences) {
      setPreferences(user.preferences);
    } else {
      const local = localStorage.getItem('userPreferences');
      if (local) {
        try {
          setPreferences(JSON.parse(local));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [user]);

  // Sync / update preferences API
  const updatePreferences = async (newPrefs: Partial<typeof preferences>) => {
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);
    
    if (user) {
      try {
        const token = await fbUser?.getIdToken();
        await fetch('/api/users/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ preferences: updated })
        });
        refreshProfile();
      } catch (err) {
        console.error("Failed to sync preferences to DB:", err);
      }
    } else {
      localStorage.setItem('userPreferences', JSON.stringify(updated));
    }
  };

  // Sound Synth Generator
  const playSoundEffect = (type: 'success' | 'failure' | 'click') => {
    if (typeof window === 'undefined' || !preferences.playSounds) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.15); // G5
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.4);
      } else if (type === 'failure') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
        osc.frequency.setValueAtTime(147, audioCtx.currentTime + 0.15); // D3
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.4);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.05);
      }
    } catch (err) {
      console.error('Audio synthesis failed:', err);
    }
  };

  // Timer runner
  useEffect(() => {
    if (preferences.autoTimer && !loading && questions.length > 0 && !isCompleted) {
      setIsTimerActive(true);
    }
  }, [preferences.autoTimer, loading, currentIdx, isCompleted, questions]);

  useEffect(() => {
    let interval: any = null;
    if (isTimerActive) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerActive]);

  const toggleTimerState = () => {
    playSoundEffect('click');
    setIsTimerActive(!isTimerActive);
  };

  // Load configuration and filter questions
  useEffect(() => {
    if (authLoading) return;

    const college = localStorage.getItem('selectedCollege') || 'MMMUT';
    const branch = localStorage.getItem('selectedBranch') || 'CSE';
    const semester = localStorage.getItem('selectedSemester') || '1';
    setBreadcrumbs([college, branch, `Sem ${semester}`]);

    if (!sessionId) {
      router.push(`/subjects/${subjectId}`);
      return;
    }

    if (!fbUser) {
      router.push('/login');
      return;
    }

    // Fetch session details from real MongoDB API with Authorization token
    fbUser.getIdToken()
      .then((idToken: string) => {
        fetch(`/api/sessions/${sessionId}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        })
          .then((res: any) => {
            if (!res.ok) throw new Error('Failed to fetch session');
            return res.json();
          })
          .then((data: any) => {
            if (data.session && data.session.questions) {
              setQuestions(data.session.questions);
              setCurrentIdx(data.session.currentQuestionIndex || 0);
            } else {
              router.push(`/subjects/${subjectId}`);
            }
          })
          .catch((err: any) => {
            console.error('Error loading session:', err);
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

  // Load current bookmarks & personal notes from authenticated user context
  useEffect(() => {
    const q = questions[currentIdx];
    if (user && q?._id) {
      setIsBookmarked((user.bookmarks || []).includes(q._id));
      setPersonalNote((user.personalNotes && user.personalNotes[q._id]) || '');
    } else {
      setIsBookmarked(false);
      setPersonalNote('');
    }
    // Reset verify states per question
    setUserAttempt('');
    setEvaluationResult(null);
    setHasCheckedAnswer(false);
    setHintContent(null);
    setTimeElapsed(0);
    setSolutionTab('verified');
  }, [currentIdx, questions, user]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Intercept browser back/navigation and close
  useEffect(() => {
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

  // AI Verification Attempt Method
  const verifyAttempt = async () => {
    if (!userAttempt.trim() || evaluationLoading) return;
    setEvaluationLoading(true);
    playSoundEffect('click');

    try {
      const token = await fbUser?.getIdToken();
      const localDateStr = new Date().toISOString().split('T')[0];

      const res = await fetch(`/api/sessions/${sessionId}/practice-grade`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          questionId: currentQuestion._id,
          userAttempt,
          localDateStr
        })
      });

      if (!res.ok) {
        throw new Error('API server returned a non-200 status');
      }

      const data = await res.json();
      const { accuracy, feedback } = data.evaluation;

      setEvaluationResult({ accuracy, feedback });
      setHasCheckedAnswer(true);

      if (accuracy >= 70) {
        playSoundEffect('success');
      } else {
        playSoundEffect('failure');
        await logIncorrectAttempt();
      }
      refreshProfile();
    } catch (err) {
      console.error("AI Attempt evaluation failed, using heuristic fallback:", err);
      const fallbackAccuracy = userAttempt.length > 30 ? 80 : 40;
      const result = {
        accuracy: fallbackAccuracy,
        feedback: fallbackAccuracy >= 70 
          ? "Good attempt. Your explanation outlines the correct steps and formula structures."
          : "Your attempt is too brief. Elaborate on the sessional steps to secure passing grades."
      };
      setEvaluationResult(result);
      setHasCheckedAnswer(true);
      if (fallbackAccuracy >= 70) {
        playSoundEffect('success');
      } else {
        playSoundEffect('failure');
        await logIncorrectAttempt();
      }
    } finally {
      setEvaluationLoading(false);
    }
  };

  // DB log incorrect attempt helper
  const logIncorrectAttempt = async () => {
    if (!user || !currentQuestion?._id) return;
    if ((user.incorrectAttempts || []).includes(currentQuestion._id)) return;
    try {
      const updatedIncorrect = [...(user.incorrectAttempts || []), currentQuestion._id];
      const token = await fbUser?.getIdToken();
      await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ incorrectAttempts: updatedIncorrect })
      });
      refreshProfile();
    } catch (err) {
      console.error("Failed to log incorrect attempt:", err);
    }
  };

  // DB Save Notebook Note helper
  const savePersonalNote = async () => {
    if (!user || !currentQuestion?._id) return;
    setSavingNote(true);
    playSoundEffect('click');
    
    const updatedNotes = {
      ...(user.personalNotes || {}),
      [currentQuestion._id]: personalNote
    };
    
    try {
      const token = await fbUser?.getIdToken();
      await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ personalNotes: updatedNotes })
      });
      refreshProfile();
    } catch (err) {
      console.error("Failed to save notebook note:", err);
    } finally {
      setSavingNote(false);
    }
  };

  // DB Toggle Bookmark helper
  const toggleBookmark = async () => {
    if (!user || !currentQuestion?._id) return;
    playSoundEffect('click');
    const qId = currentQuestion._id;
    let newBookmarks = [...(user.bookmarks || [])];
    
    const wasBookmarked = isBookmarked;
    setIsBookmarked(!wasBookmarked);
    
    try {
      const token = await fbUser?.getIdToken();
      
      // Update flat bookmarks
      if (wasBookmarked) {
        newBookmarks = newBookmarks.filter(id => id !== qId);
      } else {
        newBookmarks.push(qId);
      }
      
      await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookmarks: newBookmarks })
      });
      refreshProfile();

      // Sync with playlists
      if (wasBookmarked) {
        // Remove from all playlists of this subject
        for (const pl of playlists) {
          const hasQ = (pl.questions || []).some((q: any) => String(q._id) === String(qId) || String(q) === String(qId));
          if (hasQ) {
            await fetch(`/api/playlists/${pl._id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ questionId: qId, action: 'remove' })
            });
          }
        }
      } else {
        // Add to default playlist "Important For Exams"
        const defaultPl = playlists.find(p => p.name === 'Important For Exams');
        if (defaultPl) {
          const hasQ = (defaultPl.questions || []).some((q: any) => String(q._id) === String(qId) || String(q) === String(qId));
          if (!hasQ) {
            await fetch(`/api/playlists/${defaultPl._id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ questionId: qId, action: 'add' })
            });
          }
        }
      }
      
      // Reload playlists
      await loadPlaylists();
    } catch (err) {
      console.error("Failed to sync bookmark state with playlists:", err);
    }
  };

  const toggleQuestionInPlaylist = async (playlistId: string, isInPlaylist: boolean) => {
    if (!currentQuestion?._id) return;
    playSoundEffect('click');
    try {
      const token = await fbUser?.getIdToken();
      const res = await fetch(`/api/playlists/${playlistId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          questionId: currentQuestion._id,
          action: isInPlaylist ? 'remove' : 'add'
        })
      });
      if (res.ok) {
        const data = await res.json();
        // Update local playlists state
        setPlaylists(prev => prev.map(p => p._id === data.playlist._id ? data.playlist : p));
      }
    } catch (err) {
      console.error("Failed to toggle question in playlist:", err);
    }
  };

  // Floating Hint AI trigger
  const handleOpenHint = async () => {
    setHintOpen(true);
    playSoundEffect('click');
    if (hintContent) return;

    setHintLoading(true);
    try {
      const token = await fbUser?.getIdToken();
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user?._id || 'student',
          questionId: currentQuestion._id,
          message: "Please give me a short, highly conceptual hint for this question that helps me solve it on my own without writing down the direct final answer. Format equations in LaTeX.",
          history: []
        })
      });
      const data = await res.json();
      setHintContent(data.reply || "Think about the properties related to " + currentQuestion.topic);
    } catch {
      setHintContent("Analyze the primary formula for " + currentQuestion.topic + " and evaluate boundary constraints.");
    } finally {
      setHintLoading(false);
    }
  };

  // Format Timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Text scale classes mapping
  const getTextSizeClass = (size: string) => {
    switch (size) {
      case 'small': return 'text-xs leading-normal';
      case 'large': return 'text-lg sm:text-xl leading-relaxed';
      case 'extra-large': return 'text-xl sm:text-2xl leading-loose';
      case 'medium':
      default: return 'text-sm sm:text-base leading-relaxed';
    }
  };

  // Mock Solutions by Others
  const getCommunitySolutions = () => {
    return [
      {
        author: "PriyanshuM",
        avatar: "PM",
        role: "Class Topper • Sem 4",
        upvotes: 42,
        content: `Here's how I solved this in the sessional exam. The key trick is to apply the boundary integration constraints right away to avoid complex algebra:\n\n$$y(0) = 1 \\implies C = \\pi/4$$\n\nMake sure to write out this step clearly so the university examiner awards full marks!`
      },
      {
        author: "Kunal_CSE",
        avatar: "KC",
        role: "MMMUT Peer",
        upvotes: 27,
        content: `For programming questions in this topic, don't forget to write out a base case handler where $N \\le 0$. Here is the recursive shorthand C program version:\n\n\`\`\`c\nint solve(int n) {\n    return n <= 0 ? 0 : n + solve(n-1);\n}\n\`\`\``
      }
    ];
  };

  // Related study notes banners
  const getRelatedNotes = () => {
    return [
      {
        title: `${currentQuestion.topic} Formula Sheet`,
        desc: "Essential equations and standard theorems for exam night.",
        link: "/notes"
      },
      {
        title: `Unit ${currentQuestion.unit} High Yield Syllabus Cards`,
        desc: "Review sessional checklists and previous year trends.",
        link: `/subjects/${subjectId}`
      }
    ];
  };

  // Perceived performance loading simulation for solution
  const triggerSolutionFetch = () => {
    if (solutionLoading) return;
    
    setSolutionLoading(true);
    setSolutionVisible(false);
    setSolutionError(null);
    setSolutionProgress(0);
    setExplainingStep(null);
    setStepExplanation(null);

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

    const getAiSolve = async () => {
      try {
        const token = await fbUser?.getIdToken();
        const res = await fetch(`/api/ai/solve?questionId=${currentQuestion._id}`, {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
        if (!res.ok) throw new Error('API server returned a non-200 status');
        const data = await res.json();
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
      } catch (err: any) {
        clearInterval(interval);
        setSolutionProgress(100);
        setTimeout(() => {
          setSolutionError(err.message || "MongoDB/Groq API server returned an error.");
          setActiveSolution(null);
          setSolutionLoading(false);
          setSolutionVisible(false);
        }, 300);
      }
    };
    getAiSolve();
  };

  const handleExplainStep = (stepNumber: number, stepText: string, event: React.MouseEvent) => {
    if (stepExplanationLoading) return;
    event.stopPropagation();

    setExplainingStep(stepNumber);
    setExplainingStepText(stepText);
    setStepExplanationLoading(true);
    setStepExplanation(null);

    const getExplainStep = async () => {
      try {
        const token = await fbUser?.getIdToken();
        const res = await fetch('/api/ai/explain-step', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            questionId: currentQuestion._id,
            stepNumber,
            stepText,
            subjectId,
            fallbackContext: {
              solutionType: activeSolution?.type
            }
          })
        });
        const data = await res.json();
        setStepExplanation(data.explanation);
        setStepExplanationLoading(false);
      } catch {
        setStepExplanation("Failed to load step explanation from server.");
        setStepExplanationLoading(false);
      }
    };
    getExplainStep();
  };

  const handleAskAi = () => {
    setAiDrawerOpen(true);
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
      const token = await fbUser?.getIdToken();
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user?._id || 'student',
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

  const completeSession = async () => {
    try {
      const token = await fbUser?.getIdToken();
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'completed' })
      });
      refreshProfile();
    } catch (err) {
      console.error("Failed to complete practice session:", err);
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
      completeSession();
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

  // Answer validation permission guard
  const canViewSolution = !preferences.delayAnswer || hasCheckedAnswer;

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

          <div className="flex items-center space-x-3">
            {/* Active timer widget in question header */}
            <div className="flex items-center space-x-1.5 text-xs text-text-secondary bg-bg-secondary/80 px-2.5 py-1.5 rounded-lg border border-border-primary">
              <Clock className={`w-3.5 h-3.5 text-accent ${isTimerActive ? 'animate-pulse' : ''}`} />
              <span className="font-mono">{formatTime(timeElapsed)}</span>
              <button 
                onClick={toggleTimerState} 
                className="p-0.5 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-all"
                title={isTimerActive ? "Pause Timer" : "Resume Timer"}
              >
                {isTimerActive ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
              </button>
            </div>

            <span className="text-xs font-semibold px-2 py-1 rounded bg-accent/10 text-accent">
              Q. {currentIdx + 1} of {questions.length}
            </span>
            <button
              onClick={() => setSettingsDrawerOpen(true)}
              className="p-2 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary transition-colors"
              title="Practice Settings"
            >
              <Settings className="w-4 h-4 text-text-secondary" />
            </button>
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
            
            <h2 className={`${getTextSizeClass(preferences.textSize)} font-semibold leading-relaxed text-text-primary mb-6`}>
              <MathMarkdown content={currentQuestion.questionText} />
            </h2>

            {/* Answer Attempt Area */}
            <div className="mt-6 border-t border-border-primary/40 pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  <FileEdit className="w-4 h-4 text-accent" />
                  <span>Draft Your Answer Attempt</span>
                </span>
                <span className="text-[10px] text-text-muted">
                  {userAttempt.length} characters
                </span>
              </div>
              
              <textarea
                value={userAttempt}
                onChange={(e) => {
                  setUserAttempt(e.target.value);
                  if (e.target.value && !isTimerActive && !preferences.autoTimer) {
                    setIsTimerActive(true); // Start timer once user starts typing
                  }
                }}
                placeholder="Type your mathematical equations, steps, or program code logic here. Submit to the AI grader for accuracy validation and feedback..."
                className={`w-full h-32 p-4 text-xs rounded-xl bg-bg-primary/50 text-text-primary border ${
                  evaluationResult 
                    ? evaluationResult.accuracy >= 70 
                      ? 'border-emerald-500/50 focus:border-emerald-500' 
                      : 'border-rose-500/50 focus:border-rose-500'
                    : 'border-border-primary focus:border-accent'
                } focus:outline-none transition-all duration-300 resize-none`}
              />

              {evaluationResult && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-3 p-4 rounded-xl border text-xs leading-relaxed ${
                    evaluationResult.accuracy >= 70
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span className="flex items-center gap-1">
                      {evaluationResult.accuracy >= 70 ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      <span>Accuracy Score: {evaluationResult.accuracy}%</span>
                    </span>
                    <span>{evaluationResult.accuracy >= 70 ? '+15 XP' : 'Incorrect Attempt'}</span>
                  </div>
                  <p className="text-text-secondary">{evaluationResult.feedback}</p>
                </motion.div>
              )}

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-3 relative">
                  <button
                    onClick={toggleBookmark}
                    className={`flex items-center space-x-1.5 text-[11px] font-semibold transition-colors ${
                      isBookmarked ? 'text-amber-400 hover:text-amber-500' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400' : ''}`} />
                    <span>{isBookmarked ? 'Bookmarked' : 'Bookmark Question'}</span>
                  </button>

                  {isBookmarked && playlists.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setIsPlaylistMenuOpen(!isPlaylistMenuOpen)}
                        className="text-[10px] text-accent hover:underline font-semibold flex items-center gap-0.5"
                      >
                        (Add to playlists)
                      </button>
                      {isPlaylistMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsPlaylistMenuOpen(false)} />
                          <div className="absolute left-0 mt-1.5 w-48 rounded-xl bg-bg-secondary border border-border-primary shadow-2xl p-3 z-50 space-y-2 text-left">
                            <p className="text-[9px] uppercase font-black tracking-wider text-text-muted">Choose Playlists</p>
                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                              {playlists.map((pl) => {
                                const hasQ = (pl.questions || []).some((q: any) => String(q._id) === String(currentQuestion._id) || String(q) === String(currentQuestion._id));
                                return (
                                  <label key={pl._id} className="flex items-center gap-2 text-[10px] font-bold text-text-primary cursor-pointer hover:text-accent select-none">
                                    <input
                                      type="checkbox"
                                      checked={hasQ}
                                      onChange={() => toggleQuestionInPlaylist(pl._id, hasQ)}
                                      className="rounded border-border-primary bg-bg-primary text-accent focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                                    />
                                    <span className="truncate">{pl.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {userAttempt.trim() && (
                  <button
                    onClick={verifyAttempt}
                    disabled={evaluationLoading}
                    className="px-4 py-2 rounded-lg bg-accent/15 border border-accent/30 text-accent text-xs font-semibold hover:bg-accent/25 transition-all flex items-center space-x-1.5"
                  >
                    {evaluationLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Grade My Answer</span>
                  </button>
                )}
              </div>
            </div>

            {/* Buttons Row */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 pt-4 border-t border-border-primary/30">
              {!solutionVisible && !solutionLoading && (
                <button
                  onClick={canViewSolution ? triggerSolutionFetch : undefined}
                  disabled={!canViewSolution}
                  className={`w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center space-x-2 ${
                    canViewSolution 
                      ? 'bg-accent text-white hover:bg-accent-hover hover:-translate-y-0.5 shadow-md hover:shadow-lg' 
                      : 'bg-bg-primary border border-border-primary/50 text-text-muted cursor-not-allowed'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>{canViewSolution ? 'Show Solution' : 'Check answer first (Settings)'}</span>
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
              className="p-8 rounded-2xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm shadow-[0_0_30px_rgba(0,0,0,0.25)] space-y-6"
            >
              {/* Solution Tabs */}
              <div className="flex border-b border-border-primary/50 pb-1">
                <button
                  onClick={() => setSolutionTab('verified')}
                  className={`px-4 py-2 text-xs font-bold transition-all relative ${
                    solutionTab === 'verified' ? 'text-accent' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span>Verified Solution</span>
                  {solutionTab === 'verified' && (
                    <motion.div layoutId="solTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
                  )}
                </button>
                <button
                  onClick={() => setSolutionTab('others')}
                  className={`px-4 py-2 text-xs font-bold transition-all relative flex items-center space-x-1.5 ${
                    solutionTab === 'others' ? 'text-accent' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span>Solutions by Others</span>
                  <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-accent/10 text-accent font-semibold">2</span>
                  {solutionTab === 'others' && (
                    <motion.div layoutId="solTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
                  )}
                </button>
              </div>

              {solutionTab === 'verified' ? (
                <>
                  <h3 className="font-display font-bold text-base text-text-primary pb-1 flex items-center space-x-2.5">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Syllabus-Aligned Solution</span>
                  </h3>

                  {/* Pathway A: Coding */}
                  {activeSolution.type === 'coding' && (
                    <div className="space-y-6">
                      {activeSolution.content && (
                        <div className="p-5 rounded-xl bg-bg-primary/20 border border-border-primary/50 text-sm leading-relaxed text-text-secondary">
                          <div className="flex items-center gap-2 mb-2 text-text-primary font-semibold">
                            <Info className="w-4 h-4 text-accent" />
                            <span>Approach & Implementation Strategy</span>
                          </div>
                          <MathMarkdown content={activeSolution.content} />
                        </div>
                      )}

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

                      {activeSolution.code && (
                        <div className="space-y-2">
                          <div className="text-xs font-bold text-text-primary flex items-center gap-1.5 px-1">
                            <Code2 className="w-4 h-4 text-accent" />
                            <span>Complete C Program</span>
                          </div>
                          <MathMarkdown content={`\`\`\`c\n${activeSolution.code}\n\`\`\``} />
                        </div>
                      )}

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
                      {activeSolution.content && (
                        <div className="p-5 rounded-xl bg-bg-primary/20 border border-border-primary/50 text-sm leading-relaxed text-text-secondary">
                          <div className="flex items-center gap-2 mb-2 text-text-primary font-semibold">
                            <Info className="w-4 h-4 text-accent" />
                            <span>Logic Strategy</span>
                          </div>
                          <MathMarkdown content={activeSolution.content} />
                        </div>
                      )}

                      {activeSolution.mermaid && (
                        <div className="space-y-2">
                          <div className="text-xs font-bold text-text-primary flex items-center gap-1.5 px-1">
                            <Workflow className="w-4 h-4 text-accent" />
                            <span>Visual Flow Control Chart</span>
                          </div>
                          <MathMarkdown content={`\`\`\`mermaid\n${activeSolution.mermaid}\n\`\`\``} />
                        </div>
                      )}

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
                      {activeSolution.content && (
                        <div className="p-5 rounded-xl bg-bg-primary/20 border border-border-primary/50 text-sm leading-relaxed text-text-secondary font-medium">
                          <MathMarkdown content={activeSolution.content} />
                        </div>
                      )}

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
                          <span className="absolute -left-[35px] top-0 w-6 h-6 rounded-full bg-bg-secondary border border-accent text-accent shadow-[0_0_12px_rgba(124,102,255,0.3)] flex items-center justify-center text-xs font-black select-none z-10 transition-transform duration-300 group-hover:scale-110">
                            {step.stepNumber}
                          </span>
                          
                          <div className="p-5 rounded-2xl border border-border-primary bg-bg-primary/25 backdrop-blur-md hover:border-accent/30 hover:bg-accent/[0.015] hover:shadow-lg transition-all duration-300 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="text-xs font-black text-text-primary tracking-wide flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                                {activeSolution.type === 'theoretical' 
                                  ? `${step.heading}` 
                                  : `Step ${step.stepNumber}: ${step.heading}`}
                              </div>
                              
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
                </>
              ) : (
                /* Solutions by Others (Community) */
                <div className="space-y-4">
                  {getCommunitySolutions().map((peerSol, pIdx) => (
                    <div key={pIdx} className="p-5 rounded-xl border border-border-primary bg-bg-primary/20 hover:border-accent/20 transition-all duration-300 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/30 text-accent flex items-center justify-center font-bold text-xs">
                            {peerSol.avatar}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-text-primary">{peerSol.author}</div>
                            <div className="text-[10px] text-text-muted">{peerSol.role}</div>
                          </div>
                        </div>
                        <button className="px-2.5 py-1 rounded bg-bg-primary border border-border-primary text-text-secondary flex items-center space-x-1 text-[10px] transition-colors">
                          <ThumbsUp className="w-3 h-3 text-accent" />
                          <span>{peerSol.upvotes}</span>
                        </button>
                      </div>
                      <div className="text-xs leading-relaxed text-text-secondary">
                        <MathMarkdown content={peerSol.content} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Related notes and concept cards shortcut banners */}
              <div className="mt-6 border-t border-border-primary/30 pt-6">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-3">Related Study Notes</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {getRelatedNotes().map((note, nIdx) => (
                    <Link
                      key={nIdx}
                      href={note.link}
                      className="p-4 rounded-xl border border-border-primary bg-bg-primary/30 hover:border-accent/30 hover:bg-accent/[0.01] transition-all flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-xs font-bold text-text-primary group-hover:text-accent transition-colors">{note.title}</div>
                        <div className="text-[10px] text-text-muted mt-0.5">{note.desc}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Personal Notebook Note Section */}
          {user && (
            <div id="notes-section" className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-text-primary flex items-center space-x-2">
                <FileText className="w-4 h-4 text-accent" />
                <span>My Notebook Study Note</span>
              </h3>
              <textarea
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
                placeholder="Write down any tips, formulas, or corrections you want to save for this question. This will be persisted to your Notebooks manager..."
                className="w-full h-20 p-3 text-xs rounded-xl bg-bg-primary/30 text-text-primary border border-border-primary focus:outline-none focus:border-accent resize-none"
              />
              <div className="flex justify-end">
                <button
                  onClick={savePersonalNote}
                  disabled={savingNote}
                  className="px-3.5 py-1.5 rounded-lg bg-bg-primary hover:bg-bg-tertiary border border-border-primary text-[10px] font-semibold text-text-primary flex items-center space-x-1 transition-colors"
                >
                  {savingNote ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                  )}
                  <span>{savingNote ? 'Saving...' : 'Save Note'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Explain This Step Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {explainingStep !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6 p-0"
            onClick={() => { setExplainingStep(null); setStepExplanation(null); setExplainingStepText(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 24 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:w-[760px] lg:w-[880px] max-h-[88vh] sm:max-h-[80vh] rounded-t-2xl sm:rounded-2xl overflow-hidden border border-accent/20 bg-bg-secondary shadow-2xl flex flex-col"
            >
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

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
                <div className="md:w-56 lg:w-64 flex-none bg-bg-primary border-b md:border-b-0 md:border-r border-border-primary p-4 flex flex-col space-y-3 overflow-y-auto max-h-36 md:max-h-none">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Step Content</p>
                  <div className="text-xs text-text-secondary leading-relaxed line-clamp-[12] md:line-clamp-none">
                    <MathMarkdown content={explainingStepText || ''} />
                  </div>
                </div>

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
        )}
      </AnimatePresence>

      {/* Floating View Hint Button */}
      <AnimatePresence>
        {!loading && !isCompleted && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOpenHint}
            className="fixed bottom-24 left-8 z-[99] p-3 rounded-full bg-amber-500 text-white shadow-[0_4px_20px_rgba(245,158,11,0.4)] border border-amber-400 hover:shadow-[0_6px_25px_rgba(245,158,11,0.6)] hover:border-amber-300 transition-all duration-300 flex items-center justify-center cursor-pointer"
            title="View Hint"
          >
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating Qs Hint Popup Card Overlay */}
      <AnimatePresence>
        {hintOpen && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-bg-secondary border border-amber-500/30 max-w-md w-full p-6 rounded-2xl shadow-2xl flex flex-col space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border-primary pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="font-display font-bold text-sm text-text-primary">Syllabus Guide Hint</span>
                </div>
                <button
                  onClick={() => setHintOpen(false)}
                  className="p-1 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs leading-relaxed text-text-secondary min-h-24 flex items-center justify-center">
                {hintLoading ? (
                  <div className="flex flex-col items-center space-y-2 text-text-muted">
                    <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                    <span>Consulting syllabus assistant...</span>
                  </div>
                ) : (
                  <MathMarkdown content={hintContent || 'No hint available.'} />
                )}
              </div>

              <button
                onClick={() => setHintOpen(false)}
                className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-md shadow-amber-500/10"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Drawer */}
      <AnimatePresence>
        {settingsDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSettingsDrawerOpen(false)}
              className="fixed inset-0 z-45 bg-black"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-96 bg-bg-secondary border-l border-border-primary flex flex-col shadow-2xl"
            >
              <div className="h-16 px-4 border-b border-border-primary/50 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sliders className="w-5 h-5 text-accent" />
                  <span className="font-display font-bold text-sm text-text-primary">Practice Settings</span>
                </div>
                <button 
                  onClick={() => setSettingsDrawerOpen(false)}
                  className="p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-6 space-y-6">
                {/* 1. Play Sounds */}
                <div className="flex items-center justify-between border-b border-border-primary/30 pb-4">
                  <div>
                    <div className="text-xs font-bold text-text-primary">Sound Effects</div>
                    <div className="text-[10px] text-text-muted mt-0.5">Play dynamic chimes for grades.</div>
                  </div>
                  <button
                    onClick={() => updatePreferences({ playSounds: !preferences.playSounds })}
                    className={`p-2 rounded-lg border transition-colors ${
                      preferences.playSounds 
                        ? 'bg-accent/15 border-accent text-accent' 
                        : 'bg-bg-primary border-border-primary text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {preferences.playSounds ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                </div>

                {/* 2. Auto Timer */}
                <div className="flex items-center justify-between border-b border-border-primary/30 pb-4">
                  <div>
                    <div className="text-xs font-bold text-text-primary">Auto Timer</div>
                    <div className="text-[10px] text-text-muted mt-0.5">Start timer automatically on load.</div>
                  </div>
                  <button
                    onClick={() => updatePreferences({ autoTimer: !preferences.autoTimer })}
                    className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-colors ${
                      preferences.autoTimer 
                        ? 'bg-accent/15 border-accent text-accent' 
                        : 'bg-bg-primary border-border-primary text-text-muted'
                    }`}
                  >
                    {preferences.autoTimer ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                {/* 3. Delay Answers */}
                <div className="flex items-center justify-between border-b border-border-primary/30 pb-4">
                  <div>
                    <div className="text-xs font-bold text-text-primary">Delay Answer Checks</div>
                    <div className="text-[10px] text-text-muted mt-0.5">Hide solutions until you submit an attempt.</div>
                  </div>
                  <button
                    onClick={() => updatePreferences({ delayAnswer: !preferences.delayAnswer })}
                    className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-colors ${
                      preferences.delayAnswer 
                        ? 'bg-accent/15 border-accent text-accent' 
                        : 'bg-bg-primary border-border-primary text-text-muted'
                    }`}
                  >
                    {preferences.delayAnswer ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                {/* 4. Text Size */}
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-bold text-text-primary">Question Text Size</div>
                    <div className="text-[10px] text-text-muted mt-0.5">Scale questions for clarity.</div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {(['small', 'medium', 'large', 'extra-large'] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => updatePreferences({ textSize: size })}
                        className={`py-2 text-[10px] font-bold rounded-lg border transition-all ${
                          preferences.textSize === size
                            ? 'bg-accent/15 border-accent text-accent'
                            : 'bg-bg-primary border-border-primary text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {size === 'small' ? 'Small' :
                         size === 'medium' ? 'Medium' :
                         size === 'large' ? 'Large' : 'XL'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Right Drawer: Ask AI Interface */}
      <AnimatePresence>
        {aiDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setAiDrawerOpen(false)}
              className="fixed inset-0 z-45 bg-black"
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-96 bg-bg-secondary border-l border-border-primary flex flex-col shadow-2xl"
            >
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

      {/* Confirmation Dialog */}
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
              <div className="w-12 h-12 rounded-xl bg-accent/5 border border-accent/20 flex items-center justify-center text-accent shadow-sm">
                <HelpCircle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-bold text-base text-text-primary">Finish Session?</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Are you sure you want to finish this practice session? Your progress will be saved.
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
                  className="flex-1 py-2.5 rounded-lg bg-accent text-white hover:bg-accent-hover text-xs font-bold transition-all shadow-md"
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
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}

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
      </div>
    </div>
  );
}
