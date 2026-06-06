'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { 
  Home, 
  BookOpen, 
  Edit3, 
  FileText, 
  Bookmark, 
  Activity, 
  FileSignature, 
  Sparkles, 
  X,
  Crown,
  Flame,
  Check
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  streakCount?: number;
  streakDays?: { label: string; active: boolean }[];
}

export function Sidebar({ isOpen, onClose, streakCount: streakCountProp, streakDays: streakDaysProp }: SidebarProps) {
  const pathname = usePathname();
  const { user, fbUser } = useAuth();

  const [fetchedStreakCount, setFetchedStreakCount] = useState<number>(0);
  const [fetchedStreakDays, setFetchedStreakDays] = useState<{ label: string; active: boolean }[] | null>(null);

  useEffect(() => {
    if (streakCountProp !== undefined || streakDaysProp !== undefined) return;
    if (!fbUser) return;

    let cancelled = false;
    fbUser.getIdToken().then((token: string) =>
      fetch('/api/users/analytics', { headers: { Authorization: `Bearer ${token}` } })
    ).then((res: any) => res.ok ? res.json() : null).then((data: any) => {
      if (!cancelled && data?.metrics) {
        setFetchedStreakCount(data.metrics.streakCount ?? 0);
        if (Array.isArray(data.metrics.streakDays)) {
          setFetchedStreakDays(data.metrics.streakDays);
        }
      }
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [fbUser, streakCountProp, streakDaysProp]);

  const streakCount = streakCountProp ?? fetchedStreakCount;
  const streakDays = streakDaysProp ?? fetchedStreakDays;

  const days = (streakDays && streakDays.length === 7)
    ? streakDays
    : ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(label => ({ label, active: false }));

  const menuItems = [
    { name: 'Home', icon: Home, path: '/dashboard' },
    { name: 'Practice', icon: Edit3, path: '/dashboard#practice' },
    { name: 'Tests', icon: FileText, path: '/tests' },
    { name: 'Bookmarks', icon: Bookmark, path: '/bookmarks' },
    { name: 'My Progress', icon: Activity, path: '/analytics' },
    { name: 'Notes', icon: FileSignature, path: '/notes' },
    { name: 'AI Assistant', icon: Sparkles, path: '/dashboard#ai-assistant' },
  ];

  if (user && ['verifier', 'moderator', 'admin'].includes(user.role)) {
    menuItems.push({ name: 'Verifier Workspace', icon: FileText, path: '/verifier' });
  }
  if (user && ['moderator', 'admin'].includes(user.role)) {
    menuItems.push({ name: 'Moderator Panel', icon: FileText, path: '/moderator' });
  }
  if (user && user.role === 'admin') {
    menuItems.push({ name: 'User Curation', icon: FileText, path: '/admin' });
    menuItems.push({ name: 'Monitoring Dashboard', icon: Activity, path: '/admin/monitoring' });
  }

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 p-5 flex flex-col overflow-hidden
        transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:z-30
        bg-bg-secondary border-r border-border-primary
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>

        {/* Scrollable top: logo + nav */}
        <div className="flex-1 overflow-y-auto scrollbar-none min-h-0 space-y-6">

          {/* Logo */}
          <div className="flex items-center justify-between px-1">
            <Link href="/dashboard" className="flex items-center space-x-3 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 dark:from-purple-600 dark:to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md">
                P
              </div>
              <span className="font-display font-extrabold text-lg tracking-tight text-text-primary group-hover:text-accent transition-colors">
                PaperHub
              </span>
            </Link>
            <button 
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));
              return (
                <Link 
                  key={item.name}
                  href={item.path}
                  className={`
                    flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 group
                    ${isActive 
                      ? 'sidebar-active bg-accent/10 border border-accent/25 text-accent dark:bg-purple-950/30 dark:border-purple-500/20 dark:text-purple-400'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border border-transparent'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-accent dark:text-purple-400' : 'text-text-muted group-hover:text-text-primary'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Pinned footer */}
        <div className="shrink-0 space-y-3 pt-4">

          {/* Upgrade Card */}
          <div className="upgrade-card p-4 rounded-2xl border space-y-2.5
            bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20
            dark:from-[#1b1935] dark:to-[#121022] dark:border-purple-500/15">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500 fill-amber-500/20" />
              <span className="text-xs font-bold text-text-primary">Upgrade to Premium</span>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Unlock all features and boost your preparation.
            </p>
            <Link 
              href="/pricing" 
              className="block w-full py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-center text-xs font-bold transition-all shadow-sm"
            >
              Upgrade Now &gt;
            </Link>
          </div>

          {/* Streak Card */}
          <div className="streak-card p-4 rounded-2xl border space-y-2.5
            bg-bg-primary border-border-primary
            dark:bg-[#0e0d22] dark:border-border-primary/40">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-bold text-text-primary">Streak</span>
            </div>
            <div>
              <h4 className="font-display font-black text-xl text-text-primary leading-none">
                {streakCount > 0 ? `${streakCount} Days` : '—'}
              </h4>
              <p className="text-[10px] text-text-muted mt-0.5">
                {streakCount > 0 ? 'Keep it up!' : 'Start your streak today!'}
              </p>
            </div>
            {/* Day indicators */}
            <div className="flex items-center justify-between">
              {days.map((day, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all
                    ${day.active
                      ? 'bg-emerald-500 border-transparent text-white'
                      : 'bg-bg-tertiary border-border-primary text-text-muted'
                    }`}
                  >
                    {day.active && <Check className="w-2.5 h-2.5 stroke-[3px]" />}
                  </div>
                  <span className="text-[9px] font-bold text-text-muted">{day.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </aside>
      {/* Desktop spacer to prevent layout shift with fixed sidebar */}
      <div className="hidden lg:block w-64 shrink-0" />
    </>
  );
}
