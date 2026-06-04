'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/components/auth-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { 
  Loader2, 
  ArrowLeft, 
  Check, 
  ChevronRight, 
  ChevronDown, 
  BookOpen, 
  Save, 
  AlertTriangle,
  LogOut,
  User as UserIcon
} from 'lucide-react';

const MathMarkdown = dynamic(() => import('@/components/math-markdown').then((mod) => mod.MathMarkdown), {
  ssr: false,
  loading: () => <div className="animate-pulse h-12 bg-bg-secondary rounded border border-border-primary/50 w-full" />,
});

interface IPaper {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  year: number;
  examType: string;
  questionsCount: number;
  verifiedCount: number;
  flaggedCount: number;
}

interface IQuestion {
  _id: string;
  questionId: string;
  unit: number;
  topic: string;
  questionText: string;
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  verificationStatus: 'pending' | 'verified' | 'flagged';
  verificationComment?: string;
}

export default function ModeratorDashboard() {
  const router = useRouter();
  const { user, fbUser, loading, logout } = useAuth();

  const [papers, setPapers] = useState<IPaper[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<IPaper | null>(null);

  const [questions, setQuestions] = useState<IQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  
  // Expanded question card tracking
  const [expandedQId, setExpandedQId] = useState<string | null>(null);
  
  // Edit forms state
  const [editText, setEditText] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [editUnit, setEditUnit] = useState(1);
  const [editMarks, setEditMarks] = useState(10);
  const [editDifficulty, setEditDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Authenticate role check (Moderators and Admins only)
  useEffect(() => {
    if (!loading) {
      if (!fbUser) {
        router.push('/login');
      } else if (user && user.role !== 'moderator' && user.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, fbUser, loading, router]);

  // Load papers list
  const loadPapers = async () => {
    if (!fbUser) return;
    setLoadingPapers(true);
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch('/api/verifier/papers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filters papers list to display only those with active flags for the moderator
        const papersWithFlags = (data.papers || []).filter((p: IPaper) => p.flaggedCount > 0);
        setPapers(papersWithFlags);
      }
    } catch (err) {
      console.error('Failed to load papers:', err);
    } finally {
      setLoadingPapers(false);
    }
  };

  useEffect(() => {
    if (fbUser && user && (user.role === 'moderator' || user.role === 'admin')) {
      loadPapers();
    }
  }, [fbUser, user]);

  // Load flagged questions for paper (the backend handles filtering by status 'flagged' for moderator)
  const loadQuestionsForPaper = async (paper: IPaper) => {
    if (!fbUser) return;
    setLoadingQuestions(true);
    setExpandedQId(null);
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch(
        `/api/verifier/questions?subjectId=${paper.subjectId}&year=${paper.year}&examType=${encodeURIComponent(paper.examType)}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
        setSelectedPaper(paper);
      }
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleExpandQuestion = (q: IQuestion) => {
    if (expandedQId === q._id) {
      setExpandedQId(null);
    } else {
      setExpandedQId(q._id);
      setEditText(q.questionText);
      setEditTopic(q.topic);
      setEditUnit(q.unit);
      setEditMarks(q.marks);
      setEditDifficulty(q.difficulty);
      setErrorMsg(null);
    }
  };

  const submitModeration = async (qId: string, verify: boolean) => {
    if (!fbUser) return;
    setSubmittingVerification(true);
    setErrorMsg(null);

    const finalStatus = verify ? 'verified' : 'flagged';

    try {
      const token = await fbUser.getIdToken();
      const res = await fetch(`/api/verifier/questions/${qId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          verificationStatus: finalStatus,
          questionText: editText,
          topic: editTopic,
          unit: editUnit,
          marks: editMarks,
          difficulty: editDifficulty
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update moderation state.');
      }

      // If verified, remove it from the moderator's review list immediately
      if (verify) {
        setQuestions(prev => prev.filter(q => q._id !== qId));
        setExpandedQId(null);
      } else {
        const updatedData = await res.json();
        setQuestions(prev => prev.map(q => q._id === qId ? updatedData.question : q));
      }

      // Reload papers list to update flag counts
      loadPapers();

    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating moderation details.');
    } finally {
      setSubmittingVerification(false);
    }
  };

  if (loading || !fbUser || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
          <p className="text-xs text-text-secondary">Securing moderation workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between relative bg-bg-primary text-text-primary">
      
      {/* Top Navbar */}
      <header className="border-b border-border-primary/50 bg-bg-primary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="p-2 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="font-display font-black tracking-wider text-sm uppercase bg-gradient-to-r from-red-400 via-orange-400 to-accent bg-clip-text text-transparent">
              Moderator Audit workspace
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-full border border-border-primary bg-bg-secondary/40">
              <UserIcon className="w-3.5 h-3.5 text-accent" />
              <span>{user.displayName || user.email}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/10 border border-accent/25 text-accent uppercase tracking-wider font-extrabold">{user.role}</span>
            </div>
            <ThemeToggle />
            <button 
              onClick={() => logout().then(() => router.push('/login'))}
              className="p-2 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Panel Workspace Grid */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8 relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Left Side: Flagged papers index */}
        <div className="md:col-span-4 space-y-4">
          <h2 className="font-display font-extrabold text-sm uppercase tracking-wider text-text-secondary flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-accent" />
            <span>Select Flagged Papers</span>
          </h2>

          {loadingPapers ? (
            <div className="py-12 text-center space-y-2.5">
              <Loader2 className="w-6 h-6 text-accent animate-spin mx-auto" />
              <p className="text-xs text-text-secondary">Filtering flagged indices...</p>
            </div>
          ) : papers.length > 0 ? (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
              {papers.map((p, idx) => {
                const isSelected = selectedPaper && selectedPaper.subjectId === p.subjectId && selectedPaper.year === p.year && selectedPaper.examType === p.examType;
                
                return (
                  <button
                    key={idx}
                    onClick={() => loadQuestionsForPaper(p)}
                    className={`w-full p-4 rounded-xl border text-left flex flex-col justify-between group transition-all duration-200 relative overflow-hidden ${
                      isSelected
                        ? 'border-accent bg-accent/5 ring-2 ring-accent/10 shadow-sm'
                        : 'border-border-primary bg-bg-secondary/40 hover:border-accent/40 hover:bg-bg-secondary'
                    }`}
                  >
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] px-2 py-0.5 rounded bg-border-primary text-text-secondary font-bold uppercase tracking-wide">
                          {p.subjectCode}
                        </span>
                        <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">
                          {p.flaggedCount} FLAGGED
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-text-primary text-xs leading-snug group-hover:text-accent transition-colors">
                        {p.subjectName}
                      </h3>
                    </div>
                    <div className="mt-2.5 text-[8px] uppercase tracking-wider font-extrabold font-mono text-text-muted">
                      Paper context: {p.year} • {p.examType}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center border border-dashed border-border-primary rounded-xl text-text-secondary text-xs bg-bg-secondary/20">
              No flagged questions pending moderation audit.
            </div>
          )}
        </div>

        {/* Right Side: Flagged questions list */}
        <div className="md:col-span-8 space-y-6">
          {selectedPaper ? (
            <div className="space-y-4">
              {/* Paper header */}
              <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex justify-between items-center">
                <div>
                  <h2 className="font-display font-extrabold text-base text-text-primary">{selectedPaper.subjectName}</h2>
                  <p className="text-[10px] text-red-500 uppercase tracking-wider font-bold mt-0.5">
                    {selectedPaper.subjectCode} • {selectedPaper.year} • {selectedPaper.examType} • {questions.length} flagged questions
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 font-bold uppercase tracking-wider animate-pulse">
                  Moderation Required
                </span>
              </div>

              {loadingQuestions ? (
                <div className="py-20 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
                  <p className="text-xs text-text-secondary">Retrieving flagged questions...</p>
                </div>
              ) : questions.length > 0 ? (
                <div className="space-y-4">
                  {questions.map((q, qIdx) => {
                    const isExpanded = expandedQId === q._id;

                    return (
                      <div 
                        key={q._id} 
                        className="rounded-2xl border border-red-500/20 bg-red-500/5 shadow-sm transition-all duration-200"
                      >
                        {/* Collapsed Header */}
                        <div 
                          onClick={() => handleExpandQuestion(q)}
                          className="p-5 flex items-start justify-between cursor-pointer select-none"
                        >
                          <div className="flex-grow space-y-2 pr-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-[9px] px-2 py-0.5 rounded bg-accent/10 border border-accent/25 text-accent font-bold uppercase tracking-wider">
                                Unit {q.unit}
                              </span>
                              <span className="text-[9px] px-2 py-0.5 rounded bg-border-primary text-text-secondary font-semibold uppercase tracking-wider">
                                {q.marks} Marks
                              </span>
                              <span className="text-[9px] px-2 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-500 font-bold uppercase tracking-wider">
                                {q.verificationStatus}
                              </span>
                            </div>
                            <div className="text-xs text-text-primary leading-relaxed font-semibold">
                              Q{qIdx + 1}. <span className="font-normal text-text-secondary">{q.topic}</span>
                            </div>
                            
                            {/* Prominent verifier comment */}
                            {q.verificationComment && (
                              <div className="text-[10px] text-red-600 flex items-start space-x-1.5 font-semibold bg-red-500/10 p-3 rounded-lg border border-red-500/20 leading-relaxed">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                                <div>
                                  <span className="uppercase text-[8px] font-extrabold tracking-wider block text-red-500/80 mb-0.5">Verifier Audit Comment:</span>
                                  <span>{q.verificationComment}</span>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="mt-1">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-text-secondary" /> : <ChevronRight className="w-4 h-4 text-text-secondary" />}
                          </div>
                        </div>

                        {/* Expanded workspace */}
                        {isExpanded && (
                          <div className="p-5 border-t border-red-500/10 bg-bg-secondary/40 space-y-5">
                            
                            {errorMsg && (
                              <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-500 text-xs flex items-center space-x-2">
                                <AlertTriangle className="w-4 h-4" />
                                <span>{errorMsg}</span>
                              </div>
                            )}

                            {/* LaTeX preview */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] uppercase font-bold tracking-wider text-text-muted">LaTeX / Math Preview</label>
                              <div className="p-4 rounded-xl border border-border-primary bg-bg-secondary/80 text-sm leading-relaxed overflow-x-auto">
                                <MathMarkdown content={editText || 'Empty question body'} />
                              </div>
                            </div>

                            {/* Edit inputs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Topic Parameter</label>
                                <input
                                  type="text"
                                  value={editTopic}
                                  onChange={(e) => setEditTopic(e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl border border-border-primary bg-bg-secondary text-xs focus:border-accent"
                                />
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Unit</label>
                                  <input
                                    type="number"
                                    value={editUnit}
                                    onChange={(e) => setEditUnit(parseInt(e.target.value, 10))}
                                    className="w-full px-3 py-2 rounded-xl border border-border-primary bg-bg-secondary text-xs text-center focus:border-accent"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Marks</label>
                                  <input
                                    type="number"
                                    value={editMarks}
                                    onChange={(e) => setEditMarks(parseInt(e.target.value, 10))}
                                    className="w-full px-3 py-2 rounded-xl border border-border-primary bg-bg-secondary text-xs text-center focus:border-accent"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Difficulty</label>
                                  <select
                                    value={editDifficulty}
                                    onChange={(e) => setEditDifficulty(e.target.value as any)}
                                    className="w-full px-3 py-2 rounded-xl border border-border-primary bg-bg-secondary text-xs focus:border-accent"
                                  >
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                  </select>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Edit Question Text</label>
                              <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                rows={4}
                                className="w-full p-3 rounded-xl border border-border-primary bg-bg-secondary font-mono text-xs focus:border-accent"
                              />
                            </div>

                            {/* Actions panel */}
                            <div className="flex flex-wrap items-center justify-between border-t border-border-primary/50 pt-4 gap-2">
                              <button
                                onClick={() => submitModeration(q._id, true)}
                                disabled={submittingVerification}
                                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-sm"
                              >
                                <Check className="w-4 h-4" />
                                <span>Resolve & Verify</span>
                              </button>
                              <button
                                onClick={() => submitModeration(q._id, false)}
                                disabled={submittingVerification}
                                className="px-4.5 py-2 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-xs font-bold transition-colors flex items-center space-x-1.5"
                              >
                                <Save className="w-3.5 h-3.5 text-accent" />
                                <span>Save Changes</span>
                              </button>
                            </div>

                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-border-primary rounded-2xl text-text-secondary text-xs bg-bg-secondary/20">
                  All flagged issues for this paper have been resolved.
                </div>
              )}
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center border border-dashed border-border-primary/60 rounded-2xl bg-bg-secondary/10">
              <div className="text-center space-y-2">
                <BookOpen className="w-8 h-8 text-text-muted mx-auto animate-pulse" />
                <h3 className="font-display font-bold text-text-primary text-sm">No Paper Selected</h3>
                <p className="text-xs text-text-secondary max-w-xs mx-auto">Select a flagged syllabus index on the left to start moderation reviews.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-primary/50 bg-bg-secondary/20 py-4 text-center text-[10px] text-text-secondary">
        <p>PaperHub Moderation Panel • Secure resolution environment.</p>
      </footer>
    </div>
  );
}
