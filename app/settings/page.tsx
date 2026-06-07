'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Navbar } from '@/components/navbar';
import { useAuth } from '@/components/auth-provider';
import { useTheme } from '@/components/theme-provider';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Bell, 
  Eye, 
  Sun, 
  Moon, 
  Target, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Check,
  Palette,
  Volume2,
  Undo2
} from 'lucide-react';

export default function SettingsPage() {
  const { user, fbUser, loading: authLoading, refreshProfile } = useAuth();
  const { theme: activeTheme, setTheme: setActiveTheme } = useTheme();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Client-side authentication & authorization guard
  useEffect(() => {
    if (!authLoading) {
      if (!fbUser) {
        router.push('/login');
      } else if (fbUser && user && user.role === 'student' && !user.onboardingCompleted) {
        router.push('/onboarding');
      }
    }
  }, [user, fbUser, authLoading, router]);

  // Local state initialized from user preferences
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [themeColor, setThemeColor] = useState<'purple' | 'blue' | 'green' | 'orange' | 'pink'>('purple');
  const [leaderboardVisible, setLeaderboardVisible] = useState(true);
  const [playSounds, setPlaySounds] = useState(true);
  const [goalNotificationsEnabled, setGoalNotificationsEnabled] = useState(true);
  const [streakNotificationsEnabled, setStreakNotificationsEnabled] = useState(true);
  const [leaderboardNotificationsEnabled, setLeaderboardNotificationsEnabled] = useState(true);
  const [dailyGoalTarget, setDailyGoalTarget] = useState(30);

  // References to keep track of initially saved preferences
  const initialThemeRef = useRef<'light' | 'dark'>('dark');
  const initialThemeColorRef = useRef<'purple' | 'blue' | 'green' | 'orange' | 'pink'>('purple');
  const savedSuccessfullyRef = useRef<boolean>(false);

  useEffect(() => {
    if (user) {
      const currentTheme = (user.preferences as any)?.theme || 'dark';
      const currentThemeColor = (user.preferences as any)?.themeColor || 'purple';

      setTheme(currentTheme);
      setThemeColor(currentThemeColor);
      setLeaderboardVisible((user.preferences as any)?.leaderboardVisible !== false);
      setPlaySounds(user.preferences?.playSounds !== false);
      setGoalNotificationsEnabled((user.preferences as any)?.goalNotificationsEnabled !== false);
      setStreakNotificationsEnabled((user.preferences as any)?.streakNotificationsEnabled !== false);
      setLeaderboardNotificationsEnabled((user.preferences as any)?.leaderboardNotificationsEnabled !== false);
      setDailyGoalTarget(user.engagement?.dailyGoalTarget || 30);

      // Save the DB/auth values in refs
      initialThemeRef.current = currentTheme;
      initialThemeColorRef.current = currentThemeColor;
    }
  }, [user]);

  // Real-time Preview: Theme mode changes
  useEffect(() => {
    if (theme) {
      setActiveTheme(theme);
    }
  }, [theme, setActiveTheme]);

  // Real-time Preview: Accent color changes
  useEffect(() => {
    const root = document.documentElement;
    ['theme-purple', 'theme-blue', 'theme-green', 'theme-orange', 'theme-pink'].forEach(cls => {
      root.classList.remove(cls);
    });
    root.classList.add(`theme-${themeColor}`);
  }, [themeColor]);

  // Revert on unmount if changes weren't explicitly saved
  useEffect(() => {
    return () => {
      if (!savedSuccessfullyRef.current) {
        // Revert next-themes theme
        setActiveTheme(initialThemeRef.current);

        // Revert Accent Color
        const root = document.documentElement;
        ['theme-purple', 'theme-blue', 'theme-green', 'theme-orange', 'theme-pink'].forEach(cls => {
          root.classList.remove(cls);
        });
        root.classList.add(`theme-${initialThemeColorRef.current}`);
      }
    };
  }, [setActiveTheme]);

  const handleSetToDefault = () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (theme === 'dark') {
      setThemeColor('purple');
    } else {
      setThemeColor('orange');
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      try {
        new Notification('PaperHub Notifications Enabled! 🚀', {
          body: 'You will now receive alerts for daily goals, milestones, and streak warnings.',
          icon: '/favicon.ico'
        });
      } catch (e) {
        console.warn('Failed to display native system notification:', e);
      }
      return true;
    } else {
      setErrorMsg('Notification permission denied. Please enable notifications in your browser settings.');
      return false;
    }
  };

  const handleNotificationToggle = async (type: 'goal' | 'streak' | 'leaderboard', checked: boolean) => {
    setErrorMsg('');
    setSuccessMsg('');
    if (checked) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        return; // permission denied, do not check the toggle
      }
    }
    
    if (type === 'goal') setGoalNotificationsEnabled(checked);
    if (type === 'streak') setStreakNotificationsEnabled(checked);
    if (type === 'leaderboard') setLeaderboardNotificationsEnabled(checked);
  };

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
            themeColor,
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
        savedSuccessfullyRef.current = true; // Mark as saved successfully to prevent unmount reversion
        
        // Persist theme configurations in localStorage
        localStorage.setItem('theme', theme);
        localStorage.setItem('themeColor', themeColor);

        // Update initial values
        initialThemeRef.current = theme;
        initialThemeColorRef.current = themeColor;

        if (refreshProfile) {
          await refreshProfile();
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

  const themesList = [
    { id: 'light', name: 'Light Mode', icon: Sun },
    { id: 'dark', name: 'Dark Mode', icon: Moon },
  ] as const;

  const colorsList: {
    id: 'purple' | 'blue' | 'green' | 'orange' | 'pink';
    name: string;
    label: string;
    gradientClass: string;
    glowColor: string;
  }[] = [
    { id: 'purple', name: 'Purple', label: 'Neon Violet', gradientClass: 'from-[#6366f1] to-[#a855f7]', glowColor: 'rgba(124, 102, 255, 0.25)' },
    { id: 'blue', name: 'Blue', label: 'Ocean Blue', gradientClass: 'from-[#3b82f6] to-[#06b6d4]', glowColor: 'rgba(59, 130, 246, 0.25)' },
    { id: 'green', name: 'Green', label: 'Emerald Mint', gradientClass: 'from-[#10b981] to-[#059669]', glowColor: 'rgba(16, 185, 129, 0.25)' },
    { id: 'orange', name: 'Orange', label: 'Sunset Glow', gradientClass: 'from-[#f97316] to-[#d97706]', glowColor: 'rgba(249, 115, 22, 0.25)' },
    { id: 'pink', name: 'Pink', label: 'Rose Aura', gradientClass: 'from-[#ec4899] to-[#db2777]', glowColor: 'rgba(236, 72, 153, 0.25)' },
  ];

  // Custom premium sliding switch toggle component
  const PremiumToggle = ({ 
    checked, 
    onChange, 
    label, 
    description,
    icon: ToggleIcon
  }: { 
    checked: boolean; 
    onChange: (checked: boolean) => void; 
    label: string; 
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }) => {
    return (
      <div 
        onClick={() => onChange(!checked)}
        className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 select-none cursor-pointer ${
          checked 
            ? 'border-accent/40 bg-accent/[0.02] hover:border-accent/60' 
            : 'border-border-primary/50 bg-bg-secondary/20 hover:border-border-primary hover:bg-bg-secondary/40'
        }`}
      >
        <div className="flex items-start gap-4 max-w-[80%]">
          <div className={`mt-0.5 p-2 rounded-xl border flex items-center justify-center shrink-0 transition-colors duration-300 ${
            checked 
              ? 'bg-accent/10 border-accent/20 text-accent' 
              : 'bg-bg-tertiary/50 border-border-primary/30 text-text-muted'
          }`}>
            <ToggleIcon className="w-4.5 h-4.5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-text-primary leading-normal">{label}</span>
            <span className="text-[10px] text-text-secondary leading-relaxed mt-0.5">{description}</span>
          </div>
        </div>
        
        <button
          type="button"
          aria-checked={checked}
          role="switch"
          onClick={(e) => {
            e.stopPropagation(); // prevent double toggle
            onChange(!checked);
          }}
          className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out outline-none ${
            checked 
              ? 'bg-accent shadow-[0_0_12px_hsl(var(--accent)/0.35)]' 
              : 'bg-bg-tertiary border-border-primary/20'
          }`}
        >
          <motion.span
            layout
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow-md ${
              checked ? 'translate-x-5.5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    );
  };

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

            {/* Theme & Mode Select */}
            <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4">
              <h3 className="font-display font-bold text-sm text-text-primary flex items-center gap-2">
                <Sun className="w-4 h-4 text-accent" /> Interface Theme
              </h3>
              <p className="text-[11px] text-text-secondary">
                Choose between a warm peach-orange daytime theme or a deep neon-accented night mode.
              </p>
              
              <div className="relative flex p-1.5 bg-bg-tertiary/40 border border-border-primary/50 rounded-2xl w-full">
                {themesList.map((t) => {
                  const isSelected = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      className={`relative flex-1 flex items-center justify-center gap-3 py-3 rounded-xl text-xs font-bold transition-all z-10 cursor-pointer ${
                        isSelected ? 'text-white' : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="activeThemePill"
                          className="absolute inset-0 bg-accent rounded-xl shadow-[0_0_15px_hsl(var(--accent)/0.35)] -z-10"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <t.icon className={`w-4 h-4 transition-transform duration-300 ${isSelected ? 'scale-110 rotate-12' : ''}`} />
                      <span>{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Accent Theme Color */}
            <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-sm text-text-primary flex items-center gap-2">
                  <Palette className="w-4 h-4 text-accent" /> Theme Accent Color
                </h3>
                <button
                  type="button"
                  onClick={handleSetToDefault}
                  className="px-3 py-1.5 rounded-xl border border-border-primary hover:bg-bg-tertiary text-text-secondary text-[10px] font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>Set to Default</span>
                </button>
              </div>
              <p className="text-[11px] text-text-secondary">
                Select your preferred highlight and focus accents for the PaperHub application. Modifying modes/colors immediately updates the site preview.
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {colorsList.map((colorItem) => {
                  const isActive = themeColor === colorItem.id;
                  return (
                    <button
                      key={colorItem.id}
                      type="button"
                      onClick={() => setThemeColor(colorItem.id)}
                      className={`relative p-3 rounded-2xl border flex flex-col items-center gap-2.5 transition-all duration-300 hover:scale-[1.03] select-none cursor-pointer ${
                        isActive
                          ? 'border-accent bg-accent/[0.03] scale-102 font-bold'
                          : 'border-border-primary/50 bg-bg-secondary/20 hover:border-border-primary hover:bg-bg-secondary/40 text-text-secondary hover:text-text-primary'
                      }`}
                      style={{
                        boxShadow: isActive ? `0 0 20px ${colorItem.glowColor}` : undefined
                      }}
                    >
                      {/* Color Preview Orb */}
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${colorItem.gradientClass} flex items-center justify-center text-white shadow-md relative`}>
                        {isActive && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-[0.5px]">
                            <Check className="w-4 h-4 text-white font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                          </div>
                        )}
                      </div>
                      
                      {/* Color Details */}
                      <div className="flex flex-col items-center text-center">
                        <span className="text-[11px] font-bold text-text-primary leading-tight">{colorItem.label}</span>
                        <span className="text-[8px] text-text-muted mt-0.5 uppercase tracking-wider font-semibold">{colorItem.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Daily Goal Sessional Target */}
            <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4">
              <h3 className="font-display font-bold text-sm text-text-primary flex items-center gap-2">
                <Target className="w-4 h-4 text-accent" /> Daily Target Questions
              </h3>
              <p className="text-[11px] text-text-secondary">
                Set a daily limit target to keep track of your practice goals.
              </p>
              
              <div className="relative flex p-1 bg-bg-tertiary/40 border border-border-primary/50 rounded-2xl w-full">
                {[10, 20, 30, 50].map((t) => {
                  const isSelected = dailyGoalTarget === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDailyGoalTarget(t)}
                      className={`relative flex-1 py-3 text-center rounded-xl text-xs font-bold transition-all z-10 cursor-pointer ${
                        isSelected ? 'text-white' : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="activeTargetPill"
                          className="absolute inset-0 bg-accent rounded-xl shadow-[0_0_12px_hsl(var(--accent)/0.3)] -z-10"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span>{t} Qs</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4">
              <h3 className="font-display font-bold text-sm text-text-primary flex items-center gap-2">
                <Bell className="w-4 h-4 text-accent" /> Notification Channels
              </h3>
              <p className="text-[11px] text-text-secondary">
                Allow PaperHub to request browser notification permission to keep you on schedule.
              </p>
              <div className="space-y-3">
                <PremiumToggle
                  checked={goalNotificationsEnabled}
                  onChange={(checked) => handleNotificationToggle('goal', checked)}
                  label="Daily Goal Milestones"
                  description="Receive alerts when achieving daily questions solved targets."
                  icon={Target}
                />

                <PremiumToggle
                  checked={streakNotificationsEnabled}
                  onChange={(checked) => handleNotificationToggle('streak', checked)}
                  label="Streak Warnings & Milestones"
                  description="Alerts for streak milestones and warnings when your active streak is at risk."
                  icon={Bell}
                />

                <PremiumToggle
                  checked={leaderboardNotificationsEnabled}
                  onChange={(checked) => handleNotificationToggle('leaderboard', checked)}
                  label="Leaderboard & League Promotes"
                  description="Updates about rank changes, promotions, or demotions in leagues."
                  icon={Palette}
                />
              </div>
            </div>

            {/* Privacy & Sounds */}
            <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4">
              <h3 className="font-display font-bold text-sm text-text-primary flex items-center gap-2">
                <Eye className="w-4 h-4 text-accent" /> Privacy & Sounds
              </h3>
              <div className="space-y-3">
                <PremiumToggle
                  checked={leaderboardVisible}
                  onChange={setLeaderboardVisible}
                  label="Leaderboard Visibility"
                  description="Display your study statistics and league status on leaderboards."
                  icon={Eye}
                />

                <PremiumToggle
                  checked={playSounds}
                  onChange={setPlaySounds}
                  label="Play Sound Effects"
                  description="Sound cues for successful grades or learning milestones."
                  icon={Volume2}
                />
              </div>
            </div>

            {/* Save Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (user) {
                    setTheme((user.preferences as any)?.theme || 'dark');
                    setThemeColor((user.preferences as any)?.themeColor || 'purple');
                    setLeaderboardVisible((user.preferences as any)?.leaderboardVisible !== false);
                    setPlaySounds(user.preferences?.playSounds !== false);
                    setGoalNotificationsEnabled((user.preferences as any)?.goalNotificationsEnabled !== false);
                    setStreakNotificationsEnabled((user.preferences as any)?.streakNotificationsEnabled !== false);
                    setLeaderboardNotificationsEnabled((user.preferences as any)?.leaderboardNotificationsEnabled !== false);
                    setDailyGoalTarget(user.engagement?.dailyGoalTarget || 30);
                  }
                }}
                className="px-5 py-2.5 rounded-xl border border-border-primary hover:bg-bg-tertiary text-text-secondary text-xs font-semibold transition-all cursor-pointer hover:text-text-primary"
              >
                Discard Changes
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all shadow-md shadow-accent/20 hover:shadow-accent/30 flex items-center gap-2 cursor-pointer"
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
