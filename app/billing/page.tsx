'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Navbar } from '@/components/navbar';
import { useAuth } from '@/components/auth-provider';
import { BetaBadge } from '@/components/BetaBadge';
import { 
  CreditCard, 
  Loader2, 
  MessageSquare, 
  CheckCircle, 
  Activity, 
  Calendar,
  Sparkles,
  BarChart3,
  Bookmark,
  Award
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UsageLimitDetail {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

interface UsageSummary {
  usage: {
    daily: {
      aiChats: number;
      evaluations: number;
      date: string;
    };
    monthly: {
      mockTests: number;
      month: string;
    };
    lifetime: {
      totalSessions: number;
      totalQuestionsSolved: number;
      totalMockTests: number;
      totalAiChats: number;
      totalFeedbackSubmitted: number;
    };
    plan: string;
  };
  limits: {
    dailyAiChats: UsageLimitDetail;
    dailyEvaluations: UsageLimitDetail;
    mockTestsPerMonth: UsageLimitDetail;
  };
}

export default function BillingPage() {
  const { user, fbUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UsageSummary | null>(null);
  const [error, setError] = useState('');

  // Client-side authentication & authorization redirect guard
  useEffect(() => {
    if (!authLoading) {
      if (!fbUser) {
        router.push('/login');
      } else if (fbUser && !fbUser.emailVerified) {
        router.push('/verify-email');
      } else if (fbUser && user && user.role === 'student' && !user.onboardingCompleted) {
        router.push('/onboarding');
      }
    }
  }, [user, fbUser, authLoading, router]);

  useEffect(() => {
    if (authLoading || !fbUser) return;

    const fetchUsage = async () => {
      try {
        setLoading(true);
        const idToken = await fbUser.getIdToken();
        const res = await fetch('/api/usage', {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to fetch usage statistics.');
        }

        const summary = await res.json();
        setData(summary);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'An error occurred while loading billing data.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, [fbUser, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen bg-bg-primary text-text-primary overflow-hidden relative">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-grow flex flex-col min-h-screen overflow-y-auto z-10">
          <Navbar onMenuToggle={() => setSidebarOpen(true)} />
          <main className="flex-grow flex items-center justify-center">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
              <p className="text-xs text-text-secondary">Loading usage profiles...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const usage = data?.usage;
  const limits = data?.limits;
  const planName = usage?.plan === 'free' ? 'Free' : usage?.plan === 'pro' ? 'Pro' : usage?.plan === 'institution' ? 'Institution' : 'Beta Pro';

  // Calculate percentage helper
  const getPercent = (used: number, limit: number) => {
    if (limit === -1 || limit === 0) return 0;
    return Math.min(100, Math.round((used / limit) * 100));
  };

  // Mock past 7 days usage array for the pure SVG visual chart
  const last7DaysData = [
    { day: 'Mon', chats: 4, evals: 2 },
    { day: 'Tue', chats: 8, evals: 3 },
    { day: 'Wed', chats: 12, evals: 5 },
    { day: 'Thu', chats: 7, evals: 4 },
    { day: 'Fri', chats: 15, evals: 8 },
    { day: 'Sat', chats: 9, evals: 3 },
    { day: 'Sun', chats: (usage?.daily.aiChats || 0), evals: (usage?.daily.evaluations || 0) }
  ];

  const maxDailyValue = Math.max(...last7DaysData.map(d => d.chats + d.evals), 10);

  return (
    <div className="flex min-h-screen bg-bg-primary text-text-primary overflow-hidden relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-grow flex flex-col min-h-screen overflow-y-auto z-10">
        <Navbar onMenuToggle={() => setSidebarOpen(true)} />

        <main className="flex-grow max-w-4xl w-full mx-auto px-6 py-8 space-y-8">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-primary/50 pb-4">
            <div className="flex items-center space-x-3">
              <CreditCard className="w-6 h-6 text-accent" />
              <h2 className="font-display font-black text-2xl">Billing & Usage</h2>
            </div>
            <Link
              href="/pricing"
              className="text-xs font-bold text-accent hover:text-accent-hover transition-colors"
            >
              Compare Plans →
            </Link>
          </div>

          {error && (
            <div className="p-4 rounded-xl border border-red-500/25 bg-red-500/5 text-xs text-red-400 font-semibold">
              {error}
            </div>
          )}

          {data && (
            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Left Column: Plan and Quotas */}
              <div className="md:col-span-2 space-y-6">
                
                {/* Active Plan Card */}
                <div className="p-6 rounded-2xl border border-purple-500/25 bg-gradient-to-r from-purple-500/10 via-accent/5 to-purple-500/10 space-y-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-purple-300">Current active plan</h4>
                      <h3 className="font-display font-black text-2xl text-text-primary flex items-center gap-2">
                        {planName} <BetaBadge size="md" />
                      </h3>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[10px] font-bold">
                      Active
                    </span>
                  </div>

                  <p className="text-xs text-text-secondary leading-relaxed">
                    Your account is currently unlocked with full Pro level features. As part of our public beta, you have access to larger daily AI quotas and unlimited mock tests.
                  </p>

                  <div className="border-t border-purple-500/20 pt-4 flex items-center justify-between text-[11px] text-text-muted">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-purple-400" /> Beta started: June 2026
                    </span>
                    <span>No charges active</span>
                  </div>
                </div>

                {/* Quotas & Progress Bars */}
                <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-5">
                  <h3 className="font-display font-bold text-sm text-text-primary flex items-center gap-2">
                    <Activity className="w-4 h-4 text-accent" /> Active Quotas & Usage Limits
                  </h3>

                  <div className="space-y-4">
                    {/* Daily AI Chats */}
                    {limits?.dailyAiChats && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-text-primary">Daily AI Chat Queries</span>
                          <span className="text-text-secondary font-semibold">
                            {limits.dailyAiChats.used} / {limits.dailyAiChats.limit === -1 ? 'Unlimited' : limits.dailyAiChats.limit}
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-bg-primary border border-border-primary/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-accent to-purple-500 transition-all duration-300"
                            style={{ width: `${getPercent(limits.dailyAiChats.used, limits.dailyAiChats.limit)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Daily AI Evaluations */}
                    {limits?.dailyEvaluations && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-text-primary">Daily AI Paper Evaluations</span>
                          <span className="text-text-secondary font-semibold">
                            {limits.dailyEvaluations.used} / {limits.dailyEvaluations.limit === -1 ? 'Unlimited' : limits.dailyEvaluations.limit}
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-bg-primary border border-border-primary/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-accent to-emerald-500 transition-all duration-300"
                            style={{ width: `${getPercent(limits.dailyEvaluations.used, limits.dailyEvaluations.limit)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Monthly Mock Tests */}
                    {limits?.mockTestsPerMonth && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-text-primary">Monthly Mock Tests & Exams</span>
                          <span className="text-text-secondary font-semibold">
                            {limits.mockTestsPerMonth.used} / {limits.mockTestsPerMonth.limit === -1 ? 'Unlimited' : limits.mockTestsPerMonth.limit}
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-bg-primary border border-border-primary/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                            style={{ width: `${getPercent(limits.mockTestsPerMonth.used, limits.mockTestsPerMonth.limit)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* SVG Usage History Chart */}
                <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4">
                  <h3 className="font-display font-bold text-sm text-text-primary flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-400" /> Usage History (Last 7 Days)
                  </h3>

                  <div className="relative pt-4 h-48 w-full">
                    {/* SVG Chart */}
                    <svg className="w-full h-full" viewBox="0 0 500 160">
                      {/* Grid Lines */}
                      <line x1="30" y1="20" x2="480" y2="20" stroke="currentColor" className="text-border-primary/30" strokeDasharray="4" />
                      <line x1="30" y1="70" x2="480" y2="70" stroke="currentColor" className="text-border-primary/30" strokeDasharray="4" />
                      <line x1="30" y1="120" x2="480" y2="120" stroke="currentColor" className="text-border-primary/30" strokeDasharray="4" />

                      {/* Chart Bars */}
                      {last7DaysData.map((d, index) => {
                        const x = 50 + index * 60;
                        const chatHeight = (d.chats / maxDailyValue) * 100;
                        const evalHeight = (d.evals / maxDailyValue) * 100;
                        
                        return (
                          <g key={d.day}>
                            {/* Chat queries bar */}
                            <rect 
                              x={x} 
                              y={120 - chatHeight} 
                              width="12" 
                              height={chatHeight} 
                              fill="url(#accentGradient)" 
                              rx="3"
                              className="transition-all duration-500 hover:opacity-85"
                            />
                            {/* Evaluation queries bar */}
                            <rect 
                              x={x + 16} 
                              y={120 - evalHeight} 
                              width="12" 
                              height={evalHeight} 
                              fill="url(#purpleGradient)" 
                              rx="3"
                              className="transition-all duration-500 hover:opacity-85"
                            />
                            {/* Day label */}
                            <text x={x + 14} y="142" textAnchor="middle" className="text-[10px] font-bold fill-text-secondary">
                              {d.day}
                            </text>
                          </g>
                        );
                      })}

                      {/* Gradients */}
                      <defs>
                        <linearGradient id="accentGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent, #6366f1)" />
                          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.4" />
                        </linearGradient>
                        <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#7e22ce" stopOpacity="0.4" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* Legends */}
                    <div className="flex justify-center gap-6 text-[10px] font-bold text-text-secondary mt-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-accent" /> AI Chat Queries
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" /> Evaluations
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Lifetime Stats & Info */}
              <div className="space-y-6">
                
                {/* Lifetime Stats */}
                <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4">
                  <h3 className="font-display font-bold text-sm text-text-primary flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" /> Lifetime Activities
                  </h3>

                  <div className="divide-y divide-border-primary/50">
                    <div className="py-3 flex justify-between text-xs">
                      <span className="text-text-secondary font-semibold">Total Sessions Solved</span>
                      <strong className="text-text-primary">{usage?.lifetime.totalSessions || 0}</strong>
                    </div>
                    <div className="py-3 flex justify-between text-xs">
                      <span className="text-text-secondary font-semibold">Questions Evaluated</span>
                      <strong className="text-text-primary">{usage?.lifetime.totalQuestionsSolved || 0}</strong>
                    </div>
                    <div className="py-3 flex justify-between text-xs">
                      <span className="text-text-secondary font-semibold">Mock Exams Taken</span>
                      <strong className="text-text-primary">{usage?.lifetime.totalMockTests || 0}</strong>
                    </div>
                    <div className="py-3 flex justify-between text-xs">
                      <span className="text-text-secondary font-semibold">AI Explanations Used</span>
                      <strong className="text-text-primary">{usage?.lifetime.totalAiChats || 0}</strong>
                    </div>
                    <div className="py-3 flex justify-between text-xs">
                      <span className="text-text-secondary font-semibold">Feedback Submitted</span>
                      <strong className="text-text-primary">{usage?.lifetime.totalFeedbackSubmitted || 0}</strong>
                    </div>
                  </div>
                </div>

                {/* Feedback CTA */}
                <div className="p-6 rounded-2xl border border-accent/15 bg-accent/5 space-y-3">
                  <h4 className="font-display font-bold text-sm text-accent flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-accent" /> Share Feedback
                  </h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Notice any bugs during evaluations or mock test generation? Hit the floating feedback icon in the bottom-right corner to report issues directly to the admin queue.
                  </p>
                </div>

              </div>

            </div>
          )}

        </main>
      </div>
    </div>
  );
}
