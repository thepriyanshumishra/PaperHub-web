'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/sidebar';
import { Navbar } from '@/components/navbar';
import { useAuth } from '@/components/auth-provider';
import { 
  User as UserIcon, 
  Settings, 
  CreditCard, 
  Calendar, 
  HelpCircle, 
  CheckCircle2, 
  Target, 
  Compass, 
  Loader2, 
  ChevronRight,
  Flame,
  Zap,
  TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const { user, fbUser, loading: authLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [localCollege, setLocalCollege] = useState<string | null>(null);
  const [localBranch, setLocalBranch] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLocalCollege(localStorage.getItem('selectedCollege'));
      setLocalBranch(localStorage.getItem('selectedBranch'));
    }
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  const activeName = user?.profile?.name || fbUser?.displayName || 'Explorer';
  const activeEmail = user?.email || fbUser?.email || '';
  const activeCollege = user?.profile?.college || localCollege || 'MMMUT';
  const activeBranch = user?.profile?.branch || localBranch || 'CSE';
  const activeSemester = user?.profile?.semester || 1;

  const [stats, setStats] = useState({
    solved: 0,
    correct: 0,
    accuracy: 0,
    challenges: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!fbUser) return;
    setLoadingStats(true);
    fbUser.getIdToken()
      .then(token => fetch('/api/users/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      }))
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.metrics) {
          setStats({
            solved: data.metrics.questionsAttempted || 0,
            correct: data.metrics.questionsSolved || 0,
            accuracy: data.metrics.overallAccuracy || 0,
            challenges: (data.metrics.totalPracticeSessions || 0) + (data.metrics.totalTestSessions || 0)
          });
        }
      })
      .catch(err => console.error('Failed to load user profile stats:', err))
      .finally(() => setLoadingStats(false));
  }, [fbUser]);

  const dailySolved = user?.engagement?.dailyGoalSolved || 0;
  const dailyPercent = Math.round((dailySolved / 30) * 100);

  return (
    <div className="flex min-h-screen bg-bg-primary text-text-primary overflow-hidden relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-grow flex flex-col min-h-screen overflow-y-auto z-10">
        <Navbar onMenuToggle={() => setSidebarOpen(true)} />

        <main className="flex-grow max-w-4xl w-full mx-auto px-6 py-8 space-y-8">
          {/* User profile Summary Header */}
          <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-3xl select-none">
                👾
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <h2 className="font-display font-extrabold text-lg text-text-primary">{activeName}</h2>
                <p className="text-xs text-text-secondary">{activeEmail}</p>
                <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start text-[10px] font-bold text-text-muted mt-1.5">
                  <span>{activeCollege} Student</span>
                  <span>•</span>
                  <span>{activeBranch} Stream</span>
                  <span>•</span>
                  <span>Target Year — 2027</span>
                </div>
              </div>
            </div>
            
            <button className="p-2.5 rounded-xl border border-border-primary bg-bg-primary/50 hover:bg-bg-tertiary text-text-secondary transition-all">
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* User purchases / upcoming exams shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button className="p-4.5 rounded-xl border border-border-primary bg-bg-secondary/30 hover:bg-bg-secondary/75 hover:border-accent/25 transition-all text-left flex items-center justify-between group">
              <div className="flex items-center space-x-3.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/15 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-xs text-text-primary">View My Purchases</h4>
                  <p className="text-[9px] text-text-muted mt-0.5">Manage billing & premium subscriptions</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button className="p-4.5 rounded-xl border border-border-primary bg-bg-secondary/30 hover:bg-bg-secondary/75 hover:border-accent/25 transition-all text-left flex items-center justify-between group">
              <div className="flex items-center space-x-3.5">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/15 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-xs text-text-primary">MY Exams</h4>
                  <p className="text-[9px] text-text-muted mt-0.5">View upcoming college examinations schedule</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Daily Goal progression row */}
          <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-primary">My Learning Activity</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-bold text-text-secondary">
                <span>Daily Study Goal ({dailySolved}/30 Questions)</span>
                <span>{dailyPercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-bg-tertiary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${Math.min(100, (dailySolved / 30) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Weekly activity metric details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-primary">My Weekly Activity</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-bg-tertiary text-text-secondary border border-border-primary">
                Active Week
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Question Attempted', value: loadingStats ? '...' : stats.solved, icon: HelpCircle, color: 'text-blue-400 bg-blue-500/5 border-blue-500/10' },
                { label: 'Correct Questions', value: loadingStats ? '...' : stats.correct, icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10' },
                { label: 'Average Accuracy', value: loadingStats ? '...' : `${stats.accuracy}%`, icon: Target, color: 'text-amber-400 bg-amber-500/5 border-amber-500/10' },
                { label: 'Challenges Taken', value: loadingStats ? '...' : stats.challenges, icon: Compass, color: 'text-red-400 bg-red-500/5 border-red-500/10' }
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className={`p-4 rounded-xl border flex flex-col justify-between h-28 ${item.color}`}>
                    <Icon className="w-4 h-4 shrink-0" />
                    <div>
                      <h4 className="font-display font-black text-lg leading-none mt-2">{item.value}</h4>
                      <p className="text-[9px] font-bold opacity-75 mt-1">{item.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
