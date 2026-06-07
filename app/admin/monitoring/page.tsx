'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Navbar } from '@/components/navbar';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { 
  BarChart2, 
  Users, 
  UserPlus, 
  UserCheck, 
  FileCheck, 
  CheckSquare, 
  ShieldAlert, 
  Loader2,
  Lock,
  MessageSquare
} from 'lucide-react';

interface Metrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  sessionsCompleted: number;
  sessionsActive: number;
  questionsSolved: number;
  questionsAttempted: number;
  chatRoomsCount: number;
  verificationThroughput: number;
  moderationThroughput: number;
}

export default function AdminMonitoringPage() {
  const { user, fbUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!authLoading && !fbUser) {
      router.push('/login');
      return;
    }

    // If auth is loaded and user is not admin, redirect or show error
    if (!authLoading && (!user || user.role !== 'admin')) {
      setErrorMsg('Access Denied: Admin role required.');
      setLoadingMetrics(false);
      return;
    }

    if (!fbUser) return;

    const fetchMetrics = async () => {
      try {
        const idToken = await fbUser.getIdToken();
        const res = await fetch('/api/admin/monitoring', {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          setMetrics(data.metrics);
        } else {
          const data = await res.json();
          setErrorMsg(data.error || 'Failed to fetch monitoring metrics.');
        }
      } catch (err) {
        console.error(err);
        setErrorMsg('An error occurred while loading administrative stats.');
      } finally {
        setLoadingMetrics(false);
      }
    };

    fetchMetrics();
  }, [user, fbUser, authLoading]);

  if (authLoading || (loadingMetrics && !errorMsg)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  // Handle unauthorized or access denied states
  if (errorMsg || !user || user.role !== 'admin') {
    return (
      <div className="flex min-h-screen bg-bg-primary text-text-primary overflow-hidden relative">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-grow flex flex-col min-h-screen overflow-y-auto z-10">
          <Navbar onMenuToggle={() => setSidebarOpen(true)} />
          <main className="flex-grow flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-500">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-display font-black text-lg">Forbidden</h3>
            <p className="text-xs text-text-secondary max-w-sm">
              {errorMsg || 'You do not have permission to access the operational monitoring dashboard.'}
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-5 py-2.5 rounded-xl bg-accent text-white text-xs font-bold transition-all shadow-md"
            >
              Back to Dashboard
            </button>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg-primary text-text-primary overflow-hidden relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-grow flex flex-col min-h-screen overflow-y-auto z-10">
        <Navbar onMenuToggle={() => setSidebarOpen(true)} />

        <main className="flex-grow max-w-5xl w-full mx-auto px-6 py-8 space-y-8">
          <div className="flex items-center justify-between border-b border-border-primary/50 pb-4">
            <div className="flex items-center space-x-3">
              <BarChart2 className="w-6 h-6 text-accent" />
              <h2 className="font-display font-black text-2xl">Admin Monitoring</h2>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded bg-accent/10 border border-accent/25 text-accent">
              Operational Status: Healthy
            </span>
          </div>

          {metrics && (
            <>
              {/* User Acquisition Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted">Total Registrations</span>
                    <Users className="w-4 h-4 text-accent" />
                  </div>
                  <h4 className="font-display font-black text-2xl">{metrics.totalUsers}</h4>
                  <p className="text-[10px] text-text-secondary">All-time university signups</p>
                </div>

                <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted">Active Users (7d)</span>
                    <UserCheck className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h4 className="font-display font-black text-2xl">{metrics.activeUsers}</h4>
                  <p className="text-[10px] text-text-secondary">Study active in last 7 days</p>
                </div>

                <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted">New Signs (7d)</span>
                    <UserPlus className="w-4 h-4 text-amber-500" />
                  </div>
                  <h4 className="font-display font-black text-2xl">{metrics.newUsers}</h4>
                  <p className="text-[10px] text-text-secondary">Registrations in last 7 days</p>
                </div>
              </div>

              {/* Sessional mock tests & questions statistics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4 text-left">
                  <h3 className="font-display font-bold text-sm text-text-primary flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-purple-500" /> Sessional mock tests activity
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-bg-primary/30 border border-border-primary/50">
                      <span className="text-[10px] font-bold text-text-muted uppercase">Completed</span>
                      <h5 className="font-display font-black text-xl text-text-primary mt-1">{metrics.sessionsCompleted}</h5>
                    </div>
                    <div className="p-4 rounded-xl bg-bg-primary/30 border border-border-primary/50">
                      <span className="text-[10px] font-bold text-text-muted uppercase">Currently Active</span>
                      <h5 className="font-display font-black text-xl text-accent mt-1">{metrics.sessionsActive}</h5>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4 text-left">
                  <h3 className="font-display font-bold text-sm text-text-primary flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-emerald-500" /> Questions Solved
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-bg-primary/30 border border-border-primary/50">
                      <span className="text-[10px] font-bold text-text-muted uppercase">Correct Answers</span>
                      <h5 className="font-display font-black text-xl text-emerald-500 mt-1">{metrics.questionsSolved}</h5>
                    </div>
                    <div className="p-4 rounded-xl bg-bg-primary/30 border border-border-primary/50">
                      <span className="text-[10px] font-bold text-text-muted uppercase">Total Attempted</span>
                      <h5 className="font-display font-black text-xl text-text-primary mt-1">{metrics.questionsAttempted}</h5>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI and Curation throughput logs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted">AI Queries Room</span>
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                  </div>
                  <h4 className="font-display font-black text-2xl">{metrics.chatRoomsCount}</h4>
                  <p className="text-[10px] text-text-secondary">Active Llama/Groq rooms count</p>
                </div>

                <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted">Verifier Throughput (7d)</span>
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h4 className="font-display font-black text-2xl">{metrics.verificationThroughput}</h4>
                  <p className="text-[10px] text-text-secondary">Questions verified this week</p>
                </div>

                <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-muted">Moderator Actions (7d)</span>
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                  </div>
                  <h4 className="font-display font-black text-2xl">{metrics.moderationThroughput}</h4>
                  <p className="text-[10px] text-text-secondary">Moderator audits logged</p>
                </div>
              </div>

              {/* Visual throughput comparison bars */}
              <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-6 text-left">
                <h3 className="font-display font-bold text-sm text-text-primary">Weekly Workflow Velocity</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-text-secondary">
                      <span>Verifier Verification Output ({metrics.verificationThroughput} Qs)</span>
                      <span>Target: 200/wk</span>
                    </div>
                    <div className="w-full h-3 bg-bg-tertiary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent transition-all duration-300"
                        style={{ width: `${Math.min(100, (metrics.verificationThroughput / 200) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-text-secondary">
                      <span>Moderation Actions Audit Volume ({metrics.moderationThroughput} audits)</span>
                      <span>Target: 50/wk</span>
                    </div>
                    <div className="w-full h-3 bg-bg-tertiary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${Math.min(100, (metrics.moderationThroughput / 50) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
