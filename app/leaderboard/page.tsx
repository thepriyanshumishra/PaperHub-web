'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Navbar } from '@/components/navbar';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { 
  Award, 
  Flame, 
  Zap, 
  Loader2, 
  Trophy,
  Sparkles,
  ChevronRight,
  Globe,
  Building2,
  GraduationCap,
  Network
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function LeaderboardPage() {
  const { user, fbUser, loading: authLoading } = useAuth();
  const router = useRouter();

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scope, setScope] = useState<'university' | 'college' | 'course' | 'branch'>('university');
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    if (!fbUser) return;
    setLoading(true);
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch(`/api/leaderboard?scope=${scope}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setLeaderboardData(data.leaderboard || []);
        setUserRank(data.userRank || null);
      }
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchLeaderboard();
    }
  }, [scope, authLoading, fbUser]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  const activeScopeName = scope.toUpperCase();

  // Separate top 3
  const topThree = leaderboardData.slice(0, 3);
  const others = leaderboardData.slice(3);

  const getTrophyColor = (rank: number) => {
    if (rank === 0) return 'text-yellow-400'; // Gold
    if (rank === 1) return 'text-slate-300';  // Silver
    if (rank === 2) return 'text-amber-600';  // Bronze
    return 'text-text-muted';
  };

  return (
    <div className="flex min-h-screen bg-bg-primary text-text-primary overflow-hidden relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-grow flex flex-col min-h-screen overflow-y-auto z-10">
        <Navbar onMenuToggle={() => setSidebarOpen(true)} />

        <main className="flex-grow max-w-4xl w-full mx-auto px-6 py-8 space-y-8">
          {/* Header section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-display text-2xl font-black tracking-tight leading-none flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <span>PaperHub Leaderboards</span>
              </h2>
              <p className="text-xs text-text-secondary">
                Compete with classmates and rank higher based on accumulated XP.
              </p>
            </div>

            {userRank && (
              <div className="px-4 py-2.5 rounded-xl border border-accent/20 bg-accent/5 backdrop-blur-sm shrink-0 flex items-center gap-2">
                <Award className="w-4 h-4 text-accent animate-pulse" />
                <span className="text-xs font-bold">Your Rank: <span className="text-accent text-sm font-black">#{userRank}</span></span>
              </div>
            )}
          </div>

          {/* Scope tabs */}
          <div className="flex items-center gap-2 border-b border-border-primary/45 pb-3 overflow-x-auto scrollbar-none">
            {[
              { id: 'university', label: 'University', icon: Globe },
              { id: 'college', label: 'College', icon: Building2 },
              { id: 'course', label: 'Course', icon: GraduationCap },
              { id: 'branch', label: 'Branch', icon: Network }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setScope(tab.id as any)}
                  className={`
                    flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0
                    ${scope === tab.id 
                      ? 'bg-accent/10 border-accent/25 text-accent' 
                      : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/40'
                    }
                  `}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
          ) : leaderboardData.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-border-primary rounded-2xl bg-bg-secondary/10 space-y-3.5">
              <Trophy className="w-8 h-8 text-text-muted mx-auto" />
              <p className="text-sm font-bold text-text-secondary">No ranked students found in this scope.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Podium for top 3 */}
              {topThree.length > 0 && (
                <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto pt-6 pb-2 items-end">
                  {/* Rank 2 */}
                  {topThree[1] && (
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl border border-border-primary bg-bg-secondary/25 text-center flex flex-col items-center gap-2 h-44 justify-end shadow-sm"
                    >
                      <div className="w-12 h-12 rounded-full bg-slate-400/10 border border-slate-400/20 flex items-center justify-center text-xl shadow-sm relative">
                        🥈
                      </div>
                      <h4 className="font-display font-extrabold text-xs text-text-primary line-clamp-1">
                        {topThree[1].profile?.name || topThree[1].displayName || 'Explorer'}
                      </h4>
                      <p className="font-display font-black text-xs text-slate-300 leading-none">{topThree[1].engagement.totalXp} XP</p>
                      <span className="text-[8px] uppercase tracking-wider font-extrabold text-text-muted">2nd Place</span>
                    </motion.div>
                  )}

                  {/* Rank 1 */}
                  {topThree[0] && (
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 text-center flex flex-col items-center gap-2.5 h-52 justify-end relative shadow-lg shadow-yellow-500/5"
                    >
                      <div className="absolute top-3 right-3 text-yellow-400 animate-pulse">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="w-16 h-16 rounded-full bg-yellow-400/10 border border-yellow-400/25 flex items-center justify-center text-2xl shadow-md shadow-yellow-400/5 relative">
                        👑
                      </div>
                      <h4 className="font-display font-black text-sm text-text-primary line-clamp-1">
                        {topThree[0].profile?.name || topThree[0].displayName || 'Explorer'}
                      </h4>
                      <p className="font-display font-black text-sm text-yellow-400 leading-none">{topThree[0].engagement.totalXp} XP</p>
                      <span className="text-[9px] uppercase tracking-widest font-black text-yellow-500">1st Place</span>
                    </motion.div>
                  )}

                  {/* Rank 3 */}
                  {topThree[2] && (
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl border border-border-primary bg-bg-secondary/25 text-center flex flex-col items-center gap-2 h-40 justify-end shadow-sm"
                    >
                      <div className="w-10 h-10 rounded-full bg-amber-600/10 border border-amber-600/20 flex items-center justify-center text-lg shadow-sm relative">
                        🥉
                      </div>
                      <h4 className="font-display font-extrabold text-xs text-text-primary line-clamp-1">
                        {topThree[2].profile?.name || topThree[2].displayName || 'Explorer'}
                      </h4>
                      <p className="font-display font-black text-xs text-amber-600 leading-none">{topThree[2].engagement.totalXp} XP</p>
                      <span className="text-[8px] uppercase tracking-wider font-extrabold text-text-muted">3rd Place</span>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Leaderboard list */}
              <div className="p-4.5 rounded-2xl border border-border-primary bg-bg-secondary/35 backdrop-blur-sm space-y-2.5">
                <div className="flex items-center justify-between text-[9px] uppercase font-black text-text-muted tracking-wider px-3 border-b border-border-primary/30 pb-2">
                  <span>Rank & Student</span>
                  <div className="flex items-center gap-12">
                    <span>Streak</span>
                    <span>Experience</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {leaderboardData.map((student: any, idx: number) => {
                    const isSelf = student._id === user?._id;
                    const displayRank = idx + 1;
                    return (
                      <div 
                        key={student._id}
                        className={`
                          p-3 rounded-xl flex items-center justify-between text-xs transition-all border
                          ${isSelf 
                            ? 'bg-accent/10 border-accent/25 shadow-sm shadow-accent/5' 
                            : 'bg-bg-primary/40 border-border-primary hover:bg-bg-primary/80'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3.5">
                          <span className={`w-5 text-center font-display font-black text-xs ${displayRank <= 3 ? 'text-accent' : 'text-text-muted'}`}>
                            #{displayRank}
                          </span>
                          <div className="w-7 h-7 rounded-full bg-bg-tertiary border border-border-primary flex items-center justify-center text-sm">
                            {displayRank === 1 ? '🥇' : displayRank === 2 ? '🥈' : displayRank === 3 ? '🥉' : '👤'}
                          </div>
                          <div>
                            <p className={`font-bold text-text-primary ${isSelf ? 'text-accent' : ''}`}>
                              {student.profile?.name || student.displayName || 'Explorer'} {isSelf && ' (You)'}
                            </p>
                            <p className="text-[9px] text-text-muted capitalize mt-0.5">{student.engagement?.league || 'beginner'} league</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-10">
                          <span className="flex items-center gap-1 text-[10px] font-black text-orange-400 shrink-0 min-w-[30px] justify-end">
                            <Flame className="w-3.5 h-3.5 shrink-0" />
                            {student.engagement.streakCount}
                          </span>
                          <span className="font-display font-black text-text-primary shrink-0 min-w-[70px] text-right flex items-center justify-end gap-1">
                            <Zap className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                            {student.engagement.totalXp}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
