'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Archive,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MathMarkdown = dynamic(() => import('@/components/math-markdown').then((mod) => mod.MathMarkdown), {
  ssr: false,
  loading: () => <div className="animate-pulse h-12 bg-bg-secondary rounded border border-border-primary/50 w-full" />,
});

interface IQuestion {
  _id: string;
  questionId: string;
  unit: number;
  topic: string;
  questionText: string;
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  verificationStatus: 'pending' | 'verified' | 'flagged' | 'archived';
  verificationComment?: string;
  verifiedBy?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  flaggedBy?: string;
  flaggedByName?: string;
  flaggedAt?: string;
  ocrConfidence?: number;
  verificationCorrectionCount?: number;
  flaggedCount?: number;
  originalTextBeforeVerification?: string;
  verifierChanges?: any;
  subjectId?: {
    _id: string;
    name: string;
    code: string;
  };
}

export default function ModeratorDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-secondary">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
          <p className="text-xs">Loading moderator workspace...</p>
        </div>
      </div>
    }>
      <ModeratorDashboardContent />
    </Suspense>
  );
}

function ModeratorDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, fbUser, loading, logout } = useAuth();

  const [questions, setQuestions] = useState<IQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<IQuestion | null>(null);

  const initialQueue = (searchParams.get('status') as 'flagged' | 'verified' | 'archived' | 'edited' | 'pending') || 'flagged';
  const [filterStatus, setFilterStatus] = useState<typeof initialQueue>(initialQueue);

  // Edit forms state
  const [editText, setEditText] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [editUnit, setEditUnit] = useState(1);
  const [editMarks, setEditMarks] = useState(10);
  const [editDifficulty, setEditDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const [resolutionComment, setResolutionComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Authenticate role check
  useEffect(() => {
    if (!loading) {
      if (!fbUser) {
        router.push('/login');
      } else if (user && user.role !== 'moderator' && user.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, fbUser, loading, router]);

  // Load questions queue
  const loadQueue = async (statusFilter = filterStatus) => {
    if (!fbUser) return;
    setLoadingQuestions(true);
    setSelectedQuestion(null);
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch(`/api/moderator/questions?status=${statusFilter}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      }
    } catch (err) {
      console.error('Failed to load moderator queue:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    if (fbUser && user && (user.role === 'moderator' || user.role === 'admin')) {
      loadQueue();
    }
  }, [fbUser, user, filterStatus]);

  const selectQuestionForReview = (q: IQuestion) => {
    setSelectedQuestion(q);
    setEditText(q.questionText);
    setEditTopic(q.topic);
    setEditUnit(q.unit);
    setEditMarks(q.marks);
    setEditDifficulty(q.difficulty);
    setResolutionComment(q.verificationComment || '');
    setErrorMsg(null);
  };

  const handleFilterChange = (status: typeof filterStatus) => {
    setFilterStatus(status);
    router.replace(`/moderator?status=${status}`);
  };

  const submitModeration = async (
    action: 'approve_flag' | 'reject_flag' | 'restore' | 'archive',
    comment = resolutionComment
  ) => {
    if (!fbUser || !selectedQuestion) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const token = await fbUser.getIdToken();
      const res = await fetch(`/api/moderator/questions/${selectedQuestion._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
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
        throw new Error(data.error || 'Failed to apply moderation action.');
      }

      // Reload queue
      await loadQueue();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating question status.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkipQuestion = () => {
    if (!selectedQuestion) return;
    const currentIndex = questions.findIndex(q => q._id === selectedQuestion._id);
    if (currentIndex !== -1 && currentIndex < questions.length - 1) {
      selectQuestionForReview(questions[currentIndex + 1]);
    } else {
      setSelectedQuestion(null);
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
            <Link href="/dashboard" className="p-2 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="font-display font-black tracking-wider text-sm uppercase bg-gradient-to-r from-red-400 via-orange-400 to-accent bg-clip-text text-transparent">
              Moderator Panel
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

      {/* Main Panel Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Questions Queue List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-extrabold text-sm uppercase tracking-wider text-text-secondary flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-accent" />
              <span>Moderation Queue</span>
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-bg-secondary border border-border-primary font-bold">
              {questions.length} items
            </span>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-1 border-b border-border-primary pb-2">
            {[
              { id: 'flagged', label: 'Reported Questions by Verifier' },
              { id: 'pending', label: 'Pending' },
              { id: 'verified', label: 'Verified' },
              { id: 'archived', label: 'Archived' },
              { id: 'edited', label: 'Edited' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => handleFilterChange(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border transition-all ${
                  filterStatus === tab.id
                    ? 'bg-accent/10 border-accent/20 text-accent'
                    : 'border-transparent text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loadingQuestions ? (
            <div className="py-12 text-center space-y-2.5">
              <Loader2 className="w-6 h-6 text-accent animate-spin mx-auto" />
              <p className="text-xs text-text-secondary">Retrieving questions...</p>
            </div>
          ) : questions.length > 0 ? (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
              {questions.map((q) => {
                const isSelected = selectedQuestion && selectedQuestion._id === q._id;
                const statusBadge = 
                  q.verificationStatus === 'verified' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500' :
                  q.verificationStatus === 'flagged' ? 'bg-red-500/10 border-red-500/25 text-red-500' :
                  q.verificationStatus === 'archived' ? 'bg-purple-500/10 border-purple-500/25 text-purple-500' :
                  'bg-yellow-500/10 border-yellow-500/25 text-yellow-500';

                return (
                  <button
                    key={q._id}
                    onClick={() => selectQuestionForReview(q)}
                    className={`w-full p-4 rounded-xl border text-left flex flex-col justify-between group transition-all duration-200 ${
                      isSelected
                        ? 'border-accent bg-accent/5 ring-2 ring-accent/10 shadow-sm'
                        : 'border-border-primary bg-bg-secondary/40 hover:border-accent/40 hover:bg-bg-secondary'
                    }`}
                  >
                    <div className="w-full space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="text-[9px] px-2 py-0.5 rounded bg-border-primary text-text-secondary font-bold uppercase tracking-wide">
                          {q.subjectId?.code || 'SUB'}
                        </span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide border ${statusBadge}`}>
                          {q.verificationStatus}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-text-primary text-xs leading-snug group-hover:text-accent transition-colors line-clamp-2">
                        {q.topic}
                      </h3>
                      {q.verificationStatus === 'flagged' && q.verificationComment && (
                        <p className="text-[9px] text-red-400 bg-red-400/5 p-2 rounded border border-red-400/10 line-clamp-2">
                          Flag: {q.verificationComment}
                        </p>
                      )}
                      {q.verificationCorrectionCount !== undefined && q.verificationCorrectionCount > 0 && (
                        <span className="text-[8px] font-bold text-text-muted">Edits: {q.verificationCorrectionCount} times</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center border border-dashed border-border-primary rounded-xl text-text-secondary text-xs">
              No questions found in this queue.
            </div>
          )}
        </div>

        {/* Right Side: Question Review Panel & Resolution Controls */}
        <div className="lg:col-span-7 space-y-6">
          {selectedQuestion ? (
            <div className="space-y-5">
              {/* Question Header info */}
              <div className="p-4 rounded-xl border border-border-primary bg-bg-secondary/20 flex justify-between items-start gap-4">
                <div>
                  <h3 className="font-display font-extrabold text-sm text-text-primary">{selectedQuestion.subjectId?.name || 'Curated Question'}</h3>
                  <p className="text-[10px] text-text-secondary uppercase tracking-wider font-bold mt-0.5">
                    Unit {selectedQuestion.unit} • {selectedQuestion.marks} Marks • {selectedQuestion.difficulty}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {selectedQuestion.ocrConfidence !== undefined && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      OCR: {selectedQuestion.ocrConfidence}%
                    </span>
                  )}
                </div>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* TeX Preview */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-text-muted">LaTeX / Math Preview</label>
                <div className="p-4 rounded-xl border border-border-primary bg-bg-secondary/80 text-sm leading-relaxed overflow-x-auto text-left">
                  <MathMarkdown content={editText || 'Empty question text'} />
                </div>
              </div>

              {/* Inline Editing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Topic</label>
                  <input
                    type="text"
                    value={editTopic}
                    onChange={(e) => setEditTopic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border-primary bg-bg-secondary text-xs focus:border-accent"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-left">
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

              <div className="space-y-1.5 text-left">
                <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Edit Question Text</label>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-xl border border-border-primary bg-bg-secondary font-mono text-xs focus:border-accent"
                />
              </div>

              {/* Resolution Commentary Input */}
              <div className="space-y-1.5 text-left bg-bg-secondary/40 p-4 rounded-xl border border-border-primary/50">
                <label className="text-[10px] uppercase font-black tracking-wider text-text-primary flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-accent" />
                  <span>Resolution Commentary (Notes / Feedback)</span>
                </label>
                <textarea
                  value={resolutionComment}
                  onChange={(e) => setResolutionComment(e.target.value)}
                  placeholder="Provide details of why you approved, rejected, restored, or archived..."
                  rows={2}
                  className="w-full p-3 rounded-xl border border-border-primary bg-bg-secondary text-xs focus:border-accent"
                />
              </div>

              {/* Audit Details */}
              <div className="p-4 rounded-xl border border-border-primary/50 bg-bg-secondary/40 space-y-3 mt-4 text-left">
                <div className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Verifier Audit Information</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {selectedQuestion.flaggedBy && (
                    <div className="p-3 rounded-xl bg-bg-primary/50 border border-border-primary/30 space-y-1">
                      <span className="font-bold text-red-500 text-[10px] uppercase tracking-wider block">⚑ Reported By</span>
                      <div className="text-text-primary font-semibold">{selectedQuestion.flaggedByName || 'Verifier'}</div>
                      <div className="text-[10px] text-text-muted">ID: {selectedQuestion.flaggedBy}</div>
                      {selectedQuestion.flaggedAt && (
                        <div className="text-[10px] text-text-muted">At: {new Date(selectedQuestion.flaggedAt).toLocaleString()}</div>
                      )}
                    </div>
                  )}
                  {selectedQuestion.verifiedBy && (
                    <div className="p-3 rounded-xl bg-bg-primary/50 border border-border-primary/30 space-y-1">
                      <span className="font-bold text-emerald-500 text-[10px] uppercase tracking-wider block">✓ Verified By</span>
                      <div className="text-text-primary font-semibold">{selectedQuestion.verifiedByName || 'Verifier'}</div>
                      <div className="text-[10px] text-text-muted">ID: {selectedQuestion.verifiedBy}</div>
                      {selectedQuestion.verifiedAt && (
                        <div className="text-[10px] text-text-muted">At: {new Date(selectedQuestion.verifiedAt).toLocaleString()}</div>
                      )}
                    </div>
                  )}
                  {(!selectedQuestion.flaggedBy && !selectedQuestion.verifiedBy) && (
                    <div className="col-span-2 text-center text-text-muted py-2">
                      No verifier audit details recorded for this question.
                    </div>
                  )}
                </div>
              </div>

              {/* Verifier Changes Diff Block */}
              {selectedQuestion.verifierChanges && (
                <div className="p-4 rounded-xl border border-border-primary/50 bg-bg-secondary/40 space-y-3 mt-4 text-left font-sans">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-text-secondary flex items-center space-x-1">
                    <span>Verifier Changes Applied</span>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(selectedQuestion.verifierChanges).map(([field, diff]: [string, any]) => (
                      <div key={field} className="p-3 rounded-xl bg-bg-primary/50 border border-border-primary/30 space-y-2">
                        <span className="font-bold text-accent text-[10px] uppercase tracking-wider block">{field}</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="p-2 rounded bg-red-500/5 border border-red-500/10 space-y-1">
                            <span className="font-bold text-red-500 text-[9px] uppercase tracking-wider block">Original</span>
                            {field === 'questionText' ? (
                              <div className="text-xs text-text-secondary overflow-x-auto"><MathMarkdown content={diff.old} /></div>
                            ) : (
                              <p className="text-xs text-text-secondary whitespace-pre-wrap">{String(diff.old)}</p>
                            )}
                          </div>
                          <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/10 space-y-1">
                            <span className="font-bold text-emerald-500 text-[9px] uppercase tracking-wider block">Edited</span>
                            {field === 'questionText' ? (
                              <div className="text-xs text-text-primary overflow-x-auto"><MathMarkdown content={diff.new} /></div>
                            ) : (
                              <p className="text-xs text-text-primary whitespace-pre-wrap">{String(diff.new)}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Moderation Controls */}
              <div className="flex flex-wrap items-center justify-between border-t border-border-primary/50 pt-4 gap-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => submitModeration('reject_flag')}
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors flex items-center space-x-1.5"
                    title="Reject flag and verify question"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve Question (Verified)</span>
                  </button>
                  <button
                    onClick={() => submitModeration('approve_flag')}
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold transition-colors flex items-center space-x-1.5"
                    title="Approve flag and archive question"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archive Question</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => submitModeration('restore')}
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary text-xs font-bold transition-colors flex items-center space-x-1.5"
                    title="Restore question back to pending status"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset to Pending</span>
                  </button>
                  <button
                    onClick={handleSkipQuestion}
                    className="px-4 py-2 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary text-xs font-bold transition-colors"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center border border-dashed border-border-primary/60 rounded-2xl bg-bg-secondary/10">
              <div className="text-center space-y-2">
                <BookOpen className="w-8 h-8 text-text-muted mx-auto animate-pulse" />
                <h3 className="font-display font-bold text-text-primary text-sm">Select Question</h3>
                <p className="text-xs text-text-secondary max-w-xs mx-auto">Select a question card from the left queue index to load resolution controls.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-primary/50 bg-bg-secondary/20 py-4 text-center text-[10px] text-text-secondary">
        <p>PaperHub Moderation Panel • Resolving questions quality reports.</p>
      </footer>
    </div>
  );
}
