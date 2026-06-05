'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
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
  FileText
} from 'lucide-react';
import { ThemeToggle } from './theme-toggle';

interface NavbarProps {
  onMenuToggle?: () => void;
}

export function Navbar({ onMenuToggle }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, fbUser, loading: authLoading, logout } = useAuth();
  
  // States for navbar widgets
  const [streamDropdownOpen, setStreamDropdownOpen] = useState(false);
  const [leagueModalOpen, setLeagueModalOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<'today' | 'week'>('today');
  
  const [selectedStream, setSelectedStream] = useState('Engineering');
  const [hasLocalParams, setHasLocalParams] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const college = localStorage.getItem('selectedCollege');
      const branch = localStorage.getItem('selectedBranch');
      const stream = localStorage.getItem('selectedStream') || 'Engineering';
      setHasLocalParams(!!(college && branch));
      setSelectedStream(stream);
    }
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const updateStream = (stream: string) => {
    setSelectedStream(stream);
    localStorage.setItem('selectedStream', stream);
    setStreamDropdownOpen(false);
    // Refresh page / state
    router.refresh();
  };

  const isDashboardPage = pathname !== '/' && pathname !== '/login' && pathname !== '/onboarding';

  // Gamification mock database fallbacks
  const xp = user?.engagement?.totalXp || 120;
  const streak = user?.engagement?.streakCount || 2;
  const dailySolved = user?.engagement?.dailyGoalSolved || 0;
  const dailyTarget = user?.engagement?.dailyGoalTarget || 30;
  const currentLeague = user?.engagement?.league || 'beginner';

  // Calculate league progression
  const leagueTiers = [
    { name: 'beginner', points: 0, nextPoints: 300, badge: '⭐' },
    { name: 'bronze', points: 300, nextPoints: 700, badge: '🥉' },
    { name: 'silver', points: 700, nextPoints: 1200, badge: '🥈' },
    { name: 'gold', points: 1200, nextPoints: 2000, badge: '🥇' },
    { name: 'diamond', points: 2000, nextPoints: 3000, badge: '💎' },
    { name: 'elite', points: 3000, nextPoints: 99999, badge: '🏆' }
  ];

  const activeLeagueInfo = leagueTiers.find(l => l.name === currentLeague) || leagueTiers[0];
  const pointsRemaining = activeLeagueInfo.nextPoints - xp;
  const progressPercent = Math.min(100, Math.max(0, ((xp - activeLeagueInfo.points) / (activeLeagueInfo.nextPoints - activeLeagueInfo.points)) * 100));

  // Mock leaderboard list
  const mockLeaderboard = [
    { rank: 1, name: 'ARITRA', xp: 2530, avatar: '👾', isUser: false },
    { rank: 2, name: 'Mahesh', xp: 2360, avatar: '🦊', isUser: false },
    { rank: 3, name: 'ABHINAV', xp: 1540, avatar: '🦁', isUser: false },
    { rank: 4, name: 'heet', xp: 1380, avatar: '🤖', isUser: false },
    { rank: 5, name: 'jayesh', xp: 1340, avatar: '🐼', isUser: false },
    { rank: 6, name: 'bhargav', xp: 1305, avatar: '🐨', isUser: false },
    { rank: 7, name: 'Bhairavi', xp: 1280, avatar: '🐯', isUser: false },
  ];

  if (isDashboardPage) {
    // Post-auth Dashboard Header
    return (
      <header className="sticky top-0 z-30 border-b border-border-primary/50 bg-bg-primary/80 backdrop-blur-md transition-all duration-300">
        <div className="mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Mobile Hamburger menu */}
            <button 
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Stream Selector Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setStreamDropdownOpen(!streamDropdownOpen)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border-primary bg-bg-secondary/40 hover:bg-bg-secondary text-xs font-bold transition-all text-text-primary"
              >
                <span>{selectedStream === 'Engineering' ? 'B.Tech Engineering' : 'B.Sc Medical'}</span>
                <ChevronDown className="w-3 h-3 text-text-muted" />
              </button>

              {streamDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setStreamDropdownOpen(false)} />
                  <div className="absolute left-0 mt-2 z-40 w-48 rounded-2xl border border-border-primary bg-bg-secondary p-2.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-3.5 py-1.5">Change field</h4>
                    <button 
                      onClick={() => updateStream('Engineering')}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all ${selectedStream === 'Engineering' ? 'bg-accent/10 text-accent' : 'hover:bg-bg-tertiary text-text-secondary'}`}
                    >
                      <span>Engineering</span>
                      {selectedStream === 'Engineering' && <span>✓</span>}
                    </button>
                    <button 
                      onClick={() => updateStream('Medical')}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all ${selectedStream === 'Medical' ? 'bg-accent/10 text-accent' : 'hover:bg-bg-tertiary text-text-secondary'}`}
                    >
                      <span>Medical</span>
                      {selectedStream === 'Medical' && <span>✓</span>}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Daily Goal Quick Stat */}
            <div className="hidden md:flex items-center space-x-2 text-xs font-medium text-text-secondary border-l border-border-primary/50 pl-4">
              <span>Goal:</span>
              <span className="font-bold text-text-primary">{dailySolved}/{dailyTarget} Qs</span>
              <div className="w-16 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent transition-all duration-300" 
                  style={{ width: `${Math.min(100, (dailySolved / dailyTarget) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* League Star Badge */}
            <button 
              onClick={() => setLeagueModalOpen(true)}
              className="p-2.5 rounded-xl border border-border-primary bg-bg-secondary/40 hover:bg-bg-secondary text-text-secondary transition-all"
              title="League Progress"
            >
              <Star className="w-4 h-4 text-amber-500 fill-amber-500/20" />
            </button>

            {/* Leaderboard Trophy Badge */}
            <button 
              onClick={() => setLeaderboardOpen(true)}
              className="p-2.5 rounded-xl border border-border-primary bg-bg-secondary/40 hover:bg-bg-secondary text-text-secondary transition-all"
              title="View Leaderboard"
            >
              <Trophy className="w-4 h-4 text-purple-500" />
            </button>

            {/* Profile Pill */}
            <Link 
              href="/profile"
              className="flex items-center space-x-2 text-xs font-bold px-3.5 py-1.5 rounded-full border border-border-primary bg-bg-secondary/40 hover:bg-bg-secondary transition-all"
            >
              <UserIcon className="w-3.5 h-3.5 text-accent" />
              <span className="hidden sm:inline">
                {user ? (user.profile?.name || user.displayName || 'Explorer') : (fbUser?.displayName || fbUser?.email?.split('@')[0] || 'Explorer')}
              </span>
            </Link>
          </div>
        </div>

        {/* ── League Progress Modal ── */}
        {leagueModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setLeagueModalOpen(false)} />
            <div className="relative w-full max-w-md rounded-2xl border border-border-primary bg-bg-secondary p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center space-y-6">
              <button 
                onClick={() => setLeagueModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-bg-tertiary text-text-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="space-y-2">
                <span className="text-4xl">{activeLeagueInfo.badge}</span>
                <h3 className="font-display font-black text-xl text-text-primary capitalize">{currentLeague} League</h3>
                <p className="text-xs text-text-secondary">Based on this week's study progress and quiz activity</p>
              </div>

              {/* Progress track */}
              <div className="space-y-2.5 text-left">
                <div className="flex justify-between text-[11px] font-bold text-text-secondary">
                  <span>Progress ({xp} XP)</span>
                  {currentLeague !== 'elite' && <span>{pointsRemaining} XP to Next Tier</span>}
                </div>
                <div className="w-full h-2.5 bg-bg-tertiary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {/* Milestone Indicators */}
                <div className="flex justify-between text-[9px] font-black uppercase text-text-muted mt-1">
                  <span>Beginner</span>
                  <span>Bronze (300)</span>
                  <span>Silver (700)</span>
                  <span>Gold (1200)</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-accent/15 bg-accent/5 text-xs text-accent font-semibold leading-relaxed">
                {currentLeague !== 'elite' 
                  ? `Almost there! Solve subjects and practice to gather ${pointsRemaining} more XP points to reach next League.`
                  : 'You have attained the ultimate tier! Keep studying to maintain your position on the leaderboard.'
                }
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <button 
                  onClick={() => { setLeagueModalOpen(false); setLeaderboardOpen(true); }}
                  className="w-full py-2.5 rounded-xl bg-accent text-white hover:bg-accent-hover text-xs font-bold transition-all shadow-md"
                >
                  View Leaderboard
                </button>
                <button 
                  onClick={() => { setLeagueModalOpen(false); router.push('/profile'); }}
                  className="w-full py-2.5 rounded-xl border border-border-primary hover:bg-bg-tertiary text-text-secondary text-xs font-semibold transition-all"
                >
                  View My Achievements
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Leaderboard Right Drawer ── */}
        {leaderboardOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={() => setLeaderboardOpen(false)} />
            
            <div className="absolute inset-y-0 right-0 max-w-full flex">
              <div className="w-screen max-w-md bg-bg-secondary border-l border-border-primary shadow-2xl p-6 flex flex-col justify-between animate-in slide-in-from-right duration-200">
                <div className="space-y-6 flex-grow overflow-y-auto">
                  {/* Drawer Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <Trophy className="w-5 h-5 text-purple-500" />
                      <h3 className="font-display font-black text-lg">Leaderboard</h3>
                    </div>
                    <button 
                      onClick={() => setLeaderboardOpen(false)}
                      className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-secondary transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* League Banner */}
                  <div className="p-4 rounded-2xl border border-border-primary bg-bg-primary/50 text-center space-y-1">
                    <div className="text-xl">🏆</div>
                    <h4 className="font-display font-bold text-xs uppercase tracking-widest text-text-primary">Beginner League</h4>
                    <p className="text-[10px] text-text-secondary">Top performers of this tier. 3 days left this week.</p>
                  </div>

                  {/* Daily / Weekly Tabs */}
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-bg-tertiary/60 border border-border-primary/50">
                    <button 
                      onClick={() => setLeaderboardTab('today')}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${leaderboardTab === 'today' ? 'bg-bg-secondary text-text-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                      Today
                    </button>
                    <button 
                      onClick={() => setLeaderboardTab('week')}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${leaderboardTab === 'week' ? 'bg-bg-secondary text-text-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                      This Week
                    </button>
                  </div>

                  {/* Leaderboard ranking list */}
                  <div className="space-y-2">
                    {mockLeaderboard.map((item) => (
                      <div 
                        key={item.rank}
                        className={`
                          flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200
                          ${item.rank <= 3 ? 'bg-bg-primary/50 border-purple-500/10' : 'bg-bg-primary/20 border-border-primary/50'}
                        `}
                      >
                        <div className="flex items-center space-x-3.5">
                          <span className={`w-5 font-display font-black text-xs text-center ${item.rank === 1 ? 'text-amber-500' : item.rank === 2 ? 'text-text-muted' : 'text-text-secondary'}`}>
                            {item.rank}
                          </span>
                          <span className="text-base select-none">{item.avatar}</span>
                          <span className="text-xs font-bold text-text-primary">{item.name}</span>
                        </div>
                        <span className="text-xs font-bold text-accent">{item.xp} XP</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sticky current user ranking bar */}
                <div className="border-t border-border-primary pt-4 mt-6">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-accent/20 bg-accent/5">
                    <div className="flex items-center space-x-3.5">
                      <span className="font-display font-black text-xs text-accent">8</span>
                      <span className="text-base">👾</span>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-text-primary">You</span>
                        <span className="text-[9px] text-text-muted">Beginner League</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-accent">{xp} XP</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>
    );
  }

  // Marketing Landing / Login Navbar
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md border-b border-border-primary/50 bg-bg-primary/80 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2 flex-shrink-0 group">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-display font-bold text-lg shadow-md shadow-accent/20 group-hover:scale-105 transition-transform duration-200">
            P
          </div>
          <span className="font-display font-bold text-xl tracking-tight group-hover:text-accent transition-colors duration-200">PaperHub</span>
        </Link>

        {/* Marketing Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-text-secondary">
          <Link href="/#features" className="hover:text-text-primary transition-all">Features</Link>
          <Link href="/#blueprint" className="hover:text-text-primary transition-all">Blueprint</Link>
          <Link href="/#ai-solving" className="hover:text-text-primary transition-all">AI Assistant</Link>
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
                className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-full border border-border-primary bg-bg-secondary/40 hover:bg-bg-secondary transition-all"
              >
                <UserIcon className="w-3.5 h-3.5 text-accent" />
                <span className="hidden sm:inline">
                  {user ? (user.profile?.name || user.displayName || 'Explorer') : (fbUser.displayName || fbUser.email?.split('@')[0] || 'Explorer')}
                </span>
              </Link>

              <button 
                onClick={handleLogout}
                className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 transition-colors"
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
