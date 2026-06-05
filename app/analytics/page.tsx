'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Navbar } from '@/components/navbar';
import { useAuth } from '@/components/auth-provider';
import { 
  TrendingUp, 
  HelpCircle, 
  CheckCircle2, 
  Flame, 
  Target, 
  Zap, 
  Loader2, 
  ArrowUpRight,
  BookOpen,
  Award,
  AlertCircle,
  FolderHeart
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function AnalyticsPage() {
  const { user, fbUser, loading: authLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!fbUser) return;
      try {
        const token = await fbUser.getIdToken();
        const res = await fetch('/api/users/analytics', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      } catch (err) {
        console.error("Failed to load student analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchAnalytics();
    }
  }, [authLoading, fbUser]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <div className="text-center space-y-3">
          <Loader2 className="w-7 h-7 text-accent animate-spin mx-auto" />
          <p className="text-xs text-text-secondary">Loading learning insights…</p>
        </div>
      </div>
    );
  }

  const metrics = analytics?.metrics || {
    questionsSolved: 0,
    questionsAttempted: 0,
    overallAccuracy: 0,
    totalPracticeSessions: 0,
    totalTestSessions: 0,
    testsCompleted: 0,
    streakCount: 0,
    longestStreak: 0,
    totalXp: 0,
    dailyGoalSolved: 0,
    dailyGoalTarget: 30,
    league: 'beginner'
  };

  const strongTopics = analytics?.strongTopics || [];
  const weakTopics = analytics?.weakTopics || [];
  const needsImprovement = analytics?.needsImprovement || [];
  const mostPracticed = analytics?.mostPracticed || [];

  return (
    <div className="flex min-h-screen bg-bg-primary text-text-primary overflow-hidden relative">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        streakCount={analytics?.metrics?.streakCount ?? 0}
        streakDays={analytics?.metrics?.streakDays}
      />

      <div className="flex-grow flex flex-col min-h-screen overflow-y-auto z-10">
        <Navbar onMenuToggle={() => setSidebarOpen(true)} />

        <main className="flex-grow max-w-5xl w-full mx-auto px-6 sm:px-8 py-8 space-y-8">
          {/* Header section */}
          <div className="space-y-1">
            <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight leading-none">
              Learning <span className="text-accent">Insights</span> & Analytics 📊
            </h2>
            <p className="text-xs text-text-secondary max-w-lg">
              Understand your performance trends, identify topic weaknesses, and track daily goals.
            </p>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Overall Accuracy', value: `${metrics.overallAccuracy}%`, icon: Target, color: 'text-blue-400 bg-blue-500/5 border-blue-500/10' },
              { label: 'XP Points', value: metrics.totalXp, icon: Zap, color: 'text-yellow-400 bg-yellow-400/8 border-yellow-400/15' },
              { label: 'Questions Solved', value: metrics.questionsSolved, icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10' },
              { label: 'Current Streak', value: `${metrics.streakCount} days`, icon: Flame, color: 'text-orange-400 bg-orange-400/8 border-orange-400/15' }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={idx}
                  whileHover={{ y: -3 }}
                  className={`p-4.5 rounded-2xl border flex flex-col justify-between h-28 ${item.color} shadow-sm`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-text-muted">{item.label}</span>
                    <Icon className="w-4 h-4 shrink-0" />
                  </div>
                  <div>
                    <h4 className="font-display font-black text-xl leading-none">{item.value}</h4>
                    {idx === 3 && (
                      <p className="text-[8px] text-text-muted mt-1 uppercase font-bold">Longest Streak: {metrics.longestStreak} days</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Daily Goal Progression & League Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Daily Goal card */}
            <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4 md:col-span-2 text-left">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-primary flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                <span>Daily Challenge Goal</span>
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-text-secondary">
                  <span>Solved Today: {metrics.dailyGoalSolved} / {metrics.dailyGoalTarget} Qs</span>
                  <span>{Math.round((metrics.dailyGoalSolved / metrics.dailyGoalTarget) * 100)}%</span>
                </div>
                <div className="w-full h-3 bg-bg-tertiary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${Math.min(100, (metrics.dailyGoalSolved / metrics.dailyGoalTarget) * 100)}%` }}
                  />
                </div>
              </div>
              <p className="text-[10px] text-text-muted">
                Maintain consistency to build daily streaks. Completed streaks award progression bonus.
              </p>
            </div>

            {/* League Badge card */}
            <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm flex flex-col justify-between text-center">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-primary">
                League Tier
              </h3>
              <div className="my-3 space-y-2">
                <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/25 flex items-center justify-center text-2xl mx-auto shadow-md shadow-accent/10 animate-bounce">
                  🏆
                </div>
                <h4 className="font-display font-black text-sm uppercase tracking-wider text-accent leading-none">
                  {metrics.league} League
                </h4>
              </div>
              <p className="text-[9px] text-text-muted">
                Accumulate XP by solving descriptive questions and completing tests to rank higher.
              </p>
            </div>
          </div>

          {/* Topics Performance Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths Card */}
            <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4 text-left">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-primary">Strong Topics ($\ge$ 80% accuracy)</h3>
              </div>
              
              {strongTopics.length > 0 ? (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {strongTopics.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-extrabold text-text-primary">{item.topic}</p>
                        <p className="text-[9px] text-text-muted mt-0.5">{item.subjectName} • Unit {item.unit}</p>
                      </div>
                      <span className="font-display font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md shrink-0">
                        {item.accuracy}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted py-6 text-center italic">No strong topics identified yet. Keep practicing!</p>
              )}
            </div>

            {/* Weaknesses Card */}
            <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4 text-left">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-primary">Weak Topics ($\le$ 50% accuracy)</h3>
              </div>
              
              {weakTopics.length > 0 ? (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {weakTopics.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-extrabold text-text-primary">{item.topic}</p>
                        <p className="text-[9px] text-text-muted mt-0.5">{item.subjectName} • Unit {item.unit}</p>
                      </div>
                      <span className="font-display font-black text-rose-400 bg-rose-500/10 px-2 py-1 rounded-md shrink-0">
                        {item.accuracy}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted py-6 text-center italic">Excellent! No weak topics ($\le$ 50% accuracy) identified.</p>
              )}
            </div>
          </div>

          {/* Needs Improvement & Most Practiced Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Needs Improvement */}
            <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4 md:col-span-2 text-left">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-primary">Needs Improvement (50% - 80% accuracy)</h3>
              {needsImprovement.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {needsImprovement.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-extrabold text-text-primary line-clamp-1">{item.topic}</p>
                        <p className="text-[9px] text-text-muted mt-0.5 line-clamp-1">{item.subjectName}</p>
                      </div>
                      <span className="font-display font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md shrink-0">
                        {item.accuracy}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted py-6 text-center italic">No intermediate topics found.</p>
              )}
            </div>

            {/* Most Practiced Areas */}
            <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4 text-left">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-primary">Most Practiced Topics</h3>
              {mostPracticed.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {mostPracticed.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between border-b border-border-primary/30 pb-2 text-xs">
                      <div>
                        <p className="font-bold text-text-primary line-clamp-1">{item.topic}</p>
                        <p className="text-[9px] text-text-muted mt-0.5">{item.subjectName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-text-primary">{item.attempted} attempts</p>
                        <p className="text-[9px] text-emerald-400 font-semibold">{item.accuracy}% accuracy</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted py-6 text-center italic">Start practice sessions to track study frequency.</p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
