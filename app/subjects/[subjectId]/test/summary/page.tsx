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
  AlertCircle
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

  const totalBreaches = testAnalytics.tabSwitches + testAnalytics.focusLosses + testAnalytics.fullscreenExits;
  const isSuspicious = totalBreaches > 3;

  // Calculate dynamic stats
  const totalQuestions = questions.length;
  
  const attemptedCount = evaluationMethod === 'self'
    ? (session.testResponses?.filter(r => r.selfScore !== undefined).length || 0)
    : totalQuestions; // assuming all are scanned in offline mode

  const timeSpentSeconds = session.endedAt && session.startedAt
    ? Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)
    : 0;

  const formattedTime = () => {
    const mins = Math.floor(timeSpentSeconds / 60);
    const secs = timeSpentSeconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const totalMarks = evaluationResult?.totalMarks || questions.reduce((sum, q) => sum + (q.marks || 10), 0);
  const obtainedMarks = evaluationResult?.obtainedMarks !== undefined ? evaluationResult.obtainedMarks : 0;
  const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;

  // Format question responses lookup map
  const responseMap = session.testResponses?.reduce((acc, resp) => {
    acc[resp.questionId] = resp;
    return acc;
  }, {} as Record<string, NonNullable<SessionData['testResponses']>[number]>) || {};

  // Format AI details lookup map
  const aiDetailsMap = evaluationResult?.details?.reduce((acc, detail) => {
    acc[detail.questionId] = detail;
    return acc;
  }, {} as Record<string, NonNullable<NonNullable<SessionData['evaluationResult']>['details']>[number]>) || {};

  return (
    <div className="min-h-screen flex flex-col justify-between transition-colors duration-300 relative overflow-hidden bg-bg-primary text-text-primary">
      {/* Background glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-accent/5 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-accent/3 blur-[130px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="border-b border-border-primary/50 bg-bg-primary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href={`/subjects/${subjectId}`} 
              className="p-2 rounded-lg border border-border-primary bg-bg-secondary/50 hover:bg-bg-tertiary text-text-secondary transition-all hover:text-text-primary"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="font-display font-bold text-sm tracking-tight text-accent dark:gradient-heading">Summary Report</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main summary view */}
      <main className="flex-grow max-w-4xl w-full mx-auto px-6 py-12 relative z-10 space-y-10">
        <motion.div
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
          {/* Header segment */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent/5 border border-accent/25 flex items-center justify-center text-accent mx-auto mb-5 shadow-lg shadow-accent/5">
              <Award className="w-8 h-8 animate-bounce" />
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-text-primary mb-2">
              Simulation Completed
            </h1>
            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              Your written exam metrics have been computed, analyzed, and finalized.
            </p>
          </div>

          {/* Grade board card */}
          <div className="p-8 rounded-2xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm shadow-[0_0_40px_rgba(0,0,0,0.2)] text-center relative overflow-hidden max-w-lg mx-auto">
            {/* background inner glow */}
            <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${evaluationMethod === 'photo' ? 'from-indigo-500 via-purple-500 to-pink-500' : 'from-green-500 to-emerald-500'}`}></div>

            <span className="text-[9px] uppercase tracking-wider font-extrabold text-text-secondary bg-bg-primary border border-border-primary/50 px-3 py-1 rounded-full shadow-inner inline-block">
              {evaluationMethod === 'photo' ? '🤖 AI Examiner Grade' : '📝 Self-Assigned Marks'}
            </span>

            <div className="py-6 space-y-1">
              <h2 className="font-display text-6xl font-extrabold tracking-tighter text-text-primary">
                {obtainedMarks}
                <span className="text-text-muted font-normal text-3xl"> / {totalMarks}</span>
              </h2>
              <p className="text-xs font-bold text-accent">{percentage}% Score Rating</p>
            </div>

            {evaluationResult?.summaryFeedback && (
              <div className="p-4 rounded-xl bg-bg-primary/40 border border-border-primary text-xs leading-relaxed text-text-secondary text-left space-y-1">
                <span className="text-[9px] font-extrabold uppercase text-accent tracking-wider flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
                  <span>Examiner Feedback Summary:</span>
                </span>
                <p>{evaluationResult.summaryFeedback}</p>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-6 rounded-xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm text-center space-y-1 transition-all">
              <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">Questions Paced</span>
              <h3 className="font-display text-2xl font-bold text-text-primary">
                {attemptedCount} <span className="text-text-muted text-xs font-normal">/ {totalQuestions}</span>
              </h3>
            </div>
            
            <div className="p-6 rounded-xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm text-center space-y-1 transition-all">
              <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">Time Elapsed</span>
              <h3 className="font-display text-2xl font-bold text-text-primary dark:text-accent">{formattedTime()}</h3>
            </div>

            <div className="p-6 rounded-xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm text-center space-y-1 transition-all">
              <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">Security Violations</span>
              <h3 className={`font-display text-2xl font-bold ${totalBreaches > 3 ? 'text-red-500' : 'text-green-500'}`}>{totalBreaches}</h3>
            </div>
          </div>

          {/* Anti-cheat audit alert */}
          <div className={`p-5 rounded-xl border transition-all ${isSuspicious ? 'border-red-500/25 bg-red-500/5' : 'border-green-500/20 bg-green-500/5'} flex items-start space-x-3 text-xs leading-relaxed text-text-secondary`}>
            {isSuspicious ? (
              <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className="font-bold text-text-primary">Integrity Guard Audit</h4>
              <p className="mt-0.5">
                {isSuspicious 
                  ? "Focus breaches exceeded safety limits during this timed simulation. Standard examination settings flag multiple focus deviations."
                  : "Excellent code integrity! You successfully locked inside the exam sandbox for the entirety of the timed session."}
              </p>
            </div>
          </div>

          {/* Detailed Question Review Breakdown */}
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
                          <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded ${
                            selfResp.selfScore === 'correct' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                            selfResp.selfScore === 'partial' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                            'bg-red-500/10 text-red-500 border border-red-500/20'
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
                      <span className="text-[8px] uppercase tracking-wider font-extrabold text-accent block">Examiner Breakdown:</span>
                      <p>{feedback}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-6">
            <Link
              href={`/subjects/${subjectId}`}
              className="w-full sm:w-auto flex-grow px-6 py-3.5 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-hover transition-all text-center shadow-md hover:-translate-y-0.5"
            >
              Back to Dashboard
            </Link>
            
            <Link
              href="/onboarding"
              className="w-full sm:w-auto flex-grow px-6 py-3.5 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-bold hover:text-accent transition-all text-center"
            >
              Prepare Another Subject
            </Link>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-primary/50 bg-bg-secondary/20 py-6 text-center text-xs text-text-muted">
        <p>PaperHub • Detailed Exam Simulation Analytics</p>
      </footer>
    </div>
  );
}
