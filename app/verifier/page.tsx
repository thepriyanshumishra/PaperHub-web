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
  Flag, 
  ChevronRight, 
  ChevronDown, 
  BookOpen, 
  Edit3, 
  Save, 
  AlertTriangle,
  LogOut,
  User as UserIcon,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

export default function VerifierDashboard() {
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

  // Flag Modal state
  const [flagQId, setFlagQId] = useState<string | null>(null);
  const [flagComment, setFlagComment] = useState('');
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Authenticate role check
  useEffect(() => {
    if (!loading) {
      if (!fbUser) {
        router.push('/login');
      } else if (user && user.role !== 'verifier' && user.role !== 'admin' && user.role !== 'moderator') {
        router.push('/');
      }
    }
  }, [user, fbUser, loading, router]);

  // Load unique papers
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
        setPapers(data.papers || []);
      }
    } catch (err) {
      console.error('Failed to load papers:', err);
    } finally {
      setLoadingPapers(false);
    }
  };

  useEffect(() => {
    if (fbUser && user && (user.role === 'verifier' || user.role === 'admin' || user.role === 'moderator')) {
      loadPapers();
    }
  }, [fbUser, user]);

  // Load questions for selected paper
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

  // Expand and prefill edit fields
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

  // Submit verifier review decisions (verify or save edits)
  const submitVerification = async (qId: string, status: 'verified' | 'flagged' | 'pending', comment = '') => {
    if (!fbUser) return;
    setSubmittingVerification(true);
    setErrorMsg(null);

    const isEditChange = status === 'pending';
    const finalStatus = isEditChange ? questions.find(q => q._id === qId)?.verificationStatus || 'pending' : status;

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
          verificationComment: comment,
          questionText: editText,
          topic: editTopic,
          unit: editUnit,
          marks: editMarks,
          difficulty: editDifficulty
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update question verification details.');
      }

      const updatedData = await res.json();
      
      // Update local state questions array
      setQuestions(prev => prev.map(q => q._id === qId ? updatedData.question : q));
      setExpandedQId(null);
      setFlagQId(null);
      setFlagComment('');
      
      // Reload papers list to refresh progress stats
      loadPapers();

    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating question status.');
    } finally {
      setSubmittingVerification(false);
    }
  };

  if (loading || !fbUser || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
          <p className="text-xs text-text-secondary">Securing verifier workspace...</p>
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
            <span className="font-display font-black tracking-wider text-sm uppercase bg-gradient-to-r from-emerald-400 via-teal-400 to-accent bg-clip-text text-transparent">
              Verifier Workspace
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-full border border-border-primary bg-bg-secondary/40">
              <UserIcon className="w-3.5 h-3.5 text-accent" />
              <span>{user.displayName || user.email}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent uppercase tracking-wider font-extrabold">{user.role}</span>
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
        
        {/* Left Side: Exam Papers Index */}
        <div className="md:col-span-4 space-y-4">
          <h2 className="font-display font-extrabold text-sm uppercase tracking-wider text-text-secondary flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-accent" />
            <span>Select Paper to Verify</span>
          </h2>

          {loadingPapers ? (
            <div className="py-12 text-center space-y-2.5">
              <Loader2 className="w-6 h-6 text-accent animate-spin mx-auto" />
              <p className="text-xs text-text-secondary">Retrieving course papers...</p>
            </div>
          ) : papers.length > 0 ? (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
              {papers.map((p, idx) => {
                const isSelected = selectedPaper && selectedPaper.subjectId === p.subjectId && selectedPaper.year === p.year && selectedPaper.examType === p.examType;
                const completedRatio = p.questionsCount > 0 ? (p.verifiedCount / p.questionsCount) * 100 : 0;
                
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
                        <span className="text-[10px] text-text-secondary font-mono">
                          {p.year} • {p.examType}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-text-primary text-xs leading-snug group-hover:text-accent transition-colors">
                        {p.subjectName}
                      </h3>
                    </div>

                    {/* Progress tracking line */}
                    <div className="w-full mt-3 space-y-1.5">
                      <div className="h-1.5 w-full rounded-full bg-border-primary/50 overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                          style={{ width: `${completedRatio}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[8px] uppercase tracking-wider font-extrabold font-mono text-text-muted">
                        <span>{p.verifiedCount}/{p.questionsCount} Verified</span>
                        {p.flaggedCount > 0 && (
                          <span className="text-red-500">{p.flaggedCount} Flagged</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center border border-dashed border-border-primary rounded-xl text-text-secondary text-xs">
              No papers found matching indexing parameters.
            </div>
          )}
        </div>

        {/* Right Side: Questions Queue in Selected Paper */}
        <div className="md:col-span-8 space-y-6">
          {selectedPaper ? (
            <div className="space-y-4">
              {/* Paper header info */}
              <div className="p-4 rounded-xl border border-border-primary bg-bg-secondary/20 flex justify-between items-center">
                <div>
                  <h2 className="font-display font-extrabold text-base text-text-primary">{selectedPaper.subjectName}</h2>
                  <p className="text-[10px] text-text-secondary uppercase tracking-wider font-bold mt-0.5">
                    {selectedPaper.subjectCode} • {selectedPaper.year} • {selectedPaper.examType} • {questions.length} questions
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold uppercase tracking-wider">
                  Active
                </span>
              </div>

              {loadingQuestions ? (
                <div className="py-20 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
                  <p className="text-xs text-text-secondary">Retrieving questions list...</p>
                </div>
              ) : questions.length > 0 ? (
                <div className="space-y-4">
                  {questions.map((q, qIdx) => {
                    const isExpanded = expandedQId === q._id;
                    const statusClass = 
                      q.verificationStatus === 'verified' ? 'border-emerald-500/30 bg-emerald-500/5' :
                      q.verificationStatus === 'flagged' ? 'border-red-500/30 bg-red-500/5' : 'border-border-primary bg-bg-secondary/40';

                    return (
                      <div 
                        key={q._id} 
                        className={`rounded-2xl border transition-all duration-200 shadow-sm ${statusClass}`}
                      >
                        {/* Collapsed Header trigger */}
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
                              <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${
                                q.verificationStatus === 'verified' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500' :
                                q.verificationStatus === 'flagged' ? 'bg-red-500/15 border-red-500/30 text-red-500' :
                                'bg-yellow-500/15 border-yellow-500/30 text-yellow-500'
                              }`}>
                                {q.verificationStatus}
                              </span>
                            </div>
                            <div className="text-xs text-text-primary leading-relaxed font-semibold">
                              Q{qIdx + 1}. <span className="font-normal text-text-secondary">{q.topic}</span>
                            </div>
                            {q.verificationStatus === 'flagged' && q.verificationComment && (
                              <div className="text-[10px] text-red-500 flex items-start space-x-1 font-semibold leading-relaxed bg-red-500/5 p-2 rounded-lg border border-red-500/10">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span>Flagged Comment: {q.verificationComment}</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-1">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-text-secondary" /> : <ChevronRight className="w-4 h-4 text-text-secondary" />}
                          </div>
                        </div>

                        {/* Expanded details cards */}
                        {isExpanded && (
                          <div className="p-5 border-t border-border-primary/50 bg-bg-secondary/20 space-y-5">
                            {/* Question text rendering */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] uppercase font-bold tracking-wider text-text-muted">LaTeX / Math Preview</label>
                              <div className="p-4 rounded-xl border border-border-primary bg-bg-secondary/80 text-sm leading-relaxed overflow-x-auto">
                                <MathMarkdown content={editText || 'Empty question body'} />
                              </div>
                            </div>

                            {/* Editing Inputs form */}
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
                              <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Edit Question Text (Supports Markdown/LaTeX)</label>
                              <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                rows={4}
                                className="w-full p-3 rounded-xl border border-border-primary bg-bg-secondary font-mono text-xs focus:border-accent"
                              />
                            </div>

                            {/* Actions panel */}
                            <div className="flex flex-wrap items-center justify-between border-t border-border-primary/50 pt-4 gap-2">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => submitVerification(q._id, 'verified')}
                                  disabled={submittingVerification}
                                  className="px-4.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors flex items-center space-x-1.5"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Verify</span>
                                </button>
                                <button
                                  onClick={() => setFlagQId(q._id)}
                                  disabled={submittingVerification}
                                  className="px-4.5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors flex items-center space-x-1.5"
                                >
                                  <Flag className="w-3.5 h-3.5" />
                                  <span>Flag for Review</span>
                                </button>
                              </div>
                              <button
                                onClick={() => submitVerification(q._id, 'pending')}
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
                <div className="p-8 text-center border border-dashed border-border-primary rounded-2xl text-text-secondary text-xs">
                  All questions in this paper are clear.
                </div>
              )}
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center border border-dashed border-border-primary/60 rounded-2xl bg-bg-secondary/10">
              <div className="text-center space-y-2">
                <BookOpen className="w-8 h-8 text-text-muted mx-auto animate-pulse" />
                <h3 className="font-display font-bold text-text-primary text-sm">No Paper Selected</h3>
                <p className="text-xs text-text-secondary max-w-xs mx-auto">Select a course blueprint from the left panel index to load verification cards.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Flag comment dialog modal */}
      <AnimatePresence>
        {flagQId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="max-w-md w-full bg-bg-secondary border border-border-primary rounded-2xl shadow-xl p-6 space-y-4"
            >
              <div className="flex items-center space-x-2.5 text-red-500">
                <Flag className="w-5 h-5" />
                <h3 className="font-display font-extrabold text-base">Flag Question for Review</h3>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Provide a mandatory comment indicating what needs corrections (e.g. OCR typos, incorrect formula, wrong topic mapping).
              </p>

              <textarea
                value={flagComment}
                onChange={(e) => setFlagComment(e.target.value)}
                placeholder="Verifier feedback notes..."
                rows={3}
                className="w-full p-3 rounded-xl border border-border-primary bg-bg-primary text-xs focus:border-accent focus:ring-1 focus:ring-accent"
                required
              />

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  onClick={() => { setFlagQId(null); setFlagComment(''); }}
                  className="px-4 py-2 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-xs font-semibold text-text-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => submitVerification(flagQId, 'flagged', flagComment)}
                  disabled={submittingVerification || flagComment.trim().length === 0}
                  className="px-4.5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {submittingVerification ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Flag'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-border-primary/50 bg-bg-secondary/20 py-4 text-center text-[10px] text-text-secondary">
        <p>PaperHub Verification Panel • Confidentially auditing questions dataset.</p>
      </footer>
    </div>
  );
}
