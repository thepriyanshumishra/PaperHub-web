'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
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
  Save, 
  AlertTriangle,
  LogOut,
  User as UserIcon,
  Upload,
  RefreshCw,
  Trash2,
  Eye,
  Layers,
  CheckCircle,
  HelpCircle,
  FileUp,
  Sparkles,
  Search,
  CheckCircle2,
  ShieldAlert,
  FileText,
  Percent,
  Award,
  Scale
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
  verificationStatus: 'pending' | 'verified' | 'flagged' | 'archived';
  verificationComment?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  flaggedBy?: string;
  flaggedAt?: string;
  ocrConfidence?: number;
  sourceDocumentId?: string;
  sourcePageNumber?: number;
  sourcePageImage?: string;
  croppedQuestionImage?: string;
  aiSuggestions?: {
    subjectId?: string;
    unit?: number;
    topic?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    confidence?: number;
  };
  duplicateScore?: number;
  similarQuestionIds?: string[];
  extractionQualityScore?: number;
}

interface IBatch {
  _id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalFiles: number;
  processedFiles: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface IDocument {
  _id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
}

export default function VerifierDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-secondary">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
          <p className="text-xs">Loading verifier workspace...</p>
        </div>
      </div>
    }>
      <VerifierDashboardContent />
    </Suspense>
  );
}

function VerifierDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, fbUser, loading, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'queue' | 'pipeline' | 'review'>('queue');

  // Review Queue States
  const [escalations, setEscalations] = useState<any[]>([]);
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loadingReviewQueue, setLoadingReviewQueue] = useState(false);
  const [reviewSubTab, setReviewSubTab] = useState<'escalations' | 'appeals'>('escalations');
  const [selectedReviewItem, setSelectedReviewItem] = useState<any | null>(null);
  const [adjustedScore, setAdjustedScore] = useState<string>('');
  const [reviewerComment, setReviewerComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMetrics, setReviewMetrics] = useState<any | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Verification Queue States
  const [papers, setPapers] = useState<IPaper[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<IPaper | null>(null);
  const [questions, setQuestions] = useState<IQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'verified' | 'flagged'>('pending');
  const [expandedQId, setExpandedQId] = useState<string | null>(null);

  // Edit Forms state
  const [editText, setEditText] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [editUnit, setEditUnit] = useState(1);
  const [editMarks, setEditMarks] = useState(10);
  const [editDifficulty, setEditDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Flag & Merge Modal States
  const [flagQId, setFlagQId] = useState<string | null>(null);
  const [flagComment, setFlagComment] = useState('');
  const [mergeSourceQ, setMergeSourceQ] = useState<IQuestion | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Ingestion Pipeline States
  const [batches, setBatches] = useState<IBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<IBatch | null>(null);
  const [batchDocs, setBatchDocs] = useState<IDocument[]>([]);
  const [loadingBatchDocs, setLoadingBatchDocs] = useState(false);

  // Upload state
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear());
  const [uploadExamType, setUploadExamType] = useState('Major');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Review Queue items
  const loadEscalations = async () => {
    if (!fbUser) return;
    setLoadingReviewQueue(true);
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch('/api/verifier/escalations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEscalations(data.escalations || []);
      }
    } catch (err) {
      console.error('Failed to load escalations:', err);
    } finally {
      setLoadingReviewQueue(false);
    }
  };

  const loadAppeals = async () => {
    if (!fbUser) return;
    setLoadingReviewQueue(true);
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch('/api/appeals', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAppeals(data.appeals || []);
      }
    } catch (err) {
      console.error('Failed to load appeals:', err);
    } finally {
      setLoadingReviewQueue(false);
    }
  };

  const loadReviewMetrics = async () => {
    if (!fbUser) return;
    setLoadingMetrics(true);
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch('/api/staff/evaluation-metrics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReviewMetrics(data.metrics || null);
      }
    } catch (err) {
      console.error('Failed to load review metrics:', err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const handleResolveEscalation = async () => {
    if (!fbUser || !selectedReviewItem) return;
    setSubmittingReview(true);
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch('/api/verifier/escalations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId: selectedReviewItem.sessionId,
          questionId: selectedReviewItem.question._id,
          adjustedScore: Number(adjustedScore),
          reviewerComment
        })
      });
      if (res.ok) {
        await loadEscalations();
        await loadReviewMetrics();
        setSelectedReviewItem(null);
        setAdjustedScore('');
        setReviewerComment('');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to resolve escalation');
      }
    } catch (err) {
      console.error('Error resolving escalation:', err);
      alert('An unexpected error occurred');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleResolveAppeal = async (status: 'resolved' | 'rejected') => {
    if (!fbUser || !selectedReviewItem) return;
    setSubmittingReview(true);
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch(`/api/appeals/${selectedReviewItem._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          adjustedScore: status === 'resolved' ? Number(adjustedScore) : undefined,
          resolutionComment: reviewerComment
        })
      });
      if (res.ok) {
        await loadAppeals();
        await loadReviewMetrics();
        setSelectedReviewItem(null);
        setAdjustedScore('');
        setReviewerComment('');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update appeal');
      }
    } catch (err) {
      console.error('Error resolving appeal:', err);
      alert('An unexpected error occurred');
    } finally {
      setSubmittingReview(false);
    }
  };

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

  // Load subjects list for dropdown selection
  const loadSubjects = async () => {
    if (!fbUser) return;
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch('/api/verifier/subjects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllSubjects(data.subjects || []);
        if (data.subjects?.length > 0) {
          setSelectedSubjectId(data.subjects[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load subjects:', err);
    }
  };

  // Load batches list for ingestion panel
  const loadBatches = async () => {
    if (!fbUser) return;
    setLoadingBatches(true);
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch('/api/verifier/batches', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches || []);
      }
    } catch (err) {
      console.error('Failed to load batches:', err);
    } finally {
      setLoadingBatches(false);
    }
  };

  useEffect(() => {
    if (fbUser && user && (user.role === 'verifier' || user.role === 'admin' || user.role === 'moderator')) {
      loadPapers();
      loadSubjects();
      loadBatches();
    }
  }, [fbUser, user]);

  useEffect(() => {
    if (activeTab === 'review' && fbUser) {
      loadEscalations();
      loadAppeals();
      loadReviewMetrics();
    }
  }, [activeTab, fbUser]);

  // Periodic poll of batch statuses to show progress updates
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (batches.some(b => b.status === 'processing' || b.status === 'pending')) {
      interval = setInterval(() => {
        loadBatches();
        if (selectedBatch) {
          loadBatchDetails(selectedBatch._id);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [batches, selectedBatch]);

  // Load batch documents details
  const loadBatchDetails = async (batchId: string) => {
    if (!fbUser) return;
    setLoadingBatchDocs(true);
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch(`/api/verifier/batches?batchId=${batchId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBatchDocs(data.documents || []);
        setSelectedBatch(data.batch);
      }
    } catch (err) {
      console.error('Failed to load batch docs:', err);
    } finally {
      setLoadingBatchDocs(false);
    }
  };

  // Load questions for selected paper
  const loadQuestionsForPaper = async (paper: IPaper, statusFilter: 'all' | 'pending' | 'verified' | 'flagged' = filterStatus) => {
    if (!fbUser) return;
    setLoadingQuestions(true);
    setExpandedQId(null);
    try {
      const token = await fbUser.getIdToken();
      const statusQuery = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      const res = await fetch(
        `/api/verifier/questions?subjectId=${paper.subjectId}&year=${paper.year}&examType=${encodeURIComponent(paper.examType)}${statusQuery}`,
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

  // Submit verifier review decisions (verify, flag, reject, save edits)
  const submitVerification = async (qId: string, status: 'verified' | 'flagged' | 'pending' | 'archived', comment = '') => {
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
      if (selectedPaper) {
        loadQuestionsForPaper(selectedPaper, filterStatus);
      }

    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating question status.');
    } finally {
      setSubmittingVerification(false);
    }
  };

  // Apply AI Suggestion values instantly to form fields
  const applyAISuggestions = (q: IQuestion) => {
    if (!q.aiSuggestions) return;
    if (q.aiSuggestions.topic) setEditTopic(q.aiSuggestions.topic);
    if (q.aiSuggestions.unit) setEditUnit(q.aiSuggestions.unit);
    if (q.aiSuggestions.difficulty) setEditDifficulty(q.aiSuggestions.difficulty);
  };

  // Handle merging duplicate questions
  const executeMergeDuplicate = async () => {
    if (!fbUser || !mergeSourceQ || !mergeTargetId.trim()) return;
    setSubmittingVerification(true);
    setErrorMsg(null);
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch(`/api/verifier/questions/${mergeSourceQ._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetQuestionId: mergeTargetId.trim()
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to merge duplicate questions.');
      }

      setMergeSourceQ(null);
      setMergeTargetId('');
      setExpandedQId(null);

      // Reload papers list & questions queue
      loadPapers();
      if (selectedPaper) {
        loadQuestionsForPaper(selectedPaper, filterStatus);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error merging questions.');
    } finally {
      setSubmittingVerification(false);
    }
  };

  // Handle file drop/upload in Ingestion
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbUser || !uploadFile) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const token = await fbUser.getIdToken();
      const formData = new FormData();
      formData.append('file', uploadFile);
      if (selectedSubjectId) formData.append('subjectId', selectedSubjectId);
      formData.append('year', String(uploadYear));
      formData.append('examType', uploadExamType);

      const res = await fetch('/api/verifier/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upload document.');
      }

      const data = await res.json();
      setUploadSuccess(true);
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Trigger asynchronous process automatically
      fetch('/api/verifier/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ batchId: data.batch._id })
      });

      // Reload batches list
      loadBatches();

    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const triggerRetryBatch = async (batchId: string) => {
    if (!fbUser) return;
    try {
      const token = await fbUser.getIdToken();
      await fetch('/api/verifier/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ batchId })
      });
      loadBatches();
    } catch (err) {
      console.error('Failed to retry batch:', err);
    }
  };

  const handleFilterChange = (status: 'all' | 'pending' | 'verified' | 'flagged') => {
    setFilterStatus(status);
    if (selectedPaper) {
      loadQuestionsForPaper(selectedPaper, status);
    }
  };

  const handleSkipQuestion = (currentQId: string) => {
    const currentIndex = questions.findIndex(q => q._id === currentQId);
    if (currentIndex !== -1 && currentIndex < questions.length - 1) {
      const nextQuestion = questions[currentIndex + 1];
      handleExpandQuestion(nextQuestion);
    } else {
      setExpandedQId(null);
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

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-2 border border-border-primary/60 bg-bg-secondary/40 rounded-xl p-1 text-xs">
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all ${activeTab === 'queue' ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Question Queue
            </button>
            <button
              onClick={() => setActiveTab('pipeline')}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all ${activeTab === 'pipeline' ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Document Pipeline
            </button>
            <button
              onClick={() => {
                setActiveTab('review');
                setSelectedReviewItem(null);
              }}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all ${activeTab === 'review' ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Review Queue
            </button>
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
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8 relative z-10">
        
        {activeTab === 'queue' ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
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

                  {/* Status filtering tabs */}
                  <div className="flex items-center gap-2 border-b border-border-primary/45 pb-3">
                    {[
                      { id: 'all', label: 'All Questions' },
                      { id: 'pending', label: 'Pending Queue' },
                      { id: 'verified', label: 'Verified' },
                      { id: 'flagged', label: 'Flagged' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => handleFilterChange(tab.id as any)}
                        className={`
                          px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border
                          ${filterStatus === tab.id 
                            ? 'bg-accent/10 border-accent/25 text-accent' 
                            : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/40'
                          }
                        `}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {errorMsg && (
                    <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-xs flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

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
                              className="p-5 flex items-start justify-between cursor-pointer select-none animate-premium-reveal"
                            >
                              <div className="flex-grow space-y-2 pr-4">
                                <div className="flex flex-wrap gap-2 items-center">
                                  <span className="text-[9px] px-2 py-0.5 rounded bg-accent/10 border border-accent/25 text-accent font-bold uppercase tracking-wider">
                                    Unit {q.unit}
                                  </span>
                                  <span className="text-[9px] px-2 py-0.5 rounded bg-border-primary text-text-secondary font-semibold uppercase tracking-wider">
                                    {q.marks} Marks
                                  </span>
                                  {q.ocrConfidence !== undefined && (
                                    <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                                      q.ocrConfidence >= 90 ? 'bg-green-500/10 text-green-400 border border-green-500/25' :
                                      q.ocrConfidence >= 70 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/25' :
                                      'bg-red-500/10 text-red-400 border border-red-500/25'
                                    }`}>
                                      {q.ocrConfidence}% Confidence
                                    </span>
                                  )}
                                  {q.duplicateScore !== undefined && q.duplicateScore >= 0.3 && (
                                    <span className="text-[9px] px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-bold uppercase flex items-center space-x-1 animate-pulse">
                                      <AlertTriangle className="w-3 h-3 shrink-0" />
                                      <span>Sim: {Math.round(q.duplicateScore * 100)}%</span>
                                    </span>
                                  )}
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

                            {/* Expanded details cards with Side-by-Side vision view */}
                            {isExpanded && (
                              <div className="p-5 border-t border-border-primary/50 bg-bg-secondary/20 space-y-6">
                                
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                  
                                  {/* Left Column: Vision Original Crop Preview */}
                                  <div className="lg:col-span-5 space-y-2">
                                    <label className="text-[10px] uppercase font-bold tracking-wider text-text-muted flex items-center space-x-1">
                                      <Eye className="w-3.5 h-3.5 text-accent" />
                                      <span>Original Question Crop</span>
                                    </label>
                                    
                                    {q.croppedQuestionImage ? (
                                      <div className="relative rounded-xl border border-border-primary overflow-hidden bg-black/5 flex flex-col justify-between group shadow-inner">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img 
                                          src={q.croppedQuestionImage} 
                                          alt="Original Crop" 
                                          className="w-full h-auto object-contain max-h-60"
                                        />
                                        {q.sourcePageImage && (
                                          <a 
                                            href={q.sourcePageImage}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="absolute bottom-2 right-2 text-[8px] bg-black/60 backdrop-blur text-white px-2.5 py-1 rounded font-bold hover:bg-black/80 flex items-center space-x-1 border border-white/10 uppercase tracking-widest"
                                          >
                                            <Layers className="w-3 h-3" />
                                            <span>Full Page {q.sourcePageNumber && `(${q.sourcePageNumber})`}</span>
                                          </a>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="p-8 border border-dashed border-border-primary rounded-xl text-center text-text-muted text-[10px]">
                                        No Vision Image available for this question.
                                      </div>
                                    )}

                                    {/* AI Suggestion quick action */}
                                    {q.aiSuggestions && (
                                      <div className="p-3.5 rounded-xl border border-accent/20 bg-accent/5 space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-accent flex items-center space-x-1">
                                            <Sparkles className="w-3 h-3 text-accent" />
                                            <span>AI Classification Hints ({q.aiSuggestions.confidence}% Conf)</span>
                                          </span>
                                          <button
                                            onClick={() => applyAISuggestions(q)}
                                            className="text-[8px] bg-accent text-white px-2 py-0.5 rounded font-bold hover:bg-accent-hover uppercase tracking-wider"
                                          >
                                            Apply
                                          </button>
                                        </div>
                                        <div className="text-[10px] text-text-secondary space-y-1 font-mono">
                                          <div>Suggested Topic: <span className="text-text-primary font-bold">{q.aiSuggestions.topic || 'N/A'}</span></div>
                                          <div className="flex justify-between">
                                            <span>Unit: <span className="text-text-primary font-bold">{q.aiSuggestions.unit || '1'}</span></span>
                                            <span>Difficulty: <span className="text-text-primary font-bold">{q.aiSuggestions.difficulty || 'medium'}</span></span>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Duplicate question warning alerts */}
                                    {q.duplicateScore !== undefined && q.duplicateScore >= 0.3 && (
                                      <div className="p-3.5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 space-y-2">
                                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-yellow-500 flex items-center space-x-1 animate-pulse">
                                          <AlertTriangle className="w-3.5 h-3.5" />
                                          <span>Near-Duplicate Detected ({Math.round(q.duplicateScore * 100)}%)</span>
                                        </span>
                                        <p className="text-[9px] text-text-secondary leading-relaxed">
                                          A matching question was flagged with high similarity. You can inspect and merge this record to prevent database duplicates.
                                        </p>
                                        {q.similarQuestionIds && q.similarQuestionIds.length > 0 && (
                                          <div className="flex flex-col gap-1.5 pt-1">
                                            {q.similarQuestionIds.map((simId, simIdx) => (
                                              <button
                                                key={simIdx}
                                                onClick={() => {
                                                  setMergeSourceQ(q);
                                                  setMergeTargetId(simId);
                                                }}
                                                className="text-left w-full p-2 rounded bg-bg-secondary hover:bg-bg-tertiary border border-border-primary/40 text-[9px] text-text-primary font-bold flex justify-between items-center"
                                              >
                                                <span>Merge with: {simId}</span>
                                                <ChevronRight className="w-3 h-3 text-accent" />
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Right Column: Question Content Editing Form */}
                                  <div className="lg:col-span-7 space-y-5">
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] uppercase font-bold tracking-wider text-text-muted">LaTeX / Math Preview</label>
                                      <div className="p-4 rounded-xl border border-border-primary bg-bg-secondary/80 text-sm leading-relaxed overflow-x-auto min-h-24">
                                        <MathMarkdown content={editText || 'Empty question body'} />
                                      </div>
                                    </div>

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
                                            onChange={(e) => setEditUnit(parseInt(e.target.value, 10) || 1)}
                                            className="w-full px-3 py-2 rounded-xl border border-border-primary bg-bg-secondary text-xs text-center focus:border-accent"
                                          />
                                        </div>
                                        <div className="space-y-1.5">
                                          <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Marks</label>
                                          <input
                                            type="number"
                                            value={editMarks}
                                            onChange={(e) => setEditMarks(parseInt(e.target.value, 10) || 10)}
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
                                  </div>
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
                                      <span>Flag</span>
                                    </button>
                                    <button
                                      onClick={() => submitVerification(q._id, 'archived')}
                                      disabled={submittingVerification}
                                      className="px-4.5 py-2 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 text-xs font-bold transition-colors"
                                    >
                                      Reject Candidate
                                    </button>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => handleSkipQuestion(q._id)}
                                      className="px-4.5 py-2 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary text-xs font-bold transition-colors"
                                    >
                                      Skip
                                    </button>
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
          </div>
        ) : activeTab === 'pipeline' ? (
          /* Document Pipeline Tab — Phase L.1A: Temporarily disabled for beta launch.
           * The original upload form, batch viewer, and OCR trigger code is preserved below
           * and will be re-enabled in Phase L.2 after Cloudflare R2 + QStash migration. */
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-6 max-w-lg mx-auto">
              {/* Icon cluster */}
              <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-accent/20 to-teal-500/20 blur-xl" />
                <div className="relative w-24 h-24 rounded-3xl bg-bg-secondary border border-border-primary flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-accent" />
                </div>
              </div>

              {/* Heading */}
              <div className="space-y-2">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-wider">
                  <Layers className="w-3 h-3" />
                  <span>Coming Soon</span>
                </div>
                <h2 className="font-display font-black text-2xl text-text-primary tracking-tight">
                  Document Intelligence Pipeline
                </h2>
                <p className="text-sm text-text-secondary leading-relaxed">
                  The automated PDF/ZIP ingestion, OCR extraction, and question mining pipeline is temporarily 
                  offline during the beta launch while we migrate to cloud-native infrastructure.
                </p>
              </div>

              {/* What's coming */}
              <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 text-left space-y-3">
                <p className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">What's in the pipeline</p>
                {[
                  { icon: <FileUp className="w-3.5 h-3.5 text-accent" />, text: 'Client-direct uploads to Cloudflare R2 (bypasses serverless limits)' },
                  { icon: <RefreshCw className="w-3.5 h-3.5 text-teal-400" />, text: 'Asynchronous OCR processing via QStash background queue' },
                  { icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" />, text: 'AI-powered question extraction with Groq Vision' },
                  { icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />, text: 'Duplicate detection and auto-merge suggestions' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start space-x-2.5">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-bg-primary border border-border-primary flex-shrink-0">
                      {item.icon}
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <p className="text-[11px] text-text-muted">
                In the meantime, questions can be added manually by the admin via the database seed tools. 
                The <span className="text-accent font-semibold">Question Queue</span> tab remains fully operational.
              </p>
            </div>
          </div>
        ) : (
          /* Review Queue Tab (AI Escalations & Student Appeals) */
          <div className="space-y-6 animate-premium-reveal">
            {/* 1. Quality Analytics Dashboard (Staff-Only) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl border border-border-primary/60 bg-bg-secondary/40 backdrop-blur-md flex items-center space-x-4">
                <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/20 text-accent">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">AI Accuracy Rate</div>
                  <div className="text-xl font-display font-black text-text-primary mt-0.5">
                    {loadingMetrics ? (
                      <Loader2 className="w-4 h-4 animate-spin text-accent" />
                    ) : (
                      `${reviewMetrics?.accuracyRate ?? 100}%`
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-border-primary/60 bg-bg-secondary/40 backdrop-blur-md flex items-center space-x-4">
                <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Avg AI Confidence</div>
                  <div className="text-xl font-display font-black text-text-primary mt-0.5">
                    {loadingMetrics ? (
                      <Loader2 className="w-4 h-4 animate-spin text-accent" />
                    ) : (
                      `${reviewMetrics?.averageConfidence ?? 100}%`
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-border-primary/60 bg-bg-secondary/40 backdrop-blur-md flex items-center space-x-4">
                <div className="p-3.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Escalated Queue</div>
                  <div className="text-xl font-display font-black text-text-primary mt-0.5">
                    {loadingReviewQueue ? (
                      <Loader2 className="w-4 h-4 animate-spin text-accent" />
                    ) : (
                      escalations.length
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-border-primary/60 bg-bg-secondary/40 backdrop-blur-md flex items-center space-x-4">
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Pending Appeals</div>
                  <div className="text-xl font-display font-black text-text-primary mt-0.5">
                    {loadingReviewQueue ? (
                      <Loader2 className="w-4 h-4 animate-spin text-accent" />
                    ) : (
                      appeals.length
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Split Screen Queue & Details */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Sub-Queues List */}
              <div className="lg:col-span-4 space-y-4">
                {/* Sub-tab selection */}
                <div className="flex border border-border-primary/60 bg-bg-secondary/40 rounded-xl p-1 text-xs font-bold">
                  <button
                    onClick={() => {
                      setReviewSubTab('escalations');
                      setSelectedReviewItem(null);
                    }}
                    className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                      reviewSubTab === 'escalations' ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>AI Escalations ({escalations.length})</span>
                  </button>
                  <button
                    onClick={() => {
                      setReviewSubTab('appeals');
                      setSelectedReviewItem(null);
                    }}
                    className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                      reviewSubTab === 'appeals' ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>Appeals ({appeals.length})</span>
                  </button>
                </div>

                {/* Queue list container */}
                <div className="rounded-2xl border border-border-primary/60 bg-bg-secondary/20 p-4 space-y-3 max-h-[600px] overflow-y-auto">
                  {loadingReviewQueue ? (
                    <div className="py-12 text-center">
                      <Loader2 className="w-6 h-6 text-accent animate-spin mx-auto" />
                      <p className="text-[10px] text-text-secondary mt-2">Loading queue items...</p>
                    </div>
                  ) : reviewSubTab === 'escalations' ? (
                    escalations.length === 0 ? (
                      <div className="py-12 text-center text-text-secondary text-xs">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                        No pending AI escalations.
                      </div>
                    ) : (
                      escalations.map((item, idx) => (
                        <button
                          key={`${item.sessionId}-${item.question._id}-${idx}`}
                          onClick={() => {
                            setSelectedReviewItem(item);
                            setAdjustedScore(String(item.marksAwarded));
                            setReviewerComment('');
                          }}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col space-y-1.5 ${
                            selectedReviewItem?.sessionId === item.sessionId && selectedReviewItem?.question?._id === item.question?._id
                              ? 'bg-accent/5 border-accent shadow-sm'
                              : 'bg-bg-primary/50 border-border-primary/40 hover:bg-bg-secondary/60 hover:border-border-primary'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono text-accent">Session: {item.sessionType}</span>
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-500 font-extrabold uppercase">
                              Conf: {item.confidence}%
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-text-primary line-clamp-2 leading-relaxed">
                            {item.question?.questionText || 'Question text not found'}
                          </p>
                          <div className="flex items-center justify-between text-[9px] text-text-secondary pt-1 border-t border-border-primary/20">
                            <span>Score: {item.marksAwarded} / {item.question?.marks}</span>
                            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                          </div>
                        </button>
                      ))
                    )
                  ) : (
                    appeals.length === 0 ? (
                      <div className="py-12 text-center text-text-secondary text-xs">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                        No pending student appeals.
                      </div>
                    ) : (
                      appeals.map((item, idx) => (
                        <button
                          key={`${item._id}-${idx}`}
                          onClick={() => {
                            setSelectedReviewItem(item);
                            setAdjustedScore(String(item.previousScore));
                            setReviewerComment('');
                          }}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col space-y-1.5 ${
                            selectedReviewItem?._id === item._id
                              ? 'bg-accent/5 border-accent shadow-sm'
                              : 'bg-bg-primary/50 border-border-primary/40 hover:bg-bg-secondary/60 hover:border-border-primary'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono text-accent">User: {item.userId.substring(0, 8)}...</span>
                            <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 font-extrabold uppercase">
                              Appeal
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-text-primary line-clamp-2 leading-relaxed">
                            {item.questionId?.questionText || 'Question text not found'}
                          </p>
                          <div className="flex items-center justify-between text-[9px] text-text-secondary pt-1 border-t border-border-primary/20">
                            <span>Prev Score: {item.previousScore} / {item.questionId?.marks}</span>
                            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                          </div>
                        </button>
                      ))
                    )
                  )}
                </div>
              </div>

              {/* Right Column: In-depth Audit Detail Panel & Overriding Actions */}
              <div className="lg:col-span-8">
                {selectedReviewItem ? (
                  <div className="rounded-2xl border border-border-primary/60 bg-bg-secondary/40 backdrop-blur-md p-6 space-y-6">
                    {/* Header info */}
                    <div className="flex items-start justify-between border-b border-border-primary/60 pb-4">
                      <div>
                        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                          {reviewSubTab === 'escalations' ? 'Reviewing AI Escalation' : 'Reviewing Student Appeal'}
                        </h3>
                        <p className="text-[10px] text-text-secondary mt-0.5">
                          {reviewSubTab === 'escalations'
                            ? `Session ID: ${selectedReviewItem.sessionId} • Type: ${selectedReviewItem.sessionType}`
                            : `Appeal ID: ${selectedReviewItem._id} • Student: ${selectedReviewItem.userId}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-text-secondary uppercase">Evaluation Mode</span>
                        <div className="px-2 py-0.5 rounded bg-bg-primary border border-border-primary text-accent text-[9px] font-mono font-bold mt-0.5">
                          {reviewSubTab === 'escalations'
                            ? selectedReviewItem.question?.evaluationMode
                            : selectedReviewItem.questionId?.evaluationMode}
                        </div>
                      </div>
                    </div>

                    {/* Question text block */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Question Context</h4>
                      <div className="p-4 rounded-xl border border-border-primary bg-bg-primary text-xs leading-relaxed">
                        <MathMarkdown
                          content={reviewSubTab === 'escalations'
                            ? (selectedReviewItem.question?.questionText || '')
                            : (selectedReviewItem.questionId?.questionText || '')}
                        />
                      </div>
                    </div>

                    {/* Rubric references (Model Answer, Key Points) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <h4 className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Expected / Model Answer</h4>
                        <div className="p-3.5 rounded-xl border border-border-primary bg-bg-primary text-xs h-32 overflow-y-auto leading-relaxed">
                          <MathMarkdown
                            content={reviewSubTab === 'escalations'
                              ? (selectedReviewItem.question?.modelAnswer || 'N/A')
                              : (selectedReviewItem.questionId?.modelAnswer || 'N/A')}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Rubric Key Points</h4>
                        <div className="p-3.5 rounded-xl border border-border-primary bg-bg-primary text-xs h-32 overflow-y-auto">
                          {reviewSubTab === 'escalations' ? (
                            selectedReviewItem.question?.keyPoints?.length > 0 ? (
                              <ul className="list-disc list-inside space-y-1 text-text-secondary">
                                {selectedReviewItem.question.keyPoints.map((kp: string, i: number) => (
                                  <li key={i}>{kp}</li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-text-muted italic">No key points defined</span>
                            )
                          ) : (
                            selectedReviewItem.questionId?.keyPoints?.length > 0 ? (
                              <ul className="list-disc list-inside space-y-1 text-text-secondary">
                                {selectedReviewItem.questionId.keyPoints.map((kp: string, i: number) => (
                                  <li key={i}>{kp}</li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-text-muted italic">No key points defined</span>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Student Attempt */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Student Submitted Solution</h4>
                      <div className="p-4 rounded-xl border border-border-primary bg-bg-primary text-xs leading-relaxed font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {reviewSubTab === 'escalations' ? selectedReviewItem.originalAnswer : selectedReviewItem.originalAnswer || '(Attempt content saved in session record)'}
                      </div>
                    </div>

                    {/* Appeal reason if reviewSubTab is appeals */}
                    {reviewSubTab === 'appeals' && (
                      <div className="p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 space-y-1.5">
                        <h4 className="text-[10px] uppercase font-extrabold tracking-wider text-yellow-500 flex items-center space-x-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                          <span>Student Appeal Reason</span>
                        </h4>
                        <p className="text-xs text-text-primary leading-relaxed font-semibold italic">
                          "{selectedReviewItem.reason}"
                        </p>
                      </div>
                    )}

                    {/* AI Feedback & Reasoning Details */}
                    <div className="p-4 rounded-xl border border-border-primary/50 bg-bg-secondary/50 space-y-3">
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-text-secondary flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
                        <span>AI Grading Analysis & Insights (Staff-Only)</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <span className="text-[10px] text-text-secondary block">Assessed Missing Key Points:</span>
                          {selectedReviewItem.missingPoints?.length > 0 ? (
                            <ul className="list-disc list-inside text-red-400 space-y-0.5">
                              {selectedReviewItem.missingPoints.map((mp: string, i: number) => (
                                <li key={i}>{mp}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-emerald-400 italic">None identified</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-text-secondary block">AI Feedback / Suggestion:</span>
                          <p className="text-text-secondary leading-relaxed">{selectedReviewItem.feedback || 'No automated feedback'}</p>
                        </div>
                      </div>
                      {selectedReviewItem.reasoning && (
                        <div className="pt-2 border-t border-border-primary/20 text-xs">
                          <span className="text-[10px] text-text-secondary block">AI Reasoning Chain:</span>
                          <p className="text-text-secondary leading-relaxed italic mt-0.5">"{selectedReviewItem.reasoning}"</p>
                        </div>
                      )}
                    </div>

                    {/* Reviewer Action form inputs */}
                    <div className="border-t border-border-primary/60 pt-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">
                            Adjusted Score (Max: {reviewSubTab === 'escalations' ? selectedReviewItem.question?.marks : selectedReviewItem.questionId?.marks})
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={reviewSubTab === 'escalations' ? selectedReviewItem.question?.marks : selectedReviewItem.questionId?.marks}
                            step="0.5"
                            value={adjustedScore}
                            onChange={(e) => setAdjustedScore(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-border-primary bg-bg-primary text-xs focus:border-accent"
                            required
                          />
                        </div>

                        <div className="md:col-span-2 space-y-1.5">
                          <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">
                            Reviewer Action Comments (Saves to logs)
                          </label>
                          <input
                            type="text"
                            placeholder="Enter grading notes, correction details..."
                            value={reviewerComment}
                            onChange={(e) => setReviewerComment(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-border-primary bg-bg-primary text-xs focus:border-accent"
                            required
                          />
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end space-x-3 pt-2">
                        {reviewSubTab === 'escalations' ? (
                          <button
                            onClick={handleResolveEscalation}
                            disabled={submittingReview || !reviewerComment.trim() || adjustedScore === ''}
                            className="px-6 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all flex items-center space-x-1.5 disabled:opacity-50"
                          >
                            {submittingReview ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                <span>Save Override & Grade</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleResolveAppeal('rejected')}
                              disabled={submittingReview || !reviewerComment.trim()}
                              className="px-5 py-2 rounded-xl border border-red-500 bg-red-500/5 hover:bg-red-500/10 text-red-500 text-xs font-semibold transition-all flex items-center space-x-1.5 disabled:opacity-50"
                            >
                              {submittingReview ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Trash2 className="w-4 h-4" />
                                  <span>Reject Appeal</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleResolveAppeal('resolved')}
                              disabled={submittingReview || !reviewerComment.trim() || adjustedScore === ''}
                              className="px-6 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all flex items-center space-x-1.5 disabled:opacity-50"
                            >
                              {submittingReview ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="w-4 h-4" />
                                  <span>Resolve & Award Score</span>
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-[500px] flex items-center justify-center border border-dashed border-border-primary/60 rounded-2xl bg-bg-secondary/10">
                    <div className="text-center space-y-3">
                      <Scale className="w-10 h-10 text-text-muted mx-auto animate-pulse" />
                      <h3 className="font-display font-bold text-text-primary text-sm">Select Audit Item</h3>
                      <p className="text-xs text-text-secondary max-w-xs mx-auto">
                        Choose an AI sessional escalation or student grading appeal from the left column to view grading details.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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

      {/* Merge duplicates Dialog Modal */}
      <AnimatePresence>
        {mergeSourceQ && (
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
              <div className="flex items-center space-x-2.5 text-yellow-500">
                <Layers className="w-5 h-5 animate-pulse" />
                <h3 className="font-display font-extrabold text-base">Merge Duplicate Questions</h3>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Merging this question candidate will add its source papers to the target question, increment the target question frequency count, and archive this candidate.
              </p>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Target Question ID (e.g. Q-1780...)</label>
                <input
                  type="text"
                  value={mergeTargetId}
                  onChange={(e) => setMergeTargetId(e.target.value)}
                  placeholder="Canonical Question ID or Object ID..."
                  className="w-full px-3 py-2 rounded-xl border border-border-primary bg-bg-primary text-xs focus:border-accent"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  onClick={() => { setMergeSourceQ(null); setMergeTargetId(''); }}
                  className="px-4 py-2 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-xs font-semibold text-text-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeMergeDuplicate}
                  disabled={submittingVerification || !mergeTargetId.trim()}
                  className="px-4.5 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-black text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {submittingVerification ? <Loader2 className="w-4 h-4 animate-spin mx-auto text-black" /> : 'Confirm Merge'}
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
