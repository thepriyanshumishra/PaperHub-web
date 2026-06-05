'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const MathMarkdown = dynamic(() => import('@/components/math-markdown').then((mod) => mod.MathMarkdown), {
  ssr: false,
  loading: () => <div className="animate-pulse h-8 bg-bg-secondary rounded border border-border-primary/50 w-full" />,
});

import { ThemeToggle } from '@/components/theme-toggle';
import {
  ArrowLeft,
  Award,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  FileText,
  AlertCircle,
  Printer,
  Share2,
  Check,
  Activity,
  Timer,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function TestSummary() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-secondary">
        <div className="flex flex-col items-center space-y-4">
          <LoaderSpinner />
          <p className="text-sm">Loading summary report...</p>
        </div>
      </div>
    }>
      <TestSummaryContent />
    </Suspense>
  );
}

function LoaderSpinner() {
  return (
    <div className="relative flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
    </div>
  );
}

interface TestQuestion {
  _id: string;
  unit: number;
  topic: string;
  questionText: string;
  marks: number;
}

interface SessionData {
  _id: string;
  evaluationMethod: 'self' | 'photo';
  status: string;
  startedAt: string;
  endedAt?: string;
  testAnalytics: {
    tabSwitches: number;
    focusLosses: number;
    fullscreenExits: number;
  };
  questions: TestQuestion[];
  testResponses?: {
    questionId: string;
    selfScore?: 'correct' | 'partial' | 'incorrect';
    score?: number;
    notes?: string;
  }[];
  evaluationResult?: {
    totalMarks: number;
    obtainedMarks: number;
    summaryFeedback: string;
    details: {
      questionId: string;
      marksAwarded: number;
      feedback: string;
    }[];
  };
}

function TestSummaryContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const subjectId = params.subjectId as string;
  const sessionId = searchParams.get('sessionId');

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setErrorMsg('No active test session ID provided.');
      setLoading(false);
      return;
    }

    fetch(`/api/sessions/${sessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Session details could not be retrieved');
        return res.json();
      })
      .then((data) => {
        if (data.session) {
          setSession(data.session);
        } else {
          setErrorMsg('Session not found on DB.');
        }
      })
      .catch((err) => {
        console.error('Error fetching session summary:', err);
        setErrorMsg('Failed to sync session with database.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <div className="text-center space-y-3">
          <LoaderSpinner />
          <p className="text-xs text-text-secondary">Retrieving exam results...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary text-text-primary p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4 animate-bounce" />
        <h2 className="font-display font-bold text-xl mb-2">Evaluation Loading Failed</h2>
        <p className="text-sm text-text-secondary max-w-sm mb-6">
          {errorMsg || 'Could not retrieve exam grading analytics.'}
        </p>
        <Link href={`/subjects/${subjectId}`} className="px-6 py-2.5 bg-accent text-white font-medium rounded-lg">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const { evaluationMethod, testAnalytics, questions, evaluationResult } = session;

  const totalBreaches = (testAnalytics?.tabSwitches || 0) + (testAnalytics?.focusLosses || 0) + (testAnalytics?.fullscreenExits || 0);
  const isSuspicious = totalBreaches > 3;
  const trustScore = Math.max(0, 100 - totalBreaches * 15);

  const totalQuestions = questions.length;

  const attemptedCount = evaluationMethod === 'self'
    ? (session.testResponses?.filter(r => r.selfScore !== undefined).length || 0)
    : totalQuestions;

  const timeSpentSeconds = session.endedAt && session.startedAt
    ? Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)
    : 0;

  const secondsPerQuestion = attemptedCount > 0 ? Math.round(timeSpentSeconds / attemptedCount) : 0;
  const pacingRating = secondsPerQuestion < 60
    ? 'Blitz (Fast)'
    : (secondsPerQuestion < 180 ? 'Optimal pace' : 'Deliberate (Slow)');

  const formattedTime = () => {
    const mins = Math.floor(timeSpentSeconds / 60);
    const secs = timeSpentSeconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const totalMarks = evaluationResult?.totalMarks || questions.reduce((sum, q) => sum + (q.marks || 10), 0);
  const obtainedMarks = evaluationResult?.obtainedMarks !== undefined ? evaluationResult.obtainedMarks : 0;
  const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;

  const responseMap = session.testResponses?.reduce((acc, resp) => {
    acc[resp.questionId] = resp;
    return acc;
  }, {} as Record<string, NonNullable<SessionData['testResponses']>[number]>) || {};

  const aiDetailsMap = evaluationResult?.details?.reduce((acc, detail) => {
    acc[detail.questionId] = detail;
    return acc;
  }, {} as Record<string, NonNullable<NonNullable<SessionData['evaluationResult']>['details']>[number]>) || {};

  const handleShare = async () => {
    const text = `PaperHub Exam Report:\nScore: ${obtainedMarks}/${totalMarks} (${percentage}%)\nPacing: ${pacingRating} (${formattedTime()})\nTrust Score: ${trustScore}%\nSession: ${session._id}\nGraded via: ${evaluationMethod === 'photo' ? 'AI Vision Grader' : 'Self Grading'}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'PaperHub Exam Report', text, url: window.location.href });
        return;
      } catch { /* fallthrough */ }
    }
    try {
      await navigator.clipboard.writeText(text);
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    } catch { /* ignore */ }
  };

  const handlePrint = () => {
    window.print();
  };

  const printDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <>
      {/* ── Print stylesheet ── */}
      <style>{`
        @media print {
          /* Reset everything */
          * { box-sizing: border-box; }

          /* High-Contrast Print Reset (fixes dark-mode print invisibility) */
          body, p, span, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, code, pre, 
          .print-only, .math-content, .print-q-text, .print-q-feedback {
            color: #111111 !important;
            background: transparent !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }

          /* Force KaTeX formulas to render in dark gray/black */
          .katex, .katex * {
            color: #111111 !important;
            background: transparent !important;
          }

          body {
            background: white !important;
            font-family: 'Inter', -apple-system, sans-serif;
            font-size: 11pt;
            line-height: 1.55;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Hide everything interactive */
          .no-print { display: none !important; }

          /* Show only the print section */
          .print-only { display: block !important; }

          /* Page margins */
          @page {
            size: A4 portrait;
            margin: 14mm 16mm 14mm 16mm;
          }

          /* ── Print header (repeated on every page via position) ── */
          .print-page-header {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2.5pt solid #7c66ff;
            padding-bottom: 6pt;
            margin-bottom: 14pt;
          }

          .print-page-header .brand {
            font-size: 16pt;
            font-weight: 900;
            color: #7c66ff;
            letter-spacing: -0.5pt;
          }

          .print-page-header .meta {
            font-size: 8pt;
            color: #666;
            text-align: right;
          }

          /* ── Cover section ── */
          .print-cover {
            display: block !important;
            margin-bottom: 20pt;
          }

          .print-score-hero {
            display: flex !important;
            align-items: center;
            gap: 20pt;
            background: #f5f3ff;
            border: 1.5pt solid #ddd6fe;
            border-radius: 8pt;
            padding: 16pt 20pt;
            margin-bottom: 14pt;
          }

          .print-donut-wrap {
            flex-shrink: 0;
            width: 90pt;
            height: 90pt;
            position: relative;
          }

          .print-donut-wrap svg {
            width: 90pt;
            height: 90pt;
          }

          .print-donut-label {
            position: absolute;
            inset: 0;
            display: flex !important;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }

          .print-donut-label .score-big {
            font-size: 18pt;
            font-weight: 900;
            color: #111;
            line-height: 1;
          }

          .print-donut-label .score-denom {
            font-size: 7pt;
            color: #666;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3pt;
          }

          .print-score-info h2 {
            font-size: 20pt;
            font-weight: 900;
            color: #111;
            margin: 0 0 3pt;
          }

          .print-score-info .pct {
            font-size: 11pt;
            color: #7c66ff;
            font-weight: 700;
          }

          .print-score-info .method-badge {
            display: inline-block;
            margin-top: 6pt;
            font-size: 7.5pt;
            font-weight: 700;
            color: #5b45cc;
            background: #ede9fe;
            border: 1pt solid #c4b5fd;
            border-radius: 4pt;
            padding: 2pt 6pt;
            text-transform: uppercase;
            letter-spacing: 0.3pt;
          }

          /* Stats row */
          .print-stats-row {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr);
            gap: 10pt;
            margin-bottom: 14pt;
          }

          .print-stat-card {
            border: 1pt solid #e5e7eb;
            border-radius: 6pt;
            padding: 10pt 12pt;
            text-align: center;
          }

          .print-stat-card .stat-label {
            font-size: 7pt;
            font-weight: 700;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 0.4pt;
            margin-bottom: 3pt;
          }

          .print-stat-card .stat-value {
            font-size: 16pt;
            font-weight: 900;
            color: #111;
            line-height: 1.1;
          }

          .print-stat-card .stat-sub {
            font-size: 7.5pt;
            color: #7c66ff;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3pt;
          }

          /* Summary feedback */
          .print-feedback-box {
            border-left: 3pt solid #7c66ff;
            background: #faf9ff;
            padding: 10pt 14pt;
            border-radius: 0 6pt 6pt 0;
            margin-bottom: 14pt;
          }

          .print-feedback-box .fb-label {
            font-size: 7.5pt;
            font-weight: 800;
            color: #7c66ff;
            text-transform: uppercase;
            letter-spacing: 0.4pt;
            margin-bottom: 4pt;
          }

          .print-feedback-box p {
            font-size: 10pt;
            color: #333;
            margin: 0;
            line-height: 1.6;
          }

          /* Integrity box */
          .print-integrity {
            border: 1pt solid;
            border-radius: 6pt;
            padding: 10pt 14pt;
            margin-bottom: 18pt;
          }

          .print-integrity.ok {
            border-color: #bbf7d0;
            background: #f0fdf4;
          }

          .print-integrity.warn {
            border-color: #fecaca;
            background: #fef2f2;
          }

          .print-integrity .int-title {
            font-size: 9pt;
            font-weight: 800;
            margin-bottom: 3pt;
          }

          .print-integrity.ok .int-title { color: #15803d; }
          .print-integrity.warn .int-title { color: #b91c1c; }

          .print-integrity p {
            font-size: 9pt;
            color: #444;
            margin: 0;
          }

          /* ── Per-question cards ── */
          .print-section-title {
            font-size: 9pt;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.6pt;
            color: #7c66ff;
            margin-bottom: 10pt;
            padding-bottom: 4pt;
            border-bottom: 1pt solid #ede9fe;
          }

          .print-q-card {
            border: 1pt solid #e5e7eb;
            border-radius: 6pt;
            padding: 14pt 16pt;
            margin-bottom: 14pt;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .print-q-header {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10pt;
            padding-bottom: 7pt;
            border-bottom: 0.75pt solid #e5e7eb;
          }

          .print-q-num {
            display: inline-flex !important;
            align-items: center;
            justify-content: center;
            width: 20pt;
            height: 20pt;
            background: #7c66ff !important;
            color: white !important;
            border-radius: 50%;
            font-size: 9pt;
            font-weight: 900;
            flex-shrink: 0;
            margin-right: 8pt;
          }

          .print-q-meta {
            font-size: 8pt;
            color: #666 !important;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3pt;
          }

          .print-q-badges {
            display: flex !important;
            align-items: center;
            gap: 5pt;
          }

          .print-badge {
            font-size: 7.5pt;
            font-weight: 800;
            padding: 2pt 7pt;
            border-radius: 3pt;
            text-transform: uppercase;
            letter-spacing: 0.3pt;
            border: 1pt solid;
          }

          .badge-correct   { background: #f0fdf4 !important; color: #16a34a !important; border-color: #bbf7d0 !important; }
          .badge-partial   { background: #fffbeb !important; color: #d97706 !important; border-color: #fde68a !important; }
          .badge-incorrect { background: #fef2f2 !important; color: #dc2626 !important; border-color: #fecaca !important; }
          .badge-marks     { background: #f5f3ff !important; color: #7c66ff !important; border-color: #ddd6fe !important; }

          /* Question text area */
          .print-q-text {
            margin-bottom: 10pt;
            padding: 10pt 12pt;
            background: #fafafa !important;
            border: 0.75pt solid #e5e7eb !important;
            border-radius: 5pt;
            font-size: 10.5pt;
            color: #111111 !important;
            line-height: 1.65;
          }

          /* Ensure KaTeX renders correctly in print */
          .print-q-text .katex-display {
            margin: 6pt 0;
            overflow: visible !important;
          }

          .print-q-text .katex {
            font-size: 1em;
          }

          /* Feedback area */
          .print-q-feedback {
            padding: 9pt 12pt;
            border-left: 2.5pt solid;
            border-radius: 0 5pt 5pt 0;
            font-size: 9.5pt;
            line-height: 1.55;
          }

          .print-q-feedback.fb-correct   { border-color: #16a34a !important; background: #f0fdf4 !important; color: #15803d !important; }
          .print-q-feedback.fb-partial   { border-color: #d97706 !important; background: #fffbeb !important; color: #b45309 !important; }
          .print-q-feedback.fb-incorrect { border-color: #dc2626 !important; background: #fef2f2 !important; color: #b91c1c !important; }
          .print-q-feedback.fb-ai        { border-color: #7c66ff !important; background: #faf9ff !important; color: #3730a3 !important; }

          .print-q-feedback .fb-label {
            font-size: 7pt;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.4pt;
            color: #888;
            margin-bottom: 3pt;
          }

          /* Score bar */
          .print-score-bar-wrap {
            margin-top: 9pt;
            height: 4pt;
            background: #f3f4f6;
            border-radius: 2pt;
            overflow: hidden;
          }

          .print-score-bar-fill {
            height: 100%;
            border-radius: 2pt;
          }

          /* Footer */
          .print-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 24pt;
            background: #7c66ff;
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            padding: 0 16mm;
            font-size: 7pt;
            color: white;
            font-weight: 600;
          }
        }

        /* Hide print-only elements in screen mode */
        @media screen {
          .print-only { display: none !important; }
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════
           PRINT-ONLY LAYOUT (hidden on screen, visible on print)
          ═══════════════════════════════════════════════════════ */}
      <div className="print-only" aria-hidden="true">
        {/* Fixed footer on every printed page */}
        <div className="print-footer">
          <span>PaperHub Academic Evaluation Suite • Confidential Exam Report</span>
          <span>{printDate}</span>
        </div>

        {/* Cover: header */}
        <div className="print-page-header">
          <div className="brand">PaperHub</div>
          <div className="meta">
            <div style={{ fontWeight: 800 }}>Academic Examination Report</div>
            <div>Session: {session._id?.slice(-8).toUpperCase()}</div>
            <div>{printDate}</div>
          </div>
        </div>

        {/* Score hero */}
        <div className="print-score-hero">
          {/* SVG donut */}
          <div className="print-donut-wrap">
            <svg viewBox="0 0 90 90" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="45" cy="45" r="36" fill="none" stroke="#ede9fe" strokeWidth="7" />
              <circle
                cx="45" cy="45" r="36" fill="none"
                stroke="#7c66ff" strokeWidth="7"
                strokeDasharray={`${2 * Math.PI * 36}`}
                strokeDashoffset={`${2 * Math.PI * 36 - (percentage / 100) * 2 * Math.PI * 36}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="print-donut-label">
              <span className="score-big">{percentage}%</span>
            </div>
          </div>
          <div className="print-score-info">
            <h2>{obtainedMarks} / {totalMarks} Marks</h2>
            <div className="pct">{percentage}% Overall Score</div>
            <div className="method-badge">
              {evaluationMethod === 'photo' ? '🤖 AI Vision Grader' : '✍ Self Evaluation'}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="print-stats-row">
          <div className="print-stat-card">
            <div className="stat-label">Questions</div>
            <div className="stat-value">{attemptedCount}/{totalQuestions}</div>
            <div className="stat-sub">{totalQuestions > 0 ? Math.round((attemptedCount / totalQuestions) * 100) : 0}% Complete</div>
          </div>
          <div className="print-stat-card">
            <div className="stat-label">Time Spent</div>
            <div className="stat-value" style={{ fontSize: '14pt' }}>{formattedTime()}</div>
            <div className="stat-sub">{pacingRating}</div>
          </div>
          <div className="print-stat-card">
            <div className="stat-label">Trust Score</div>
            <div className="stat-value" style={{ color: trustScore >= 75 ? '#16a34a' : '#dc2626' }}>{trustScore}%</div>
            <div className="stat-sub" style={{ color: trustScore >= 75 ? '#16a34a' : '#dc2626' }}>
              {trustScore >= 90 ? 'Verified High' : trustScore >= 75 ? 'Moderate' : 'Compromised'}
            </div>
          </div>
        </div>

        {/* Examiner feedback */}
        {evaluationResult?.summaryFeedback && (
          <div className="print-feedback-box">
            <div className="fb-label">AI Examiner Summary Feedback</div>
            <p>{evaluationResult.summaryFeedback}</p>
          </div>
        )}

        {/* Integrity */}
        <div className={`print-integrity ${isSuspicious ? 'warn' : 'ok'}`}>
          <div className="int-title">{isSuspicious ? '⚠ Integrity Concerns Detected' : '✓ Integrity Verified'}</div>
          <p>
            {isSuspicious
              ? `${totalBreaches} focus breach(es) recorded — tab switches, focus losses, fullscreen exits.`
              : 'No focus breaches detected. Exam completed within the sandbox.'}
          </p>
        </div>

        {/* Per-question breakdown */}
        <div className="print-section-title">Granular Solution Breakdown</div>

        {questions.map((q, idx) => {
          const isSelf = evaluationMethod === 'self';
          const selfResp = responseMap[q._id];
          const aiDetail = aiDetailsMap[q._id];

          const score = isSelf ? (selfResp?.score || 0) : (aiDetail?.marksAwarded || 0);
          const selfGrade = selfResp?.selfScore || 'not graded';
          const feedback = isSelf
            ? `Self-graded as: ${selfGrade}.${selfResp?.notes ? ` Notes: ${selfResp.notes}` : ''}`
            : (aiDetail?.feedback || 'Evaluation pending.');

          const pct = q.marks ? Math.round((score / q.marks) * 100) : 0;
          const fbClass = isSelf
            ? (selfGrade === 'correct' ? 'fb-correct' : selfGrade === 'partial' ? 'fb-partial' : 'fb-incorrect')
            : 'fb-ai';
          const badgeClass = isSelf
            ? (selfGrade === 'correct' ? 'badge-correct' : selfGrade === 'partial' ? 'badge-partial' : 'badge-incorrect')
            : 'badge-marks';
          const barColor = pct >= 70 ? '#16a34a' : pct >= 40 ? '#d97706' : '#dc2626';

          return (
            <div className="print-q-card" key={q._id}>
              <div className="print-q-header">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="print-q-num">{idx + 1}</span>
                  <span className="print-q-meta">Unit {q.unit} &nbsp;•&nbsp; {q.topic}</span>
                </div>
                <div className="print-q-badges">
                  {isSelf && selfResp?.selfScore && (
                    <span className={`print-badge ${badgeClass}`}>{selfGrade}</span>
                  )}
                  <span className="print-badge badge-marks">{score} / {q.marks || 10} Marks</span>
                </div>
              </div>

              {/* Question text rendered with MathMarkdown — KaTeX renders in browser before print */}
              <div className="print-q-text">
                <MathMarkdown content={q.questionText} />
              </div>

              {/* Feedback */}
              <div className={`print-q-feedback ${fbClass}`}>
                <div className="fb-label">{isSelf ? 'Self-Grading Notes' : 'AI Examiner Feedback'}</div>
                {feedback}
              </div>

              {/* Score bar */}
              <div className="print-score-bar-wrap">
                <div
                  className="print-score-bar-fill"
                  style={{ width: `${pct}%`, background: barColor }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════
           SCREEN LAYOUT (visible normally, hidden on print)
          ═══════════════════════════════════════════════════ */}
      <div className="min-h-screen flex flex-col justify-between transition-colors duration-300 relative overflow-hidden bg-bg-primary text-text-primary no-print">

        {/* Background glows */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-accent/5 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-accent/3 blur-[130px] pointer-events-none" />

        {/* Navbar */}
        <header className="border-b border-border-primary/50 bg-bg-primary/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href={`/subjects/${subjectId}`}
                className="p-2 rounded-lg border border-border-primary bg-bg-secondary/50 hover:bg-bg-tertiary text-text-secondary transition-all hover:text-text-primary"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <span className="font-display font-bold text-sm tracking-tight text-accent">Summary Report</span>
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Main */}
        <main className="flex-grow max-w-4xl w-full mx-auto px-6 py-12 relative z-10 space-y-10">
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Screen header */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-accent/5 border border-accent/25 flex items-center justify-center text-accent mx-auto mb-5 shadow-lg shadow-accent/5">
                <Award className="w-8 h-8 animate-bounce text-accent" />
              </div>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-text-primary mb-2">
                Simulation Completed
              </h1>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                Your written exam metrics have been computed, analyzed, and finalized.
              </p>
            </div>

            {/* Score card */}
            <div className="p-8 rounded-2xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm shadow-[0_0_40px_rgba(0,0,0,0.2)] text-center relative overflow-hidden max-w-lg mx-auto">
              <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${evaluationMethod === 'photo' ? 'from-indigo-500 via-purple-500 to-pink-500' : 'from-green-500 to-emerald-500'}`} />

              <span className="text-[9px] uppercase tracking-wider font-extrabold text-text-secondary bg-bg-primary border border-border-primary/50 px-3 py-1 rounded-full shadow-inner inline-block mb-6">
                {evaluationMethod === 'photo' ? '🤖 AI Vision Grade' : '📝 Self-Assigned Marks'}
              </span>

              <div className="relative w-36 h-36 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="72" cy="72" r="62" className="stroke-bg-tertiary" strokeWidth="8" fill="transparent" />
                  <motion.circle
                    cx="72" cy="72" r="62" className="stroke-accent" strokeWidth="8" fill="transparent"
                    strokeDasharray={2 * Math.PI * 62}
                    initial={{ strokeDashoffset: 2 * Math.PI * 62 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 62 - (percentage / 100) * (2 * Math.PI * 62) }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-black text-text-primary tracking-tighter">{obtainedMarks}</span>
                  <span className="text-text-muted text-[10px] uppercase font-bold tracking-wider">/ {totalMarks} Marks</span>
                </div>
              </div>

              <div className="py-2">
                <p className="text-xs font-bold text-accent">{percentage}% Overall Score Rating</p>
              </div>

              {evaluationResult?.summaryFeedback && (
                <div className="p-4 mt-4 rounded-xl bg-bg-primary/40 border border-border-primary text-xs leading-relaxed text-text-secondary text-left space-y-1.5 shadow-inner">
                  <span className="text-[9px] font-extrabold uppercase text-accent tracking-wider flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
                    <span>Examiner Feedback Summary:</span>
                  </span>
                  <p>{evaluationResult.summaryFeedback}</p>
                </div>
              )}
            </div>

            {/* Print / Share toolbar */}
            <div className="flex justify-center gap-3 max-w-lg mx-auto">
              <motion.button
                onClick={handlePrint}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-3 px-4 rounded-xl border border-accent/40 bg-gradient-to-r from-accent/10 to-accent/5 hover:from-accent/20 hover:to-accent/10 text-text-primary text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-accent/10 hover:shadow-md"
                title="Print / Save as PDF"
              >
                <Printer className="w-4 h-4 text-accent" />
                <span>Print / Save PDF</span>
              </motion.button>
              <motion.button
                onClick={handleShare}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-3 px-4 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-hover transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                {shared ? (
                  <><Check className="w-4 h-4 stroke-[2.5px]" /><span>Copied!</span></>
                ) : (
                  <><Share2 className="w-4 h-4" /><span>Share Report</span></>
                )}
              </motion.button>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-6 rounded-xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm text-center space-y-1 hover:border-accent/15">
                <span className="text-[9px] uppercase font-bold tracking-wider text-text-muted flex items-center justify-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-accent" /><span>Questions Paced</span>
                </span>
                <h3 className="font-display text-2xl font-black text-text-primary pt-1">
                  {attemptedCount} <span className="text-text-muted text-xs font-normal">/ {totalQuestions}</span>
                </h3>
                <p className="text-[9px] text-text-secondary">{totalQuestions > 0 ? Math.round((attemptedCount / totalQuestions) * 100) : 0}% Completion</p>
              </div>

              <div className="p-6 rounded-xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm text-center space-y-1 hover:border-accent/15">
                <span className="text-[9px] uppercase font-bold tracking-wider text-text-muted flex items-center justify-center gap-1">
                  <Timer className="w-3.5 h-3.5 text-accent" /><span>Pacing Speed</span>
                </span>
                <h3 className="font-display text-2xl font-black text-text-primary pt-1">{formattedTime()}</h3>
                <p className="text-[9px] font-bold text-accent uppercase tracking-wide">{pacingRating}</p>
              </div>

              <div className="p-6 rounded-xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm text-center space-y-1 hover:border-accent/15">
                <span className="text-[9px] uppercase font-bold tracking-wider text-text-muted flex items-center justify-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-accent" /><span>Trust Score</span>
                </span>
                <h3 className={`font-display text-2xl font-black pt-1 ${trustScore >= 75 ? 'text-green-500' : 'text-red-500'}`}>
                  {trustScore}%
                </h3>
                <p className={`text-[9px] font-bold uppercase tracking-wide ${trustScore >= 90 ? 'text-green-500' : trustScore >= 75 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {trustScore >= 90 ? 'Verified High' : trustScore >= 75 ? 'Verified Moderate' : 'Trust Compromised'}
                </p>
              </div>
            </div>

            {/* Integrity alert */}
            <div className={`p-5 rounded-xl border ${isSuspicious ? 'border-red-500/25 bg-red-500/5' : 'border-green-500/20 bg-green-500/5'} flex items-start space-x-3 text-xs leading-relaxed text-text-secondary`}>
              {isSuspicious
                ? <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                : <ShieldCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />}
              <div>
                <h4 className="font-bold text-text-primary">Integrity Guard Audit</h4>
                <p className="mt-0.5">
                  {isSuspicious
                    ? `Focus breaches exceeded safety limits (${totalBreaches} occurrences logged).`
                    : 'Perfect integrity — you stayed locked inside the exam sandbox throughout.'}
                </p>
              </div>
            </div>

            {/* Question breakdown */}
            <div className="space-y-6 pt-6 border-t border-border-primary/40">
              <h3 className="font-display font-extrabold text-sm uppercase tracking-wider text-text-secondary flex items-center space-x-2">
                <FileText className="w-4 h-4 text-accent" />
                <span>Granular Solution Breakdown</span>
              </h3>

              <div className="space-y-6">
                {questions.map((q, idx) => {
                  const isSelf = evaluationMethod === 'self';
                  const selfResp = responseMap[q._id];
                  const aiDetail = aiDetailsMap[q._id];

                  const score = isSelf ? (selfResp?.score || 0) : (aiDetail?.marksAwarded || 0);
                  const feedback = isSelf
                    ? `Self-graded as ${selfResp?.selfScore || 'not graded'}.`
                    : (aiDetail?.feedback || 'Evaluating paper sheets...');

                  return (
                    <div key={q._id} className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-primary/40 pb-3">
                        <div className="flex items-center space-x-2">
                          <span className="w-6 h-6 rounded-lg bg-accent/5 border border-accent/25 flex items-center justify-center text-accent text-[10px] font-extrabold">
                            {idx + 1}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-text-muted">Unit {q.unit} • {q.topic}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {isSelf && selfResp?.selfScore && (
                            <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                              selfResp.selfScore === 'correct' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                              selfResp.selfScore === 'partial' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                              'bg-red-500/10 text-red-500 border-red-500/20'
                            }`}>
                              {selfResp.selfScore}
                            </span>
                          )}
                          <span className="text-[9px] uppercase font-extrabold px-2.5 py-0.5 rounded bg-bg-primary text-text-primary border border-border-primary/80">
                            {score} / {q.marks || 10} Marks
                          </span>
                        </div>
                      </div>

                      <div className="prose dark:prose-invert max-w-none text-xs text-text-primary leading-relaxed bg-bg-primary/20 p-4 rounded-xl border border-border-primary/50">
                        <MathMarkdown content={q.questionText} />
                      </div>

                      <div className="p-4 rounded-xl border border-border-primary bg-bg-primary/40 text-[11px] leading-relaxed text-text-secondary space-y-1.5 shadow-inner">
                        <span className="text-[8px] uppercase tracking-wider font-extrabold text-accent block">Grader Evaluation:</span>
                        <p>{feedback}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-6">
              <Link
                href={`/subjects/${subjectId}`}
                className="w-full sm:w-auto flex-grow px-6 py-3.5 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-hover transition-all text-center shadow-md hover:-translate-y-0.5"
              >
                Back to Dashboard
              </Link>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto flex-grow px-6 py-3.5 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-bold hover:text-accent transition-all text-center"
              >
                Prepare Another Subject
              </Link>
            </div>
          </motion.div>
        </main>

        <footer className="border-t border-border-primary/50 bg-bg-secondary/20 py-6 text-center text-xs text-text-muted">
          <p>PaperHub • Detailed Exam Simulation Analytics</p>
        </footer>
      </div>
    </>
  );
}
