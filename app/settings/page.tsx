'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/sidebar';
import { Navbar } from '@/components/navbar';
import { useAuth } from '@/components/auth-provider';
import { 
  Settings, 
  Bell, 
  Eye, 
  Volume2, 
  Sun, 
  Moon, 
  Target, 
  Loader2, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';

export default function SettingsPage() {
  const { user, fbUser, loading: authLoading, refreshProfile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Local state initialized from user preferences
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [leaderboardVisible, setLeaderboardVisible] = useState(true);
  const [playSounds, setPlaySounds] = useState(true);
  const [goalNotificationsEnabled, setGoalNotificationsEnabled] = useState(true);
  const [streakNotificationsEnabled, setStreakNotificationsEnabled] = useState(true);
  const [leaderboardNotificationsEnabled, setLeaderboardNotificationsEnabled] = useState(true);
  const [dailyGoalTarget, setDailyGoalTarget] = useState(30);

  useEffect(() => {
    if (user) {
      setTheme((user.preferences as any)?.theme || 'dark');
      setLeaderboardVisible((user.preferences as any)?.leaderboardVisible !== false);
      setPlaySounds(user.preferences?.playSounds !== false);
      setGoalNotificationsEnabled((user.preferences as any)?.goalNotificationsEnabled !== false);
      setStreakNotificationsEnabled((user.preferences as any)?.streakNotificationsEnabled !== false);
      setLeaderboardNotificationsEnabled((user.preferences as any)?.leaderboardNotificationsEnabled !== false);
      setDailyGoalTarget(user.engagement?.dailyGoalTarget || 30);
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbUser) return;
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const idToken = await fbUser.getIdToken();
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          preferences: {
            theme,
            leaderboardVisible,
            playSounds,
            goalNotificationsEnabled,
            streakNotificationsEnabled,
            leaderboardNotificationsEnabled
          },
          engagement: {
            dailyGoalTarget
          }
        })
      });

      if (res.ok) {
        setSuccessMsg('Settings updated successfully!');
        if (refreshProfile) {
          await refreshProfile();
        }
        
        // Apply theme change locally to HTML class list
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
          localStorage.setItem('theme', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('theme', 'light');
        }
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to save settings.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg-primary text-text-primary overflow-hidden relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-grow flex flex-col min-h-screen overflow-y-auto z-10">
        <Navbar onMenuToggle={() => setSidebarOpen(true)} />

        <main className="flex-grow max-w-2xl w-full mx-auto px-6 py-8 space-y-8">
          <div className="flex items-center space-x-3 border-b border-border-primary/50 pb-4">
            <Settings className="w-6 h-6 text-accent" />
            <h2 className="font-display font-black text-2xl">Preferences & Settings</h2>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {successMsg && (
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-500 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-xs text-red-500 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Theme & Aesthetics */}
            <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4">
              <h3 className="font-display font-bold text-sm text-text-primary flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" /> Theme & Interface
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${theme === 'light' ? 'bg-accent/10 border-accent text-accent' : 'bg-bg-primary/20 border-border-primary/50 text-text-secondary hover:bg-bg-tertiary/20'}`}
                >
                  <Sun className="w-6 h-6" />
                  <span className="text-xs font-bold">Light Mode</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${theme === 'dark' ? 'bg-accent/10 border-accent text-accent' : 'bg-bg-primary/20 border-border-primary/50 text-text-secondary hover:bg-bg-tertiary/20'}`}
                >
                  <Moon className="w-6 h-6" />
                  <span className="text-xs font-bold">Dark Mode</span>
                </button>
              </div>
            </div>

            {/* Plan & Billing Section */}
            <div className="p-6 rounded-2xl border border-purple-500/25 bg-purple-500/5 backdrop-blur-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-sm text-text-primary flex items-center gap-2">
                  <span className="text-base">🚀</span> Plan & Billing
                </h3>
                <span className="inline-flex items-center text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md border bg-purple-500/10 border-purple-500/25 text-purple-400">
                  {user?.plan === 'free' ? 'Free' : user?.plan === 'pro' ? 'Pro' : user?.plan === 'institution' ? 'Institution' : 'Beta Pro'}
                </span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                You are currently participating in the PaperHub Beta. All premium features, study recommendations, and mock exams are active and free of charge.
              </p>
              <div className="pt-1.5 flex flex-wrap gap-2.5">
                <Link
                  href="/billing"
                  className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 text-xs font-bold transition-all text-center"
                >
                  View My Usage Stats
                </Link>
                <Link
                  href="/pricing"
                  className="px-4 py-2 rounded-xl border border-border-primary hover:bg-bg-tertiary text-text-secondary text-xs font-semibold transition-all text-center"
                >
                  Compare All Plans
                </Link>
              </div>
            </div>

            {/* Daily Goal Sessional Target */}
            <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4">
              <h3 className="font-display font-bold text-sm text-text-primary flex items-center gap-2">
                <Target className="w-4 h-4 text-red-500" /> Daily Target
              </h3>
              <p className="text-[11px] text-text-secondary">
                Adjust your daily target questions for sessional mock training.
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[10, 20, 30, 50].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDailyGoalTarget(t)}
                    className={`py-3 rounded-xl border text-center transition-all ${dailyGoalTarget === t ? 'bg-accent/10 border-accent text-accent font-bold' : 'bg-bg-primary/20 border-border-primary/50 text-text-secondary hover:bg-bg-tertiary/20'}`}
                  >
                    <span className="text-xs font-semibold">{t} Qs</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4">
              <h3 className="font-display font-bold text-sm text-text-primary flex items-center gap-2">
                <Bell className="w-4 h-4 text-purple-500" /> Notification Channels
              </h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-xl border border-border-primary/30 hover:bg-bg-primary/20 cursor-pointer transition-colors">
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-text-primary">Daily Goal Milestones</span>
                    <span className="text-[10px] text-text-muted">Receive alerts when achieving daily questions solved targets.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={goalNotificationsEnabled}
                    onChange={(e) => setGoalNotificationsEnabled(e.target.checked)}
                    className="w-4.5 h-4.5 text-accent border-border-primary rounded focus:ring-accent"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-border-primary/30 hover:bg-bg-primary/20 cursor-pointer transition-colors">
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-text-primary">Streak Warnings & Milestones</span>
                    <span className="text-[10px] text-text-muted">Alerts for streak milestones and warnings when your active streak is at risk.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={streakNotificationsEnabled}
                    onChange={(e) => setStreakNotificationsEnabled(e.target.checked)}
                    className="w-4.5 h-4.5 text-accent border-border-primary rounded focus:ring-accent"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-border-primary/30 hover:bg-bg-primary/20 cursor-pointer transition-colors">
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-text-primary">Leaderboard & League Promotes</span>
                    <span className="text-[10px] text-text-muted">Updates about rank changes, promotions, or demotions in leagues.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={leaderboardNotificationsEnabled}
                    onChange={(e) => setLeaderboardNotificationsEnabled(e.target.checked)}
                    className="w-4.5 h-4.5 text-accent border-border-primary rounded focus:ring-accent"
                  />
                </label>
              </div>
            </div>

            {/* Privacy & Sounds */}
            <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4">
              <h3 className="font-display font-bold text-sm text-text-primary flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-500" /> Privacy & Sounds
              </h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-xl border border-border-primary/30 hover:bg-bg-primary/20 cursor-pointer transition-colors">
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-text-primary">Leaderboard Visibility</span>
                    <span className="text-[10px] text-text-muted">Display your study statistics and league status on leaderboards.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={leaderboardVisible}
                    onChange={(e) => setLeaderboardVisible(e.target.checked)}
                    className="w-4.5 h-4.5 text-accent border-border-primary rounded focus:ring-accent"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-border-primary/30 hover:bg-bg-primary/20 cursor-pointer transition-colors">
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-text-primary">Play Sound Effects</span>
                    <span className="text-[10px] text-text-muted">Sound cues for successful grades or learning milestones.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={playSounds}
                    onChange={(e) => setPlaySounds(e.target.checked)}
                    className="w-4.5 h-4.5 text-accent border-border-primary rounded focus:ring-accent"
                  />
                </label>
              </div>
            </div>

            {/* Save Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (user) {
                    setTheme((user.preferences as any)?.theme || 'dark');
                    setLeaderboardVisible((user.preferences as any)?.leaderboardVisible !== false);
                    setPlaySounds(user.preferences?.playSounds !== false);
                    setGoalNotificationsEnabled((user.preferences as any)?.goalNotificationsEnabled !== false);
                    setStreakNotificationsEnabled((user.preferences as any)?.streakNotificationsEnabled !== false);
                    setLeaderboardNotificationsEnabled((user.preferences as any)?.leaderboardNotificationsEnabled !== false);
                    setDailyGoalTarget(user.engagement?.dailyGoalTarget || 30);
                  }
                }}
                className="px-5 py-2.5 rounded-xl border border-border-primary hover:bg-bg-tertiary text-text-secondary text-xs font-semibold transition-all"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
