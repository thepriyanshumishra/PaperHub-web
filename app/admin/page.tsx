'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { 
  Loader2, 
  ArrowLeft, 
  User as UserIcon, 
  Shield, 
  ShieldAlert, 
  UserX, 
  CheckCircle, 
  AlertTriangle,
  Search,
  LogOut,
  Sliders,
  MessageSquare,
  BarChart3,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Globe,
  Settings,
  BookOpen,
  Activity,
  Cpu,
  TrendingUp,
  Database,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface IUser {
  _id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'student' | 'verifier' | 'moderator' | 'admin';
  accountStatus: 'active' | 'suspended' | 'banned';
  createdAt: string;
  plan?: string;
}

interface IFeedback {
  _id: string;
  userId: string;
  userEmail: string;
  category: 'bug' | 'feature_request' | 'content_quality' | 'ui_ux' | 'performance' | 'other';
  title: string;
  description: string;
  page: string;
  status: 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  adminNotes?: string;
  createdAt: string;
}

interface PlatformStats {
  users: {
    total: number;
    newLast7Days: number;
    newLast30Days: number;
    dailyActiveUsers: number;
    byRole: Record<string, number>;
    byPlan: Record<string, number>;
  };
  feedback: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    byCategory: Record<string, number>;
  };
  sessions: {
    total: number;
    today: number;
  };
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-secondary">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
          <p className="text-sm">Loading admin workspace...</p>
        </div>
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}

function AdminDashboardContent() {
  const router = useRouter();
  const { user: currentUser, fbUser, loading, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'users' | 'analytics' | 'feedback' | 'monitoring'>('analytics');
  
  // Tab 1: User Directory states
  const [users, setUsers] = useState<IUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const [curateRole, setCurateRole] = useState<'student' | 'verifier' | 'moderator' | 'admin'>('student');
  const [curateStatus, setCurateStatus] = useState<'active' | 'suspended' | 'banned'>('active');
  const [curateReason, setCurateReason] = useState('');

  // Tab 2: Analytics states
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Tab 3: Feedback states
  const [feedbacks, setFeedbacks] = useState<IFeedback[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<IFeedback | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<IFeedback['status']>('open');
  const [feedbackPriority, setFeedbackPriority] = useState<IFeedback['priority']>('medium');
  const [feedbackAdminNotes, setFeedbackAdminNotes] = useState('');
  
  // Tab 4: Monitoring states
  const [monitoringMetrics, setMonitoringMetrics] = useState<{
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
  } | null>(null);
  const [loadingMonitoring, setLoadingMonitoring] = useState(false);
  const [monitoringLastRefreshed, setMonitoringLastRefreshed] = useState<Date | null>(null);

  // Shared actions states
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Authenticate role check
  useEffect(() => {
    if (!loading) {
      if (!fbUser) {
        router.push('/login');
      } else if (currentUser && currentUser.role !== 'admin') {
        router.push('/');
      }
    }
  }, [currentUser, fbUser, loading, router]);

  // Load stats
  const loadStats = async () => {
    if (!fbUser) return;
    setLoadingStats(true);
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch('/api/admin/platform-stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load platform stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Load users
  const loadUsers = async () => {
    if (!fbUser) return;
    setLoadingUsers(true);
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load feedbacks
  const loadFeedbacks = async () => {
    if (!fbUser) return;
    setLoadingFeedback(true);
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch('/api/feedback', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data.feedbacks || []);
      }
    } catch (err) {
      console.error('Failed to load feedbacks:', err);
    } finally {
      setLoadingFeedback(false);
    }
  };

  // Load monitoring metrics
  const loadMonitoring = async () => {
    if (!fbUser) return;
    setLoadingMonitoring(true);
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch('/api/admin/monitoring', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMonitoringMetrics(data.metrics || null);
        setMonitoringLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('Failed to load monitoring metrics:', err);
    } finally {
      setLoadingMonitoring(false);
    }
  };

  // Load data based on tab selection
  useEffect(() => {
    if (fbUser && currentUser && currentUser.role === 'admin') {
      if (activeTab === 'analytics') loadStats();
      if (activeTab === 'users') loadUsers();
      if (activeTab === 'feedback') loadFeedbacks();
      if (activeTab === 'monitoring') loadMonitoring();
    }
  }, [fbUser, currentUser, activeTab]);

  // Curate User Action
  const openCurationModal = (u: IUser) => {
    setSelectedUser(u);
    setCurateRole(u.role);
    setCurateStatus(u.accountStatus);
    setCurateReason('');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleCurationSubmit = async () => {
    if (!fbUser || !selectedUser) return;
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const token = await fbUser.getIdToken();
      const res = await fetch(`/api/admin/users/${selectedUser._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          role: curateRole,
          accountStatus: curateStatus,
          reason: curateReason
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to curate user profile.');
      }

      setSuccessMsg('User profile updated successfully.');
      setSelectedUser(null);
      await loadUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating user.');
    } finally {
      setSubmitting(false);
    }
  };

  // Curate Feedback Action
  const openFeedbackModal = (f: IFeedback) => {
    setSelectedFeedback(f);
    setFeedbackStatus(f.status);
    setFeedbackPriority(f.priority);
    setFeedbackAdminNotes(f.adminNotes || '');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleFeedbackSubmit = async () => {
    if (!fbUser || !selectedFeedback) return;
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const token = await fbUser.getIdToken();
      const res = await fetch(`/api/feedback/${selectedFeedback._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: feedbackStatus,
          priority: feedbackPriority,
          adminNotes: feedbackAdminNotes
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update feedback.');
      }

      setSuccessMsg('Feedback ticket updated successfully.');
      setSelectedFeedback(null);
      await loadFeedbacks();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter users based on query
  const filteredUsers = users.filter(u => {
    const query = searchQuery.toLowerCase();
    const name = (u.displayName || '').toLowerCase();
    const email = u.email.toLowerCase();
    const uid = u._id.toLowerCase();
    return name.includes(query) || email.includes(query) || uid.includes(query);
  });

  const getFeedbackCategoryLabel = (category: string) => {
    switch (category) {
      case 'bug': return '🐛 Bug Report';
      case 'feature_request': return '✨ Feature Request';
      case 'content_quality': return '📝 Content Quality';
      case 'ui_ux': return '🎨 UI/UX';
      case 'performance': return '⚡ Performance';
      default: return '💬 Other';
    }
  };

  if (loading || !fbUser || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
          <p className="text-xs text-text-secondary">Securing administrative console...</p>
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
            <Link href="/dashboard" className="p-2 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="font-display font-black tracking-wider text-sm uppercase bg-gradient-to-r from-purple-400 via-violet-400 to-accent bg-clip-text text-transparent flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-purple-400" />
              <span>Admin Center</span>
            </span>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex space-x-1.5 p-1 bg-bg-secondary/40 border border-border-primary/50 rounded-xl">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'analytics' ? 'bg-accent text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Platform Analytics
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'users' ? 'bg-accent text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
            >
              User Directory
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'feedback' ? 'bg-accent text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Feedback Queue
            </button>
            <button
              onClick={() => setActiveTab('monitoring')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'monitoring' ? 'bg-emerald-500 text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <Activity className="w-3 h-3" />
              System Monitor
            </button>
          </nav>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-full border border-border-primary bg-bg-secondary/40">
              <UserIcon className="w-3.5 h-3.5 text-accent" />
              <span className="hidden sm:inline">{currentUser.displayName || currentUser.email}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 uppercase tracking-wider font-extrabold">{currentUser.role}</span>
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

      {/* Main Panel Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8 relative z-10 space-y-6">
        
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ── Tab 1: Platform Analytics ── */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {loadingStats ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
                <p className="text-xs text-text-secondary">Aggregating platform health statistics...</p>
              </div>
            ) : stats ? (
              <>
                {/* Stats Cards Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/20">
                    <div className="flex items-center justify-between text-text-muted">
                      <span className="text-[10px] font-black uppercase tracking-wider">Total Registrations</span>
                      <Users className="w-4 h-4 text-purple-400" />
                    </div>
                    <h3 className="font-display font-black text-2xl mt-2">{stats.users.total}</h3>
                    <p className="text-[9px] text-text-secondary mt-1">Growth since launch</p>
                  </div>
                  <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/20">
                    <div className="flex items-center justify-between text-text-muted">
                      <span className="text-[10px] font-black uppercase tracking-wider">Daily Active Users</span>
                      <Globe className="w-4 h-4 text-accent" />
                    </div>
                    <h3 className="font-display font-black text-2xl mt-2">{stats.users.dailyActiveUsers}</h3>
                    <p className="text-[9px] text-text-secondary mt-1">Active within 24 hours</p>
                  </div>
                  <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/20">
                    <div className="flex items-center justify-between text-text-muted">
                      <span className="text-[10px] font-black uppercase tracking-wider">Sessions Solved</span>
                      <BookOpen className="w-4 h-4 text-emerald-400" />
                    </div>
                    <h3 className="font-display font-black text-2xl mt-2">{stats.sessions.total}</h3>
                    <p className="text-[9px] text-text-secondary mt-1">{stats.sessions.today} started today</p>
                  </div>
                  <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/20">
                    <div className="flex items-center justify-between text-text-muted">
                      <span className="text-[10px] font-black uppercase tracking-wider">Feedback Recieved</span>
                      <MessageSquare className="w-4 h-4 text-amber-500" />
                    </div>
                    <h3 className="font-display font-black text-2xl mt-2">{stats.feedback.total}</h3>
                    <p className="text-[9px] text-text-secondary mt-1">{stats.feedback.open} tickets remain open</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Plan Distribution Card */}
                  <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/30 space-y-4">
                    <h4 className="font-display font-bold text-sm text-text-primary flex items-center gap-2">
                      <Settings className="w-4 h-4 text-purple-400" /> User Plans Distribution
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(stats.users.byPlan).map(([plan, count]) => {
                        const pct = Math.round((count / (stats.users.total || 1)) * 100);
                        return (
                          <div key={plan} className="space-y-1 text-xs">
                            <div className="flex justify-between font-semibold">
                              <span className="capitalize">{plan === 'beta_pro' ? 'Beta Pro' : plan}</span>
                              <span className="text-text-muted">{count} users ({pct}%)</span>
                            </div>
                            <div className="w-full h-2 bg-bg-primary rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-purple-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Feedback Summary Category Card */}
                  <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/30 space-y-4">
                    <h4 className="font-display font-bold text-sm text-text-primary flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-amber-500" /> Feedback Categories Distribution
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(stats.feedback.byCategory).map(([category, count]) => {
                        const pct = Math.round((count / (stats.feedback.total || 1)) * 100);
                        return (
                          <div key={category} className="space-y-1 text-xs">
                            <div className="flex justify-between font-semibold">
                              <span>{getFeedbackCategoryLabel(category)}</span>
                              <span className="text-text-muted">{count} tickets ({pct}%)</span>
                            </div>
                            <div className="w-full h-2 bg-bg-primary rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-accent"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-16 text-center text-text-secondary text-xs">
                Failed to load stats.
              </div>
            )}
          </div>
        )}

        {/* ── Tab 2: User Directory ── */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-bg-secondary/40 p-5 rounded-2xl border border-border-primary/50">
              <div className="text-left space-y-1">
                <h2 className="font-display font-extrabold text-base">User Accounts Database</h2>
                <p className="text-[10px] text-text-secondary">View user logs, change platform roles, or ban abusive profiles.</p>
              </div>

              <div className="relative w-full sm:max-w-xs">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, or UID..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-border-primary bg-bg-primary/50 text-xs focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                />
              </div>
            </div>

            {/* Table */}
            <div className="border border-border-primary rounded-2xl bg-bg-secondary/20 overflow-hidden">
              {loadingUsers ? (
                <div className="py-20 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
                  <p className="text-xs text-text-secondary">Retrieving user accounts database...</p>
                </div>
              ) : filteredUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-primary bg-bg-secondary/35 text-[10px] uppercase tracking-wider text-text-secondary font-black">
                        <th className="px-6 py-4">User Info</th>
                        <th className="px-6 py-4">Firebase UID</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Plan</th>
                        <th className="px-6 py-4">Account Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-primary/50">
                      {filteredUsers.map((u) => {
                        const statusColor = 
                          u.accountStatus === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                          u.accountStatus === 'suspended' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                          'bg-red-500/10 text-red-500 border-red-500/20';

                        const roleColor =
                          u.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                          u.role === 'moderator' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          u.role === 'verifier' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          'bg-bg-tertiary text-text-secondary border-border-primary';

                        const isSelf = u._id === currentUser._id;

                        return (
                          <tr key={u._id} className="hover:bg-bg-secondary/15 transition-colors text-xs font-semibold">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent uppercase font-bold">
                                  {u.displayName ? u.displayName.charAt(0) : u.email.charAt(0)}
                                </div>
                                <div className="space-y-0.5 text-left">
                                  <p className="text-text-primary leading-none">{u.displayName || 'Explorer Profile'}</p>
                                  <p className="text-[10px] text-text-secondary leading-none">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-mono text-[10px] text-text-muted">{u._id}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded border text-[9px] uppercase font-bold tracking-wide ${roleColor}`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono text-[10px] text-purple-400 capitalize">{u.plan || 'beta_pro'}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded border text-[9px] uppercase font-bold tracking-wide ${statusColor}`}>
                                {u.accountStatus}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                disabled={isSelf}
                                onClick={() => openCurationModal(u)}
                                className="px-3.5 py-1.5 rounded-lg border border-border-primary bg-bg-secondary hover:border-accent/40 text-text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 ml-auto"
                                title={isSelf ? 'Self demotion blocked' : 'Curate account details'}
                              >
                                <Sliders className="w-3.5 h-3.5" />
                                <span>Curate</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-16 text-center text-text-secondary text-xs">
                  No matching user profiles found.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab 3: Feedback Queue ── */}
        {activeTab === 'feedback' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-bg-secondary/40 p-5 rounded-2xl border border-border-primary/50 text-left">
              <div className="space-y-1">
                <h2 className="font-display font-extrabold text-base">Feedback Tickets Queue</h2>
                <p className="text-[10px] text-text-secondary">Acknowledge bugs, read feature suggestions, and respond to content queries.</p>
              </div>
            </div>

            <div className="border border-border-primary rounded-2xl bg-bg-secondary/20 overflow-hidden">
              {loadingFeedback ? (
                <div className="py-20 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
                  <p className="text-xs text-text-secondary">Retrieving feedback logs...</p>
                </div>
              ) : feedbacks.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-primary bg-bg-secondary/35 text-[10px] uppercase tracking-wider text-text-secondary font-black">
                        <th className="px-6 py-4">Sender / Date</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Title & details</th>
                        <th className="px-6 py-4">Priority</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-primary/50">
                      {feedbacks.map((f) => {
                        const statusColor = 
                          f.status === 'open' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                          f.status === 'acknowledged' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                          f.status === 'in_progress' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                          'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';

                        const priorityColor =
                          f.priority === 'critical' ? 'bg-red-500 text-white font-extrabold' :
                          f.priority === 'high' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold' :
                          f.priority === 'medium' ? 'bg-bg-tertiary text-text-secondary border-border-primary' :
                          'bg-bg-tertiary text-text-muted/60 border-border-primary/50';

                        return (
                          <tr key={f._id} className="hover:bg-bg-secondary/15 transition-colors text-xs font-semibold">
                            <td className="px-6 py-4 space-y-0.5 text-left">
                              <p className="text-text-primary truncate max-w-[150px]">{f.userEmail}</p>
                              <p className="text-[9px] text-text-muted">{new Date(f.createdAt).toLocaleString()}</p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-[10px] font-bold">{getFeedbackCategoryLabel(f.category)}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-left space-y-0.5 max-w-[300px]">
                                <p className="text-text-primary font-bold truncate">{f.title}</p>
                                <p className="text-[10px] text-text-secondary line-clamp-1">{f.description}</p>
                                <p className="text-[9px] text-text-muted italic">Submitted from: {f.page}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded border text-[9px] uppercase tracking-wide ${priorityColor}`}>
                                {f.priority}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded border text-[9px] uppercase tracking-wide ${statusColor}`}>
                                {f.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => openFeedbackModal(f)}
                                className="px-3.5 py-1.5 rounded-lg border border-border-primary bg-bg-secondary hover:border-accent/40 text-text-primary transition-all flex items-center gap-1.5 ml-auto font-bold"
                              >
                                <span>Manage</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-16 text-center text-text-secondary text-xs">
                  No feedback tickets currently registered.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab 4: System Monitoring ── */}
        {activeTab === 'monitoring' && (
          <div className="space-y-6">
            {/* Header + Refresh */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-bg-secondary/40 p-5 rounded-2xl border border-border-primary/50 text-left">
              <div className="space-y-1">
                <h2 className="font-display font-extrabold text-base flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  System Health Monitor
                </h2>
                <p className="text-[10px] text-text-secondary">
                  Real-time operational metrics — last 7 days window.
                  {monitoringLastRefreshed && (
                    <span className="ml-2 text-text-muted">Refreshed: {monitoringLastRefreshed.toLocaleTimeString()}</span>
                  )}
                </p>
              </div>
              <button
                onClick={loadMonitoring}
                disabled={loadingMonitoring}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingMonitoring ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {loadingMonitoring ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                <p className="text-xs text-text-secondary">Aggregating system metrics...</p>
              </div>
            ) : monitoringMetrics ? (
              <>
                {/* User Activity Cards */}
                <div>
                  <h3 className="text-[10px] uppercase font-black tracking-widest text-text-muted mb-3 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" /> User Activity (Last 7 Days)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { label: 'Total Registered', value: monitoringMetrics.totalUsers, icon: <Users className="w-4 h-4 text-purple-400" />, color: 'text-purple-400' },
                      { label: 'Active This Week', value: monitoringMetrics.activeUsers, icon: <TrendingUp className="w-4 h-4 text-emerald-400" />, color: 'text-emerald-400' },
                      { label: 'New Signups', value: monitoringMetrics.newUsers, icon: <UserIcon className="w-4 h-4 text-accent" />, color: 'text-accent' },
                    ].map((metric) => (
                      <div key={metric.label} className="p-4 rounded-xl border border-border-primary bg-bg-secondary/20 space-y-2">
                        <div className="flex items-center justify-between text-text-muted">
                          <span className="text-[10px] font-black uppercase tracking-wider">{metric.label}</span>
                          {metric.icon}
                        </div>
                        <p className={`font-display font-black text-2xl ${metric.color}`}>{metric.value.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Session & Learning Cards */}
                <div>
                  <h3 className="text-[10px] uppercase font-black tracking-widest text-text-muted mb-3 flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5" /> Learning Engine Metrics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Sessions Completed', value: monitoringMetrics.sessionsCompleted, icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, color: 'text-emerald-400' },
                      { label: 'Sessions Active', value: monitoringMetrics.sessionsActive, icon: <Clock className="w-4 h-4 text-amber-400" />, color: 'text-amber-400' },
                      { label: 'Questions Solved', value: monitoringMetrics.questionsSolved, icon: <CheckCircle className="w-4 h-4 text-accent" />, color: 'text-accent' },
                      { label: 'Questions Attempted', value: monitoringMetrics.questionsAttempted, icon: <BarChart3 className="w-4 h-4 text-text-secondary" />, color: 'text-text-secondary' },
                    ].map((metric) => (
                      <div key={metric.label} className="p-4 rounded-xl border border-border-primary bg-bg-secondary/20 space-y-2">
                        <div className="flex items-center justify-between text-text-muted">
                          <span className="text-[10px] font-black uppercase tracking-wider">{metric.label}</span>
                          {metric.icon}
                        </div>
                        <p className={`font-display font-black text-2xl ${metric.color}`}>{metric.value.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI & Moderation Cards */}
                <div>
                  <h3 className="text-[10px] uppercase font-black tracking-widest text-text-muted mb-3 flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5" /> AI Usage & Moderation
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { label: 'AI Chat Rooms', value: monitoringMetrics.chatRoomsCount, icon: <MessageSquare className="w-4 h-4 text-violet-400" />, color: 'text-violet-400', desc: 'Sessions with AI queries' },
                      { label: 'Questions Verified', value: monitoringMetrics.verificationThroughput, icon: <Shield className="w-4 h-4 text-emerald-400" />, color: 'text-emerald-400', desc: 'Verified in last 7 days' },
                      { label: 'Moderation Actions', value: monitoringMetrics.moderationThroughput, icon: <AlertOctagon className="w-4 h-4 text-amber-400" />, color: 'text-amber-400', desc: 'Flag/edit/archive events' },
                    ].map((metric) => (
                      <div key={metric.label} className="p-4 rounded-xl border border-border-primary bg-bg-secondary/20 space-y-2">
                        <div className="flex items-center justify-between text-text-muted">
                          <span className="text-[10px] font-black uppercase tracking-wider">{metric.label}</span>
                          {metric.icon}
                        </div>
                        <p className={`font-display font-black text-2xl ${metric.color}`}>{metric.value.toLocaleString()}</p>
                        <p className="text-[9px] text-text-muted">{metric.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Health indicator */}
                <div className="p-4 rounded-2xl border border-border-primary bg-bg-secondary/20 flex items-center gap-4">
                  <Database className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-text-primary">Platform Status</p>
                    <p className="text-[10px] text-text-secondary mt-0.5">
                      Accuracy rate: {monitoringMetrics.questionsAttempted > 0
                        ? `${Math.round((monitoringMetrics.questionsSolved / monitoringMetrics.questionsAttempted) * 100)}%`
                        : 'N/A'
                      } &nbsp;•&nbsp; 
                      Session completion: {(monitoringMetrics.sessionsCompleted + monitoringMetrics.sessionsActive) > 0
                        ? `${Math.round((monitoringMetrics.sessionsCompleted / (monitoringMetrics.sessionsCompleted + monitoringMetrics.sessionsActive)) * 100)}%`
                        : 'N/A'
                      } &nbsp;•&nbsp;
                      7-day user activation: {monitoringMetrics.totalUsers > 0
                        ? `${Math.round((monitoringMetrics.activeUsers / monitoringMetrics.totalUsers) * 100)}%`
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Operational
                  </span>
                </div>
              </>
            ) : (
              <div className="p-16 text-center text-text-secondary text-xs">
                Failed to load monitoring metrics.
              </div>
            )}
          </div>
        )}
      </main>

      {/* Account curation Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="max-w-md w-full bg-bg-secondary border border-border-primary rounded-2xl shadow-xl p-6 space-y-4"
            >
              <div className="flex items-center space-x-2 text-purple-400">
                <Sliders className="w-5 h-5" />
                <h3 className="font-display font-extrabold text-base">Curate Profile Details</h3>
              </div>

              <div className="text-left bg-bg-primary/50 p-3 rounded-xl border border-border-primary/50 text-[10px] space-y-1 font-mono">
                <p><span className="font-bold">EMAIL:</span> {selectedUser.email}</p>
                <p><span className="font-bold">FIREBASE UID:</span> {selectedUser._id}</p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                  {errorMsg}
                </div>
              )}

              {/* Role setting */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Assigned Platform Role</label>
                <select
                  value={curateRole}
                  onChange={(e) => setCurateRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-primary bg-bg-secondary text-xs focus:border-accent outline-none"
                >
                  <option value="student">Student (Standard User)</option>
                  <option value="verifier">Verifier (Dataset Auditor)</option>
                  <option value="moderator">Moderator (Flag Curation)</option>
                  <option value="admin">Administrator (Universal Curation)</option>
                </select>
              </div>

              {/* Account status setting */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Account Permission Status</label>
                <select
                  value={curateStatus}
                  onChange={(e) => setCurateStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-primary bg-bg-secondary text-xs focus:border-accent outline-none"
                >
                  <option value="active">Active (Access Allowed)</option>
                  <option value="suspended">Suspended (Access Temporary Blocked)</option>
                  <option value="banned">Banned (Access Permanently Blocked)</option>
                </select>
              </div>

              {/* Justification input */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Curation Reason (Mandatory for Audit Logs)</label>
                <textarea
                  value={curateReason}
                  onChange={(e) => setCurateReason(e.target.value)}
                  placeholder="Provide audit justification details..."
                  rows={2}
                  className="w-full p-3 rounded-xl border border-border-primary bg-bg-primary text-xs focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-xs font-semibold text-text-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCurationSubmit}
                  disabled={submitting || curateReason.trim().length === 0}
                  className="px-4.5 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Feedback curation Modal */}
      <AnimatePresence>
        {selectedFeedback && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="max-w-md w-full bg-bg-secondary border border-border-primary rounded-2xl shadow-xl p-6 space-y-4"
            >
              <div className="flex items-center space-x-2 text-purple-400">
                <Sliders className="w-5 h-5" />
                <h3 className="font-display font-extrabold text-base">Manage Feedback Ticket</h3>
              </div>

              <div className="text-left bg-bg-primary/50 p-4 rounded-xl border border-border-primary/50 text-xs space-y-2">
                <p><span className="font-bold text-text-muted uppercase text-[9px]">SENDER:</span> <span className="font-semibold">{selectedFeedback.userEmail}</span></p>
                <p><span className="font-bold text-text-muted uppercase text-[9px]">TICKET:</span> <span className="font-semibold">{selectedFeedback.title}</span></p>
                <p><span className="font-bold text-text-muted uppercase text-[9px]">DETAILS:</span> <span className="text-text-secondary">{selectedFeedback.description}</span></p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                  {errorMsg}
                </div>
              )}

              {/* Status setting */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Ticket Status</label>
                <select
                  value={feedbackStatus}
                  onChange={(e) => setFeedbackStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-primary bg-bg-secondary text-xs focus:border-accent outline-none"
                >
                  <option value="open">🟢 Open</option>
                  <option value="acknowledged">🔵 Acknowledged</option>
                  <option value="in_progress">🟡 In Progress</option>
                  <option value="resolved">✅ Resolved</option>
                  <option value="closed">🔒 Closed</option>
                </select>
              </div>

              {/* Priority setting */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Ticket Priority</label>
                <select
                  value={feedbackPriority}
                  onChange={(e) => setFeedbackPriority(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-primary bg-bg-secondary text-xs focus:border-accent outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">🚨 Critical</option>
                </select>
              </div>

              {/* Admin notes input */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Admin Response / Notes</label>
                <textarea
                  value={feedbackAdminNotes}
                  onChange={(e) => setFeedbackAdminNotes(e.target.value)}
                  placeholder="Record internal resolving steps or responses..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-border-primary bg-bg-primary text-xs focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedFeedback(null)}
                  className="px-4 py-2 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-xs font-semibold text-text-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFeedbackSubmit}
                  disabled={submitting}
                  className="px-4.5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Ticket'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-border-primary/50 bg-bg-secondary/20 py-4 text-center text-[10px] text-text-secondary">
        <p>PaperHub Admin Dashboard • Preserving platform accountability.</p>
      </footer>
    </div>
  );
}
