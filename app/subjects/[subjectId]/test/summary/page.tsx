'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { 
  ArrowLeft, 
  Award, 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw 
} from 'lucide-react';
import { motion } from 'framer-motion';

interface TestSummaryData {
  totalQuestions: number;
  attemptedCount: number;
  timeSpentSeconds: number;
  tabSwitches: number;
  focusLosses: number;
  fullscreenExits: number;
}

export default function TestSummary() {
  const params = useParams();
  const subjectId = params.subjectId as string;

  const [summary, setSummary] = useState<TestSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load summary from sessionStorage (written by test/solve page)
    const localData = sessionStorage.getItem('localTestSummary');
    if (localData) {
      try {
        setSummary(JSON.parse(localData));
      } catch (err) {
        console.error(err);
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <div className="text-center space-y-3">
          <span className="w-8 h-8 text-accent animate-spin block mx-auto"><RefreshCw className="w-full h-full" /></span>
          <p className="text-xs text-text-secondary">Loading your grade sheet...</p>
        </div>
      </div>
    );
  }

  // Handle default fallback in case user lands directly
  const data = summary || {
    totalQuestions: 5,
    attemptedCount: 4,
    timeSpentSeconds: 480,
    tabSwitches: 2,
    focusLosses: 1,
    fullscreenExits: 1
  };

  const formattedTime = () => {
    const mins = Math.floor(data.timeSpentSeconds / 60);
    const secs = data.timeSpentSeconds % 60;
    return `${mins}m ${secs}s`;
  };

  const totalBreaches = data.tabSwitches + data.focusLosses + data.fullscreenExits;
  const isSuspicious = totalBreaches > 3;

  return (
    <div className="min-h-screen flex flex-col justify-between transition-colors duration-300">
      {/* Top Navbar */}
      <header className="border-b border-border-primary/50 bg-bg-primary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href={`/subjects/${subjectId}`} 
              className="p-2 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="font-display font-bold text-sm tracking-tight text-accent">Summary Report</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main summary view */}
      <main className="flex-grow max-w-2xl w-full mx-auto px-6 py-12 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full space-y-8"
        >
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-accent/5 border border-accent/20 flex items-center justify-center text-accent mx-auto mb-4">
              <Award className="w-8 h-8" />
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary mb-2">Test Completed</h1>
            <p className="text-sm text-text-secondary">Your written exam simulation summary report details.</p>
          </div>

          {/* Key stats row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 rounded-xl border border-border-primary bg-bg-secondary text-center space-y-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Attempted</span>
              <h3 className="font-display text-2xl font-bold text-text-primary">
                {data.attemptedCount} <span className="text-text-secondary text-sm font-normal">/ {data.totalQuestions}</span>
              </h3>
            </div>
            
            <div className="p-6 rounded-xl border border-border-primary bg-bg-secondary text-center space-y-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Time Elapsed</span>
              <h3 className="font-display text-2xl font-bold text-text-primary">{formattedTime()}</h3>
            </div>
          </div>

          {/* Security Integrity Card */}
          <div className={`p-6 rounded-xl border ${isSuspicious ? 'border-red-500/20 bg-red-500/5' : 'border-green-500/20 bg-green-500/5'} space-y-4`}>
            <div className="flex items-center space-x-2">
              {isSuspicious ? (
                <ShieldAlert className="w-5 h-5 text-red-500" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-green-500" />
              )}
              <h3 className="font-display font-semibold text-sm text-text-primary">
                Integrity Guard Evaluation
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center border-t border-border-primary/30 pt-4">
              <div>
                <span className="block text-[8px] uppercase tracking-wider text-text-secondary mb-1">Tab Switches</span>
                <span className="text-xs font-bold text-text-primary">{data.tabSwitches}</span>
              </div>
              <div>
                <span className="block text-[8px] uppercase tracking-wider text-text-secondary mb-1">Focus Losses</span>
                <span className="text-xs font-bold text-text-primary">{data.focusLosses}</span>
              </div>
              <div>
                <span className="block text-[8px] uppercase tracking-wider text-text-secondary mb-1">Fullscreen Exits</span>
                <span className="text-xs font-bold text-text-primary">{data.fullscreenExits}</span>
              </div>
            </div>

            <p className="text-[10px] text-text-secondary leading-relaxed pt-2">
              {isSuspicious ? (
                <span className="text-red-500 font-medium">Warning: High focus anomalies flagged. Standard university exam parameters require continuous fullscreen focus.</span>
              ) : (
                <span className="text-green-500 font-medium">Passed: Excellent focus score! The environment registered negligible outer window activity.</span>
              )}
            </p>
          </div>

          {/* Grading Check (Future) */}
          <div className="p-4 rounded-lg border border-border-primary border-dashed text-[10px] leading-relaxed text-text-muted flex justify-between items-center bg-bg-secondary/30">
            <span>🤖 AI-Assisted Checking and Detailed Grading report</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-border-primary text-text-secondary font-medium">COMING SOON</span>
          </div>

          {/* Navigation Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              href={`/subjects/${subjectId}`}
              className="w-full sm:w-auto flex-grow px-6 py-3 rounded-lg bg-accent text-white text-xs font-bold hover:bg-accent-hover transition-colors text-center shadow-sm"
            >
              Back to Dashboard
            </Link>
            
            <Link
              href="/onboarding"
              className="w-full sm:w-auto flex-grow px-6 py-3 rounded-lg border border-border-primary bg-bg-secondary text-text-primary text-xs font-bold hover:bg-bg-tertiary transition-colors text-center"
            >
              Prepare Another Subject
            </Link>
          </div>
        </motion.div>
      </main>

      <footer className="border-t border-border-primary/50 bg-bg-secondary/20 py-6 text-center text-xs text-text-secondary">
        <p>PaperHub Chapter • Mapped Syllabus and Exam Patterns</p>
      </footer>
    </div>
  );
}
