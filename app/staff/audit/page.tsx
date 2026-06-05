'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { 
  Loader2, 
  ArrowLeft, 
  BookMarked,
  Search,
  Filter,
  LogOut,
  Calendar,
  User as UserIcon,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { motion } from 'framer-motion';

interface IAuditLog {
  _id: string;
  questionId?: string;
  userId?: {
    _id: string;
    displayName?: string;
    email: string;
    role: string;
  } | string;
  action: string;
  targetType: string;
  targetId: string;
  previousState?: string;
  newState?: string;
  details?: string;
  timestamp: string;
}

export default function AuditLogsDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-secondary">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
          <p className="text-sm">Loading audit logs...</p>
        </div>
      </div>
    }>
      <AuditLogsContent />
    </Suspense>
  );
}

function AuditLogsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, fbUser, loading, logout } = useAuth();

  const [logs, setLogs] = useState<IAuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Filters
  const [filterAction, setFilterAction] = useState(searchParams.get('action') || 'all');
  const [filterTarget, setFilterTarget] = useState(searchParams.get('targetType') || 'all');
  const [actorQuery, setActorQuery] = useState('');

  // Authenticate role check
  useEffect(() => {
    if (!loading) {
      if (!fbUser) {
        router.push('/login');
      } else if (user && user.role !== 'verifier' && user.role !== 'moderator' && user.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, fbUser, loading, router]);

  // Load audit logs
  const fetchLogs = async () => {
    if (!fbUser) return;
    setLoadingLogs(true);
    try {
      const token = await fbUser.getIdToken();
      let queryUrl = '/api/staff/audit-logs?';
      if (filterAction !== 'all') queryUrl += `action=${filterAction}&`;
      if (filterTarget !== 'all') queryUrl += `targetType=${filterTarget}&`;

      const res = await fetch(queryUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (fbUser && user && ['verifier', 'moderator', 'admin'].includes(user.role)) {
      fetchLogs();
    }
  }, [fbUser, user, filterAction, filterTarget]);

  // Client-side actor query filter
  const filteredLogs = logs.filter(l => {
    if (!actorQuery) return true;
    const actor = typeof l.userId === 'object' ? l.userId : null;
    const actorEmail = actor ? actor.email.toLowerCase() : '';
    const actorName = actor && actor.displayName ? actor.displayName.toLowerCase() : '';
    const actorId = actor ? actor._id.toLowerCase() : String(l.userId || '').toLowerCase();
    const query = actorQuery.toLowerCase();
    return actorEmail.includes(query) || actorName.includes(query) || actorId.includes(query);
  });

  if (loading || !fbUser || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
          <p className="text-xs text-text-secondary">Securing audit log viewer...</p>
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
            <span className="font-display font-black tracking-wider text-sm uppercase bg-gradient-to-r from-sky-400 via-teal-400 to-accent bg-clip-text text-transparent flex items-center gap-1.5">
              <BookMarked className="w-4 h-4 text-sky-400" />
              <span>Staff Audit Log Viewer</span>
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-full border border-border-primary bg-bg-secondary/40">
              <UserIcon className="w-3.5 h-3.5 text-accent" />
              <span>{user.displayName || user.email}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent uppercase tracking-wider font-extrabold">{user.role}</span>
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
        
        {/* Header & Filter Controls */}
        <div className="bg-bg-secondary/40 p-5 rounded-2xl border border-border-primary/50 space-y-4">
          <div className="text-left space-y-1">
            <h2 className="font-display font-extrabold text-base">Administrative Action History</h2>
            <p className="text-[10px] text-text-secondary">Verify updates, flags, role changes, and account suspensions in chronological order.</p>
          </div>

          {/* Filtering row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-text-muted" />
                <span className="text-[10px] uppercase font-bold text-text-secondary">Filter Action:</span>
              </div>
              <select
                value={filterAction}
                onChange={(e) => {
                  setFilterAction(e.target.value);
                  router.replace(`/staff/audit?action=${e.target.value}&targetType=${filterTarget}`);
                }}
                className="px-3 py-1.5 rounded-xl border border-border-primary bg-bg-secondary text-xs focus:border-accent"
              >
                <option value="all">All Actions</option>
                <option value="verify">Verifications</option>
                <option value="flag">Flags</option>
                <option value="edit">Edits</option>
                <option value="suspend">Suspensions</option>
                <option value="ban">Bans</option>
                <option value="reactivate">Reactivations</option>
                <option value="role_change">Role Changes</option>
                <option value="archive">Archives</option>
                <option value="restore">Restores</option>
              </select>

              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-[10px] uppercase font-bold text-text-secondary">Filter Target:</span>
              </div>
              <select
                value={filterTarget}
                onChange={(e) => {
                  setFilterTarget(e.target.value);
                  router.replace(`/staff/audit?action=${filterAction}&targetType=${e.target.value}`);
                }}
                className="px-3 py-1.5 rounded-xl border border-border-primary bg-bg-secondary text-xs focus:border-accent"
              >
                <option value="all">All Targets</option>
                <option value="question">Question Curations</option>
                <option value="user">User Status updates</option>
              </select>
            </div>

            <div className="relative w-full md:max-w-xs">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={actorQuery}
                onChange={(e) => setActorQuery(e.target.value)}
                placeholder="Search actor name, email, or ID..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-border-primary bg-bg-primary/50 text-xs focus:border-accent outline-none"
              />
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="border border-border-primary rounded-2xl bg-bg-secondary/20 overflow-hidden">
          {loadingLogs ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
              <p className="text-xs text-text-secondary">Retrieving logs database...</p>
            </div>
          ) : filteredLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-primary bg-bg-secondary/35 text-[10px] uppercase tracking-wider text-text-secondary font-black">
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Actor Details</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Target Entity</th>
                    <th className="px-6 py-4">State Transition</th>
                    <th className="px-6 py-4">Log Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-primary/50">
                  {filteredLogs.map((log) => {
                    const actor = typeof log.userId === 'object' ? log.userId : null;
                    const actorName = actor ? actor.displayName || 'Staff Member' : 'System';
                    const actorEmail = actor ? actor.email : String(log.userId || 'System');
                    const actorRole = actor ? actor.role : 'system';

                    const actionColor = 
                      ['verify', 'reactivate'].includes(log.action) ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      ['flag', 'suspend', 'ban'].includes(log.action) ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      ['archive'].includes(log.action) ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                      'bg-bg-tertiary text-text-secondary border-border-primary';

                    return (
                      <tr key={log._id} className="hover:bg-bg-secondary/15 transition-colors text-xs font-semibold">
                        <td className="px-6 py-4 text-text-muted font-mono text-[10px] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-0.5 text-left">
                            <p className="text-text-primary leading-none">{actorName}</p>
                            <p className="text-[10px] text-text-secondary leading-none">{actorEmail}</p>
                            <span className="text-[8px] uppercase tracking-widest font-extrabold text-accent leading-none block pt-0.5">{actorRole}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded border text-[9px] uppercase font-bold tracking-wide ${actionColor}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-0.5 text-left">
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-bg-secondary text-text-secondary border border-border-primary">
                              {log.targetType}
                            </span>
                            <p className="font-mono text-[9px] text-text-muted pt-1 select-all">{log.targetId}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1 font-mono text-[9px] text-left text-text-secondary">
                            {log.previousState && <p className="leading-none"><span className="text-red-400">OLD:</span> {log.previousState}</p>}
                            {log.newState && <p className="leading-none"><span className="text-emerald-400">NEW:</span> {log.newState}</p>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-left text-text-primary max-w-xs break-words font-normal">
                          {log.details || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-16 text-center text-text-secondary text-xs">
              No audit logs match these parameters.
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-primary/50 bg-bg-secondary/20 py-4 text-center text-[10px] text-text-secondary">
        <p>PaperHub Accountability System • Chronological Action History.</p>
      </footer>
    </div>
  );
}
