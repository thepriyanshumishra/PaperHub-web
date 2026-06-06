'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Loader2,
  ArrowLeft,
  Users,
  CheckCircle,
  AlertTriangle,
  Activity,
  MessageSquare,
  Zap,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  XCircle,
  Clock,
  Star,
  Target,
  LogOut,
} from 'lucide-react';

interface LaunchStats {
  users: {
    totalRegistrations: number;
    verifiedUsers: number;
    onboardedUsers: number;
    suspendedUsers: number;
    bannedUsers: number;
    dau: number;
    signupsToday: number;
    verificationRate: number;
    onboardingRate: number;
  };
  sessions: {
    sessionsToday: number;
    activeSessions: number;
    failedSessions: number;
    aiRequestsToday: number;
  };
  feedback: {
    total: number;
    open: number;
    today: number;
  };
  health: {
    recentErrors: number;
    status: 'green' | 'amber' | 'red';
  };
  generatedAt: string;
}

export default function AdminLaunchDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-secondary">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
          <p className="text-sm">Loading launch dashboard...</p>
        </div>
      </div>
    }>
      <AdminLaunchContent />
    </Suspense>
  );
}

function AdminLaunchContent() {
  const router = useRouter();
  const { user, fbUser, loading, logout } = useAuth();

  const [stats, setStats] = useState<LaunchStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Auth guard
  useEffect(() => {
    if (!loading) {
      if (!fbUser) {
        router.push('/login');
      } else if (user && user.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, fbUser, loading, router]);

  const loadStats = async () => {
    if (!fbUser) return;
    setLoadingStats(true);
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch('/api/admin/launch-stats', {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('Failed to load launch stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (fbUser && user?.role === 'admin') {
      loadStats();
    }
  }, [fbUser, user]);

  if (loading || !fbUser || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
          <p className="text-xs text-text-secondary">Securing admin workspace...</p>
        </div>
      </div>
    );
  }

  const healthColor = {
    green: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
  };

  const healthBg = {
    green: 'bg-emerald-500/10 border-emerald-500/30',
    amber: 'bg-amber-500/10 border-amber-500/30',
    red: 'bg-red-500/10 border-red-500/30',
  };

  const healthLabel = {
    green: '🟢 System Healthy',
    amber: '🟡 Minor Issues',
    red: '🔴 Action Required',
  };

  const currentHealth = stats?.health.status ?? 'green';

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">

      {/* Top Navbar */}
      <header className="border-b border-border-primary/50 bg-bg-primary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/admin"
              className="p-2 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <span className="font-display font-black tracking-wider text-sm uppercase bg-gradient-to-r from-emerald-400 via-teal-400 to-accent bg-clip-text text-transparent">
                Beta Launch Control
              </span>
              <p className="text-[10px] text-text-muted font-mono">
                {lastRefreshed ? `Last updated: ${lastRefreshed.toLocaleTimeString()}` : 'Loading...'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Health Status Badge */}
            {stats && (
              <div className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${healthBg[currentHealth]} ${healthColor[currentHealth]}`}>
                <span>{healthLabel[currentHealth]}</span>
              </div>
            )}

            <button
              onClick={loadStats}
              disabled={loadingStats}
              className="p-2 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
            </button>
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

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {loadingStats && !stats ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
              <p className="text-xs text-text-secondary">Fetching live beta metrics...</p>
            </div>
          </div>
        ) : stats ? (
          <>
            {/* ── Row 1: User Funnel ───────────────────────────────────────────── */}
            <section>
              <h2 className="font-display font-extrabold text-xs uppercase tracking-widest text-text-secondary mb-4 flex items-center space-x-2">
                <Users className="w-4 h-4 text-accent" />
                <span>User Funnel</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  {
                    label: 'Registrations',
                    value: stats.users.totalRegistrations,
                    icon: <Users className="w-5 h-5" />,
                    color: 'text-blue-400',
                    bg: 'bg-blue-500/10 border-blue-500/20',
                    sub: `+${stats.users.signupsToday} today`,
                  },
                  {
                    label: 'Email Verified',
                    value: stats.users.verifiedUsers,
                    icon: <CheckCircle className="w-5 h-5" />,
                    color: 'text-teal-400',
                    bg: 'bg-teal-500/10 border-teal-500/20',
                    sub: `${stats.users.verificationRate}% rate`,
                  },
                  {
                    label: 'Onboarded',
                    value: stats.users.onboardedUsers,
                    icon: <Target className="w-5 h-5" />,
                    color: 'text-emerald-400',
                    bg: 'bg-emerald-500/10 border-emerald-500/20',
                    sub: `${stats.users.onboardingRate}% rate`,
                  },
                  {
                    label: 'Active Today',
                    value: stats.users.dau,
                    icon: <Activity className="w-5 h-5" />,
                    color: 'text-accent',
                    bg: 'bg-accent/10 border-accent/20',
                    sub: 'Daily Active Users',
                  },
                  {
                    label: 'Suspended / Banned',
                    value: stats.users.suspendedUsers + stats.users.bannedUsers,
                    icon: <XCircle className="w-5 h-5" />,
                    color: stats.users.suspendedUsers + stats.users.bannedUsers > 0 ? 'text-red-400' : 'text-text-muted',
                    bg: stats.users.suspendedUsers + stats.users.bannedUsers > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-bg-secondary border-border-primary',
                    sub: `${stats.users.suspendedUsers} suspended, ${stats.users.bannedUsers} banned`,
                  },
                ].map((card, i) => (
                  <div key={i} className={`p-5 rounded-2xl border ${card.bg} space-y-3`}>
                    <div className={`p-2.5 rounded-xl inline-flex ${card.bg} ${card.color}`}>
                      {card.icon}
                    </div>
                    <div>
                      <div className="text-2xl font-display font-black text-text-primary">{card.value.toLocaleString()}</div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-text-secondary mt-0.5">{card.label}</div>
                      <div className="text-[10px] text-text-muted mt-1">{card.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Row 2: Session & AI Activity ─────────────────────────────────── */}
            <section>
              <h2 className="font-display font-extrabold text-xs uppercase tracking-widest text-text-secondary mb-4 flex items-center space-x-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Session & AI Activity (Today)</span>
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Sessions Today',
                    value: stats.sessions.sessionsToday,
                    icon: <TrendingUp className="w-5 h-5" />,
                    color: 'text-accent',
                    bg: 'bg-accent/10 border-accent/20',
                  },
                  {
                    label: 'Active Sessions',
                    value: stats.sessions.activeSessions,
                    icon: <Clock className="w-5 h-5" />,
                    color: 'text-blue-400',
                    bg: 'bg-blue-500/10 border-blue-500/20',
                  },
                  {
                    label: 'AI Requests Today',
                    value: stats.sessions.aiRequestsToday,
                    icon: <Star className="w-5 h-5" />,
                    color: 'text-purple-400',
                    bg: 'bg-purple-500/10 border-purple-500/20',
                  },
                  {
                    label: 'Failed Evaluations',
                    value: stats.sessions.failedSessions,
                    icon: <AlertTriangle className="w-5 h-5" />,
                    color: stats.sessions.failedSessions > 5 ? 'text-red-400' : 'text-text-muted',
                    bg: stats.sessions.failedSessions > 5 ? 'bg-red-500/10 border-red-500/20' : 'bg-bg-secondary border-border-primary',
                  },
                ].map((card, i) => (
                  <div key={i} className={`p-5 rounded-2xl border ${card.bg} space-y-3`}>
                    <div className={`p-2.5 rounded-xl inline-flex ${card.bg} ${card.color}`}>
                      {card.icon}
                    </div>
                    <div>
                      <div className="text-2xl font-display font-black text-text-primary">{card.value.toLocaleString()}</div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-text-secondary mt-0.5">{card.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Row 3: Feedback + Health ──────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Feedback Panel */}
              <section>
                <h2 className="font-display font-extrabold text-xs uppercase tracking-widest text-text-secondary mb-4 flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-teal-400" />
                  <span>User Feedback</span>
                </h2>
                <div className={`p-6 rounded-2xl border bg-bg-secondary/40 border-border-primary space-y-5`}>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Total', value: stats.feedback.total, color: 'text-text-primary' },
                      { label: 'Open', value: stats.feedback.open, color: stats.feedback.open > 10 ? 'text-amber-400' : 'text-text-primary' },
                      { label: 'Today', value: stats.feedback.today, color: 'text-teal-400' },
                    ].map((item, i) => (
                      <div key={i} className="text-center">
                        <div className={`text-2xl font-display font-black ${item.color}`}>{item.value}</div>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-text-muted mt-0.5">{item.label}</div>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/admin"
                    className="block w-full text-center py-2.5 rounded-xl border border-border-primary bg-bg-primary text-xs font-bold text-text-secondary hover:text-accent hover:border-accent/40 transition-all"
                  >
                    View All Feedback →
                  </Link>
                </div>
              </section>

              {/* System Health Panel */}
              <section>
                <h2 className="font-display font-extrabold text-xs uppercase tracking-widest text-text-secondary mb-4 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>System Health</span>
                </h2>
                <div className={`p-6 rounded-2xl border ${healthBg[currentHealth]} space-y-4`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-lg font-display font-black ${healthColor[currentHealth]}`}>
                        {healthLabel[currentHealth]}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {stats.health.recentErrors} errors in last 24h
                      </p>
                    </div>
                    <div className={`text-4xl font-display font-black ${healthColor[currentHealth]}`}>
                      {stats.health.recentErrors === 0 ? '✓' : stats.health.recentErrors}
                    </div>
                  </div>

                  {/* Mini checklist */}
                  <div className="space-y-2 pt-2 border-t border-border-primary/30">
                    {[
                      { label: 'Email verification active', ok: true },
                      { label: 'Redis session cache', ok: true },
                      { label: 'AI rate limiting', ok: true },
                      { label: 'Document Pipeline', ok: false, note: 'Disabled (Phase L.2)' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary">{item.label}</span>
                        <span className={item.ok ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                          {item.ok ? '✓ Active' : item.note ?? '✗ Off'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            {/* ── Beta Funnel Visualization ─────────────────────────────────────── */}
            <section>
              <h2 className="font-display font-extrabold text-xs uppercase tracking-widest text-text-secondary mb-4 flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span>Conversion Funnel</span>
              </h2>
              <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 space-y-4">
                {[
                  { label: 'Signed Up', value: stats.users.totalRegistrations, color: 'bg-blue-500' },
                  { label: 'Email Verified', value: stats.users.verifiedUsers, color: 'bg-teal-500' },
                  { label: 'Onboarded', value: stats.users.onboardedUsers, color: 'bg-emerald-500' },
                  { label: 'Active Today', value: stats.users.dau, color: 'bg-accent' },
                ].map((step, i) => {
                  const max = stats.users.totalRegistrations || 1;
                  const width = Math.max(4, Math.round((step.value / max) * 100));
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-text-secondary">{step.label}</span>
                        <span className="font-mono font-bold text-text-primary">{step.value.toLocaleString()}</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-bg-primary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${step.color} transition-all duration-700`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Footer */}
            <div className="text-center pb-6">
              <p className="text-[10px] text-text-muted font-mono">
                Metrics generated at {new Date(stats.generatedAt).toLocaleString()} •{' '}
                <button onClick={loadStats} className="text-accent hover:underline">Refresh</button>
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="text-sm text-text-secondary">Failed to load launch stats.</p>
              <button onClick={loadStats} className="text-xs text-accent hover:underline">Retry</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
