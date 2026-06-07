'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/sidebar';
import { useAuth } from '@/components/auth-provider';
import { Navbar } from '@/components/navbar';
import {
  ChevronDown, ChevronRight, ChevronLeft,
  BookOpen, Loader2, Bookmark, FileText, ArrowRight, Menu,
  FileCheck, NotebookPen, RotateCcw, Filter, SortDesc,
} from 'lucide-react';

interface SourcePaper {
  year: number;
  examType: string;
}

interface Question {
  _id: string;
  questionText: string;
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  sourcePapers?: SourcePaper[];
  lastAppearedYear?: number;
  topic: string;
  unit: number;
  repetitionFrequency: number;
}

interface TopicCount {
  topic: string;
  count: number;
}

// Ordinal helper
function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Difficulty badge config
function difficultyBadge(d: string) {
  if (d === 'easy')   return 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500';
  if (d === 'medium') return 'bg-amber-500/10  border-amber-500/25  text-amber-500';
  if (d === 'hard')   return 'bg-red-500/10    border-red-500/25    text-red-500';
  return 'bg-bg-tertiary border-border-primary text-text-muted';
}

// Marker label from marks value
function markerLabel(marks: number) {
  if (marks === 2) return '2 Markers';
  if (marks === 3) return '3 Markers';
  if (marks === 5) return '5 Markers';
  if (marks === 10) return '10 Markers';
  return `${marks} Marks`;
}

export default function ChapterPage() {
  const params = useParams();
  const router = useRouter();
  const { user, fbUser, loading: authLoading, logout } = useAuth();
  const subjectId = params.subjectId as string;
  const chapterId = params.chapterId as string; // unit number

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch notifications
  useEffect(() => {
    if (!fbUser) return;
    const fetchNotifications = async () => {
      try {
        const idToken = await fbUser.getIdToken();
        const res = await fetch('/api/notifications', {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.notifications?.filter((n: any) => !n.isRead).length || 0);
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fbUser]);

  const handleMarkAllRead = async () => {
    if (!fbUser || notifications.length === 0) return;
    try {
      const idToken = await fbUser.getIdToken();
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n._id);
      if (unreadIds.length === 0) return;
      
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ ids: unreadIds })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  // Subject / unit meta
  const [subjectName, setSubjectName] = useState('');
  const [unitTitle, setUnitTitle]   = useState(`Unit ${chapterId}`);
  const [unitTopics, setUnitTopics] = useState<string[]>([]);
  const [subjectCode, setSubjectCode] = useState('');

  // Questions state
  const [questions, setQuestions]     = useState<Question[]>([]);
  const [total, setTotal]             = useState(0);
  const [pages, setPages]             = useState(1);
  const [page, setPage]               = useState(1);
  const [topicCounts, setTopicCounts] = useState<TopicCount[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading]         = useState(true);

  // Filters
  const [filterMarks, setFilterMarks] = useState<number | ''>('');  // 2 | 3 | 5 | ''
  const [filterYear, setFilterYear]   = useState<number | ''>('');
  const [sortBy, setSortBy]           = useState<'newest' | 'oldest' | 'repeated'>('newest');
  const [bookmarked, setBookmarked]   = useState<Set<string>>(new Set());

  // User info
  const activeName     = user?.profile?.name || user?.displayName || '';
  const activeBranch   = user?.profile?.branch || (typeof window !== 'undefined' ? localStorage.getItem('selectedBranch') : '') || '';
  const activeSemester = user?.profile?.semester || (typeof window !== 'undefined' ? Number(localStorage.getItem('selectedSemester') || 1) : 1);
  const userInitials   = activeName ? activeName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '?';

  const handleLogout = async () => {
    try { if (logout) await logout(); router.push('/login'); }
    catch { router.push('/login'); }
  };

  // Fetch subject meta
  useEffect(() => {
    fetch(`/api/subjects/${subjectId}`)
      .then(r => r.json())
      .then(data => {
        if (data.subject) {
          setSubjectName(data.subject.name);
          setSubjectCode(data.subject.code);
          const unit = data.subject.syllabus?.find((u: any) => u.unitNumber === Number(chapterId));
          if (unit) {
            setUnitTitle(unit.unitTitle);
            setUnitTopics(unit.topics || []);
          }
        }
      })
      .catch(() => {});
  }, [subjectId, chapterId]);

  // Fetch questions
  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        unit: chapterId,
        page: String(page),
        limit: '8',
        sort: sortBy,
        ...(filterMarks !== '' ? { marks: String(filterMarks) } : {}),
        ...(filterYear  !== '' ? { year:  String(filterYear)  } : {}),
      });
      const res  = await fetch(`/api/subjects/${subjectId}/questions?${qs}`);
      const data = await res.json();
      setQuestions(data.questions   || []);
      setTotal(data.total           ?? 0);
      setPages(data.pages           ?? 1);
      setTopicCounts(data.topics    || []);
      setAvailableYears(data.years  || []);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [subjectId, chapterId, page, filterMarks, filterYear, sortBy]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [filterMarks, filterYear, sortBy]);

  const toggleBookmark = (id: string) => {
    setBookmarked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const [sessionCreating, setSessionCreating] = useState(false);

  const handleQuestionClick = async (qId: string) => {
    if (sessionCreating) return;
    setSessionCreating(true);
    try {
      const idToken = fbUser ? await fbUser.getIdToken() : '';
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({
          subjectId,
          type: 'practice',
          subType: 'unit',
          config: {
            units: [Number(chapterId)],
            topics: [],
            startQuestionId: qId
          }
        })
      });
      const data = await res.json();
      if (data.session) {
        router.push(`/subjects/${subjectId}/practice/solve?sessionId=${data.session._id}`);
      } else {
        console.error('Failed to create session:', data.error);
        alert(data.error || 'Failed to start practice session');
      }
    } catch (err) {
      console.error('Failed to start session:', err);
      alert('An error occurred while starting the practice session.');
    } finally {
      setSessionCreating(false);
    }
  };

  const handleContinuePractice = async () => {
    if (sessionCreating) return;
    setSessionCreating(true);
    try {
      const idToken = fbUser ? await fbUser.getIdToken() : '';
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({
          subjectId,
          type: 'practice',
          subType: 'unit',
          config: {
            units: [Number(chapterId)],
            topics: []
          }
        })
      });
      const data = await res.json();
      if (data.session) {
        router.push(`/subjects/${subjectId}/practice/solve?sessionId=${data.session._id}`);
      } else {
        console.error('Failed to create session:', data.error);
        alert(data.error || 'Failed to start practice session');
      }
    } catch (err) {
      console.error('Failed to start session:', err);
      alert('An error occurred while starting the practice session.');
    } finally {
      setSessionCreating(false);
    }
  };

  const [solvedCount, setSolvedCount] = useState(0);
  const [unitTotal, setUnitTotal] = useState(0);

  // Fetch unit solved progress dynamically
  useEffect(() => {
    if (!fbUser) return;
    const fetchProgress = async () => {
      try {
        const idToken = await fbUser.getIdToken();
        const res = await fetch(`/api/subjects/${subjectId}/heatmap`, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.heatmap) {
            const unitTopicsData = data.heatmap.filter((item: any) => item.unit === Number(chapterId));
            const correctSum = unitTopicsData.reduce((sum: number, item: any) => sum + (item.correctCount || 0), 0);
            const totalSum = unitTopicsData.reduce((sum: number, item: any) => sum + (item.totalQuestions || 0), 0);
            setSolvedCount(correctSum);
            setUnitTotal(totalSum);
          }
        }
      } catch (err) {
        console.error('Failed to fetch chapter progress:', err);
      }
    };
    fetchProgress();
  }, [fbUser, subjectId, chapterId]);

  const effectiveTotal = unitTotal > 0 ? unitTotal : (total > 0 ? total : 0);
  const solvedPercent = effectiveTotal > 0 ? Math.min(100, Math.round((solvedCount / effectiveTotal) * 100)) : 0;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary overflow-hidden relative">
      <div className="hidden dark:block fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-purple-900/8 blur-[160px] pointer-events-none" />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-grow min-w-0 h-screen overflow-hidden">

        {/* ── Header ── */}
        <Navbar onMenuToggle={() => setSidebarOpen(true)} />

        {/* ── Scrollable Body ── */}
        <div className="flex-grow overflow-y-auto">
          <main className="max-w-6xl w-full mx-auto px-6 py-8">
            <div className="flex gap-6 items-start">

              {/* ── Left / Main Column ── */}
              <div className="flex-grow min-w-0 space-y-5">

                {/* Unit Hero Card */}
                <div className="flex items-start gap-4 p-5 rounded-2xl border border-border-primary bg-bg-secondary">
                  <div className="w-14 h-14 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                    <BookOpen className="w-7 h-7 text-accent" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-0.5">Unit {chapterId}</p>
                    <h1 className="font-display font-black text-xl text-text-primary leading-tight">{unitTitle}</h1>
                    {unitTopics.length > 0 && (
                      <p className="text-[11px] text-text-secondary mt-1">{unitTopics.slice(0, 3).join(' · ')}</p>
                    )}
                  </div>
                  <button className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border border-border-primary bg-bg-primary hover:border-accent/30 hover:text-accent text-xs font-bold text-text-secondary transition-all">
                    <Bookmark className="w-3.5 h-3.5" />
                    Bookmark Unit
                  </button>
                </div>

                {/* Question count */}
                <p className="text-sm font-bold text-text-primary">{loading ? '—' : total} Questions</p>

                {/* ── Filter Bar ── */}
                <div className="space-y-3">
                  {/* Preferred filter chips */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Preferred Filter</span>
                    {[
                      { label: 'Two Markers',   value: 2 },
                      { label: 'Three Markers', value: 3 },
                      { label: 'Five Markers',  value: 5 },
                    ].map(chip => (
                      <button
                        key={chip.value}
                        onClick={() => setFilterMarks(filterMarks === chip.value ? '' : chip.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                          filterMarks === chip.value
                            ? 'bg-accent/10 border-accent/30 text-accent'
                            : 'border-border-primary text-text-secondary hover:border-text-muted'
                        }`}
                      >
                        {chip.label}
                        {filterMarks === chip.value && <ChevronRight className="w-3 h-3" />}
                      </button>
                    ))}
                    <button
                      onClick={() => setSortBy(sortBy === 'repeated' ? 'newest' : 'repeated')}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                        sortBy === 'repeated'
                          ? 'bg-accent/10 border-accent/30 text-accent'
                          : 'border-border-primary text-text-secondary hover:border-text-muted'
                      }`}
                    >
                      Most Repeated
                    </button>
                  </div>

                  {/* Year + Sort dropdowns */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Year */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-text-muted">Year</span>
                      <div className="relative">
                        <select
                          value={filterYear}
                          onChange={e => setFilterYear(e.target.value === '' ? '' : Number(e.target.value))}
                          className="appearance-none pl-3 pr-8 py-1.5 rounded-xl text-[11px] font-bold border border-border-primary bg-bg-secondary text-text-primary focus:outline-none focus:border-accent/40 cursor-pointer"
                        >
                          <option value="">All Years</option>
                          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" />
                      </div>
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-text-muted">Sort By</span>
                      <div className="relative">
                        <select
                          value={sortBy}
                          onChange={e => setSortBy(e.target.value as any)}
                          className="appearance-none pl-3 pr-8 py-1.5 rounded-xl text-[11px] font-bold border border-border-primary bg-bg-secondary text-text-primary focus:outline-none focus:border-accent/40 cursor-pointer"
                        >
                          <option value="newest">Newest First</option>
                          <option value="oldest">Oldest First</option>
                          <option value="repeated">Most Repeated</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" />
                      </div>
                    </div>

                    {/* Reset filters */}
                    {(filterMarks !== '' || filterYear !== '' || sortBy !== 'newest') && (
                      <button
                        onClick={() => { setFilterMarks(''); setFilterYear(''); setSortBy('newest'); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-text-muted hover:text-accent hover:bg-accent/5 transition-all border border-transparent hover:border-accent/20"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Question List ── */}
                {loading ? (
                  <div className="space-y-3">
                    {[1,2,3,4].map(n => (
                      <div key={n} className="h-14 rounded-xl bg-bg-tertiary border border-border-primary animate-pulse" />
                    ))}
                  </div>
                ) : questions.length === 0 ? (
                  <div className="py-16 text-center border border-dashed border-border-primary rounded-2xl bg-bg-secondary/50">
                    <FileText className="w-8 h-8 text-text-muted mx-auto mb-3" />
                    <p className="text-sm font-bold text-text-secondary">No questions found</p>
                    <p className="text-xs text-text-muted mt-1">Try adjusting your filters</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border-primary/40 rounded-2xl border border-border-primary bg-bg-secondary overflow-hidden">
                    {questions.map((q, idx) => (
                      <div
                        key={q._id}
                        className={`flex items-center gap-3 px-4 py-3.5 hover:bg-bg-tertiary transition-all group cursor-pointer ${sessionCreating ? 'pointer-events-none opacity-60' : ''}`}
                        onClick={() => handleQuestionClick(q._id)}
                      >
                        {/* Number */}
                        <span className="font-display font-black text-xs text-text-muted w-5 shrink-0">
                          {(page - 1) * 8 + idx + 1}
                        </span>

                        {/* Marker badge */}
                        <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold bg-accent/8 border border-accent/20 text-accent">
                          {markerLabel(q.marks)}
                        </span>

                        {/* Difficulty badge */}
                        <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold border capitalize ${difficultyBadge(q.difficulty)}`}>
                          {q.difficulty}
                        </span>

                        {/* Source */}
                        <span className="flex-grow text-[11px] font-semibold text-text-secondary truncate">
                          {q.sourcePapers && q.sourcePapers.length > 0
                            ? q.sourcePapers.map(sp => `${sp.year} ${sp.examType}`).join(', ')
                            : (q.lastAppearedYear ? `${q.lastAppearedYear} Paper` : '2025 Minor/Major')}
                        </span>

                        {/* Bookmark */}
                        <button
                          onClick={e => { e.stopPropagation(); toggleBookmark(q._id); }}
                          className="shrink-0 p-1 rounded-lg hover:bg-bg-tertiary transition-all"
                          aria-label="Bookmark question"
                        >
                          <Bookmark className={`w-4 h-4 ${bookmarked.has(q._id) ? 'fill-accent text-accent' : 'text-text-muted'}`} />
                        </button>

                        {/* Arrow */}
                        <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-primary shrink-0 transition-colors" />
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Pagination ── */}
                {pages > 1 && (
                  <div className="flex items-center justify-center gap-1.5 pt-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border border-border-primary text-text-secondary hover:border-accent/30 hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Previous
                    </button>

                    {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                      let pageNum = i + 1;
                      if (pages > 7) {
                        if (page <= 4) pageNum = i + 1;
                        else if (page >= pages - 3) pageNum = pages - 6 + i;
                        else pageNum = page - 3 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-8 h-8 rounded-xl text-[11px] font-bold border transition-all ${
                            pageNum === page
                              ? 'bg-accent text-white border-accent shadow-sm'
                              : 'border-border-primary text-text-secondary hover:border-accent/30 hover:text-accent'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    {pages > 7 && page < pages - 3 && (
                      <>
                        <span className="text-text-muted text-xs">…</span>
                        <button onClick={() => setPage(pages)} className="w-8 h-8 rounded-xl text-[11px] font-bold border border-border-primary text-text-secondary hover:border-accent/30 hover:text-accent transition-all">{pages}</button>
                      </>
                    )}

                    <button
                      onClick={() => setPage(p => Math.min(pages, p + 1))}
                      disabled={page === pages}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border border-border-primary text-text-secondary hover:border-accent/30 hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* ── Right Sidebar Panel ── */}
              <div className="hidden lg:flex flex-col gap-4 w-64 shrink-0">

                {/* Your Progress card */}
                <div className="rounded-2xl border border-border-primary bg-bg-secondary p-5 space-y-4">
                  <h3 className="font-display font-black text-xs text-text-primary uppercase tracking-wider">Your Progress</h3>

                  <div className="flex items-center gap-4">
                    {/* Circular progress */}
                    <div className="relative w-16 h-16 shrink-0">
                      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="5" className="text-border-primary" />
                        <circle cx="32" cy="32" r="26" fill="none" strokeWidth="5"
                          stroke="var(--accent)"
                          strokeDasharray={`${2 * Math.PI * 26}`}
                          strokeDashoffset={`${2 * Math.PI * 26 * (1 - solvedPercent / 100)}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center font-display font-black text-sm text-text-primary">{solvedPercent}%</span>
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-display font-black text-sm text-text-primary">{solvedCount} / {effectiveTotal}</p>
                      <p className="text-[10px] text-text-secondary font-bold leading-snug">Questions Solved</p>
                      <div className="w-full h-1.5 bg-bg-tertiary rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${solvedPercent}%` }} />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleContinuePractice}
                    disabled={sessionCreating}
                    className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sessionCreating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      'Continue Practice'
                    )}
                  </button>
                </div>

                {/* Chapter Topics */}
                <div className="rounded-2xl border border-border-primary bg-bg-secondary p-5 space-y-3">
                  <h3 className="font-display font-black text-xs text-text-primary uppercase tracking-wider">Chapter Topics</h3>
                  <div className="space-y-2">
                    {topicCounts.length === 0 && unitTopics.slice(0, 5).map((t, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                          <span className="text-[11px] font-semibold text-text-secondary truncate">{t}</span>
                        </div>
                      </div>
                    ))}
                    {topicCounts.slice(0, 6).map((tc, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                          <span className="text-[11px] font-semibold text-text-secondary truncate">{tc.topic}</span>
                        </div>
                        <span className="text-[10px] font-bold text-text-muted shrink-0">{tc.count} Qs</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* View Unit Notes */}
                <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border-primary bg-bg-secondary hover:border-accent/30 hover:text-accent text-xs font-bold text-text-secondary transition-all">
                  <FileCheck className="w-3.5 h-3.5" />
                  View Unit Notes
                </button>
              </div>

            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
