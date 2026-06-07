'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@/components/theme-provider';
import { useAuth } from '@/components/auth-provider';
import { 
  User as UserIcon,
  LogOut,
  Loader2,
  LayoutDashboard,
  Menu,
  Star,
  Trophy,
  ChevronDown,
  Book,
  Activity,
  Heart,
  TrendingUp,
  X,
  Compass,
  FileText,
  Bell,
  Search,
  Moon,
  Sun
} from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { BetaBadge } from '@/components/BetaBadge';
import { PaperHubLogo } from './logo';

interface NavbarProps {
  onMenuToggle?: () => void;
}

export function Navbar({ onMenuToggle }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, fbUser, loading: authLoading, logout } = useAuth();
  const { theme, setTheme, systemTheme } = useTheme();
  
  const [hasLocalParams, setHasLocalParams] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = theme === 'system' ? systemTheme : theme;
  const toggleTheme = () => setTheme(currentTheme === 'light' ? 'dark' : 'light');

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Local Storage parameters
  const [localBranch, setLocalBranch] = useState<string | null>(null);
  const [localSemester, setLocalSemester] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLocalBranch(localStorage.getItem('selectedBranch'));
      setLocalSemester(localStorage.getItem('selectedSemester'));
      const college = localStorage.getItem('selectedCollege');
      const branch = localStorage.getItem('selectedBranch');
      setHasLocalParams(!!(college && branch));
    }
  }, []);

  const activeBranch = user?.profile?.branch || localBranch || '';
  const activeSemester = user?.profile?.semester || (localSemester ? Number(localSemester) : null);
  const activeName = user?.profile?.name || user?.displayName || '';
  const userInitials = activeName 
    ? activeName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() 
    : '?';

  const ordinal = (n: number) => {
    const s = ['th','st','nd','rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/dashboard?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  // Keyboard shortcut listener for Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('search-input-global');
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Notifications states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    if (!fbUser) return;
    const fetchNotifications = async () => {
      try {
        const idToken = await fbUser.getIdToken();
        const res = await fetch('/api/notifications', {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.notifications?.filter((n: any) => !n.isRead).length || 0);
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fbUser]);

  const handleMarkAllRead = async () => {
    if (!fbUser || notifications.length === 0) return;
    try {
      const idToken = await fbUser.getIdToken();
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n._id);
      if (unreadIds.length === 0) return;
      
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ ids: unreadIds })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  const handleLogout = async () => {
    if (logout) await logout();
    router.push('/login');
  };

  const nonDashboardPaths = ['/', '/login', '/onboarding', '/contact', '/privacy', '/terms', '/verify-email'];
  const isDashboardPage = !nonDashboardPaths.includes(pathname);

  if (isDashboardPage) {
    return (
      <header className="px-5 sm:px-7 h-16 border-b border-border-primary/50 flex items-center justify-between gap-4 bg-bg-primary sticky top-0 z-30 shrink-0 w-full">
        {/* Left side: Hamburger menu + Search */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {onMenuToggle && (
            <button 
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary transition-all shrink-0"
              aria-label="Open sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-text-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="search-input-global"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics, chapters or questions..."
              className="w-full pl-10 pr-20 py-2.5 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-[13px] font-medium focus:border-accent/50 focus:ring-2 focus:ring-accent/15 outline-none text-text-primary placeholder:text-text-muted transition-all"
            />
            <kbd className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 items-center px-2 py-0.5 rounded-md bg-bg-tertiary border border-border-primary text-[10px] font-semibold text-text-muted select-none pointer-events-none">
              ⌘K
            </kbd>
          </form>
        </div>

        {/* Right side: Theme + Notifications + Profile Dropdown */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button 
              type="button"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all relative cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent ring-2 ring-bg-primary" />
              )}
            </button>

            {notificationsOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setNotificationsOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-40 w-80 rounded-2xl border border-border-primary bg-bg-secondary shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border-primary">
                    <h4 className="text-sm font-bold text-text-primary">Notifications</h4>
                    {unreadCount > 0 && (
                      <button 
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-semibold text-accent hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                    {notifications.length === 0 ? (
                      <p className="text-[12px] text-text-muted text-center py-8">No notifications yet.</p>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n._id} 
                          className={`p-3 rounded-xl transition-all cursor-default ${n.isRead ? 'hover:bg-bg-tertiary' : 'bg-accent/8 border border-accent/20'}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[12px] font-semibold text-text-primary leading-snug">{n.title}</span>
                            <span className="text-[10px] text-text-muted shrink-0 mt-0.5">
                              {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-border-primary mx-1" />

          {/* Profile Dropdown Button */}
          <div className="relative">
            <button 
              type="button"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2.5 pl-1 pr-3 py-1.5 rounded-xl hover:bg-bg-tertiary transition-all focus:outline-none group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-text-primary font-black text-xs shadow-md shrink-0">
                {userInitials}
              </div>
              <div className="hidden md:flex flex-col items-start select-none min-w-0 text-left">
                <span className="text-[13px] font-semibold text-text-primary leading-tight truncate max-w-[120px]">
                  {activeName || 'Account'}
                </span>
                <span className="text-[10px] text-text-muted leading-tight truncate max-w-[120px]">
                  {!mounted ? 'Student' : (activeBranch && activeSemester
                    ? `${activeBranch} · ${ordinal(activeSemester)} Sem`
                    : activeBranch || 'Student')}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-text-muted hidden md:block group-hover:text-text-secondary transition-colors shrink-0" />
            </button>

            {profileDropdownOpen && (
              <>
                <div className="fixed inset-0 z-35" onClick={() => setProfileDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-40 w-48 rounded-2xl border border-border-primary bg-bg-secondary p-1.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                  <Link 
                    href="/profile"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center px-3 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all"
                  >
                    View Profile
                  </Link>
                  <Link 
                    href="/settings"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center px-3 py-2.5 rounded-xl text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all"
                  >
                    Account Settings
                  </Link>
                  <div className="h-px bg-border-primary my-1" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-500 hover:bg-red-500/8 transition-all text-left cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
    );
  }

  // Marketing Landing / Login Navbar
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md border-b border-border-primary/50 bg-bg-primary/80 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 flex-shrink-0 group">
          <PaperHubLogo className="w-8 h-8" />
          <span className="font-display font-bold text-xl tracking-tight group-hover:text-accent transition-colors duration-200">PaperHub</span>
        </Link>

        {/* Marketing Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-text-secondary">
          <Link href="/#features" className="hover:text-text-primary transition-all">Features</Link>
          <Link href="/#how-it-works" className="hover:text-text-primary transition-all">How it Works</Link>
          <Link href="/#ai-solving" className="hover:text-text-primary transition-all">AI Solver</Link>
          <Link href="/#pricing" className="hover:text-text-primary transition-all flex items-center gap-1.5">
            Pricing <BetaBadge size="sm" />
          </Link>
          {fbUser && (
            <Link href="/billing" className="hover:text-text-primary transition-all">Billing</Link>
          )}
          <Link href="/#faq" className="hover:text-text-primary transition-all">FAQ</Link>
          {(user || hasLocalParams) && (
            <Link href="/dashboard" className="hover:text-text-primary text-accent font-semibold">Dashboard</Link>
          )}
        </nav>
        
        <div className="flex items-center space-x-4">
          {authLoading ? (
            <Loader2 className="w-4 h-4 text-accent animate-spin" />
          ) : fbUser ? (
            <div className="flex items-center space-x-3.5">
              {/* Role badge */}
              {user && (user.role === 'verifier' || user.role === 'admin' || user.role === 'moderator') && (
                <Link 
                  href="/verifier" 
                  className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 hover:bg-emerald-500/20 transition-all hidden sm:inline-block"
                >
                  Verifier
                </Link>
              )}
              
              {/* Profile Pill */}
              <Link 
                href="/dashboard"
                className="flex items-center space-x-2 text-xs font-semibold pl-1.5 pr-3 py-1.5 rounded-full border border-border-primary bg-bg-secondary/40 hover:bg-bg-secondary transition-all"
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-text-primary font-black text-[9px] shadow-sm shrink-0">
                  {userInitials}
                </div>
                <span className="hidden sm:inline">
                  {user ? (user.profile?.name || user.displayName || 'Explorer') : (fbUser.displayName || fbUser.email?.split('@')[0] || 'Explorer')}
                </span>
              </Link>

              <button 
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              {(user || hasLocalParams) && (
                <Link 
                  href="/dashboard"
                  className="text-xs font-semibold hover:text-accent transition-colors"
                >
                  Dashboard
                </Link>
              )}
              <Link 
                href="/login" 
                className="text-xs font-bold px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover shadow-sm transition-all"
              >
                Sign In
              </Link>
            </div>
          )}

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
