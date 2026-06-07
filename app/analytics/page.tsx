'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Navbar } from '@/components/navbar';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, 
  Target, 
  Zap, 
  Clock, 
  Star, 
  Loader2, 
  Calendar, 
  ChevronRight, 
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AnalyticsPage() {
  const { user, fbUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [radarMetric, setRadarMetric] = useState<'accuracy' | 'solved'>('accuracy');
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Auth guard: redirect unverified and un-onboarded users
  useEffect(() => {
    if (!authLoading) {
      if (!fbUser) {
        router.push('/login');
      } else if (fbUser && user && user.role === 'student' && !user.onboardingCompleted) {
        router.push('/onboarding');
      }
    }
  }, [user, fbUser, authLoading, router]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!fbUser) return;
      try {
        const token = await fbUser.getIdToken();
        const res = await fetch('/api/users/analytics', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      } catch (err) {
        console.error("Failed to load student analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    if (!fbUser && !authLoading) {
      setLoading(false);
    } else if (!authLoading) {
      fetchAnalytics();
    }
  }, [authLoading, fbUser]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <div className="text-center space-y-3">
          <Loader2 className="w-7 h-7 text-accent animate-spin mx-auto" />
          <p className="text-xs text-text-secondary">Loading learning insights…</p>
        </div>
      </div>
    );
  }

  // Retrieve metrics with fallbacks matching the target screen specs
  const metrics = analytics?.metrics || {
    questionsSolved: 1248,
    overallAccuracy: 72,
    testsCompleted: 24,
    totalTimeString: '38h 45m',
    streakCount: 12,
    longestStreak: 18,
    streakDays: []
  };

  const subjectPerformance = analytics?.subjectPerformance || [
    { subjectName: 'Physics', subjectCode: 'PH', questionsSolved: 342, accuracy: 76 },
    { subjectName: 'Mathematics', subjectCode: 'MATH', questionsSolved: 298, accuracy: 70 },
    { subjectName: 'BHS', subjectCode: 'BHS', questionsSolved: 186, accuracy: 68 },
    { subjectName: 'Introduction to C', subjectCode: 'IT', questionsSolved: 74, accuracy: 74 },
    { subjectName: 'Web Designing', subjectCode: 'WEB', questionsSolved: 210, accuracy: 65 }
  ];

  const timeDistribution = analytics?.timeDistribution || [
    { subjectName: 'Physics', percentage: 34, timeString: '13h 15m' },
    { subjectName: 'Mathematics', percentage: 28, timeString: '10h 45m' },
    { subjectName: 'BHS', percentage: 16, timeString: '6h 15m' },
    { subjectName: 'Introduction to C', percentage: 12, timeString: '4h 30m' },
    { subjectName: 'Web Designing', percentage: 10, timeString: '3h 45m' }
  ];

  const progressOverTime = analytics?.progressOverTime || Array.from({ length: 30 }, (_, i) => {
    const dates = ['May 1', 'May 6', 'May 11', 'May 16', 'May 21', 'May 26', 'May 31'];
    const dateStr = i % 5 === 0 ? dates[Math.floor(i / 5)] : `May ${i + 1}`;
    return {
      date: dateStr,
      questionsSolved: 400 + i * 20 + Math.sin(i) * 50,
      accuracy: 60 + (i * 0.5) + Math.cos(i) * 5
    };
  });

  const recentTests = analytics?.recentTests || [
    { id: '1', name: 'JEE Main 2024 (06 Apr Shift 1)', subject: 'Physics', score: '78 / 120', accuracy: 68, timeSpent: '1h 45m', date: 'May 30, 2026' },
    { id: '2', name: 'JEE Main 2024 (06 Apr Shift 2)', subject: 'Mathematics', score: '82 / 120', accuracy: 72, timeSpent: '1h 50m', date: 'May 28, 2026' },
    { id: '3', name: 'JEE Main 2023 (25 Jan Shift 1)', subject: 'BHS', score: '65 / 100', accuracy: 65, timeSpent: '1h 15m', date: 'May 25, 2026' },
    { id: '4', name: 'Custom Test - Data Structures', subject: 'Introduction to C', score: '70 / 100', accuracy: 70, timeSpent: '1h 20m', date: 'May 22, 2026' },
    { id: '5', name: 'Full Syllabus Test', subject: 'Web Designing', score: '55 / 100', accuracy: 55, timeSpent: '1h 05m', date: 'May 20, 2026' }
  ];

  const areasToImprove = analytics?.areasToImprove || [
    { topic: 'Differential Equations', subjectName: 'Mathematics', accuracy: 36, badgeType: 'Low Accuracy' },
    { topic: 'Semiconductor Physics', subjectName: 'Physics', accuracy: 42, badgeType: 'Low Accuracy' },
    { topic: 'Database Basics', subjectName: 'Introduction to C', accuracy: 52, badgeType: 'Medium Accuracy' }
  ];

  const consistencyGrid = analytics?.consistencyGrid || Array.from({ length: 30 }, (_, i) => {
    // Generate dates backwards from today
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return {
      date: dateStr,
      count: i % 3 === 0 ? 8 : i % 5 === 0 ? 4 : i % 7 === 0 ? 0 : 2
    };
  }).reverse();

  // Subject colors mapping helper
  const getSubjectColor = (subjectName: string) => {
    const name = subjectName.toLowerCase();
    if (name.includes('math')) return { text: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', dot: '#3b82f6' };
    if (name.includes('physics')) return { text: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', dot: '#7c66ff' };
    if (name.includes('bhs') || name.includes('humanities')) return { text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: '#10b981' };
    if (name.includes('intro') || name.includes('computer') || name.includes('programming') || name.includes('introduction to c')) return { text: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', dot: '#f97316' };
    if (name.includes('web')) return { text: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20', dot: '#ec4899' };
    return { text: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20', dot: '#6366f1' };
  };

  // --- SVG Charts Calculations ---

  // 1. Radar Chart Details
  const radarData = subjectPerformance.slice(0, 5);
  const radarCount = radarData.length;
  const radarCx = 110;
  const radarCy = 110;
  const radarRadius = 70;
  const maxSolved = Math.max(...radarData.map((s: any) => s.questionsSolved || 0), 1);

  const radarPoints = radarData.map((sub: any, i: number) => {
    const angle = (i * 2 * Math.PI) / radarCount - Math.PI / 2;
    const value = radarMetric === 'accuracy' 
      ? (sub.accuracy || 0) 
      : ((sub.questionsSolved || 0) / maxSolved) * 100;
    const dist = (value / 100) * radarRadius;
    const x = radarCx + dist * Math.cos(angle);
    const y = radarCy + dist * Math.sin(angle);
    const outerX = radarCx + radarRadius * Math.cos(angle);
    const outerY = radarCy + radarRadius * Math.sin(angle);
    return { x, y, outerX, outerY, label: sub.subjectCode || sub.subjectName };
  });

  const radarPointsStr = radarPoints.map((p: any) => `${p.x},${p.y}`).join(' ');

  // 2. Line Chart Details
  // Display final 15 dates for clean density on desktop views
  const lineChartPoints = progressOverTime.slice(-15);
  const lineCount = lineChartPoints.length;
  const linePaddingLeft = 45;
  const linePaddingRight = 45;
  const linePaddingTop = 20;
  const linePaddingBottom = 30;
  const lineW = 600;
  const lineH = 200;
  const linePlotW = lineW - linePaddingLeft - linePaddingRight;
  const linePlotH = lineH - linePaddingTop - linePaddingBottom;

  const maxDailySolved = Math.max(...lineChartPoints.map((p: any) => p.questionsSolved || 0), 500);
  const solvedYMaxScale = maxDailySolved <= 300 ? 300 : maxDailySolved <= 600 ? 600 : maxDailySolved <= 1200 ? 1200 : 1500;

  const solvedCoords = lineChartPoints.map((pt: any, i: number) => {
    const x = linePaddingLeft + (i / (lineCount - 1)) * linePlotW;
    const y = (linePaddingTop + linePlotH) - ((pt.questionsSolved || 0) / solvedYMaxScale) * linePlotH;
    return { x, y, value: pt.questionsSolved, date: pt.date };
  });

  const accuracyCoords = lineChartPoints.map((pt: any, i: number) => {
    const x = linePaddingLeft + (i / (lineCount - 1)) * linePlotW;
    const y = (linePaddingTop + linePlotH) - ((pt.accuracy || 0) / 100) * linePlotH;
    return { x, y, value: pt.accuracy, date: pt.date };
  });

  const solvedPath = solvedCoords.map((c: any, i: number) => (i === 0 ? `M ${c.x} ${c.y}` : `L ${c.x} ${c.y}`)).join(' ');
  const accuracyPath = accuracyCoords.map((c: any, i: number) => (i === 0 ? `M ${c.x} ${c.y}` : `L ${c.x} ${c.y}`)).join(' ');

  const solvedAreaPath = solvedCoords.length > 0 
    ? `${solvedPath} L ${solvedCoords[solvedCoords.length - 1].x} ${linePaddingTop + linePlotH} L ${solvedCoords[0].x} ${linePaddingTop + linePlotH} Z`
    : '';
  const accuracyAreaPath = accuracyCoords.length > 0
    ? `${accuracyPath} L ${accuracyCoords[accuracyCoords.length - 1].x} ${linePaddingTop + linePlotH} L ${accuracyCoords[0].x} ${linePaddingTop + linePlotH} Z`
    : '';

  // 3. Donut Chart Details
  const donutR = 40;
  const donutCx = 60;
  const donutCy = 60;
  const donutCircumference = 2 * Math.PI * donutR; // ~251.3
  const subjectColors = ['#7c66ff', '#3b82f6', '#10b981', '#f97316', '#ec4899'];

  let currentOffsetSum = 0;
  const donutSlices = timeDistribution.map((item: any, idx: number) => {
    const pct = item.percentage;
    const strokeDasharray = `${(pct / 100) * donutCircumference} ${donutCircumference}`;
    const strokeDashoffset = -currentOffsetSum;
    currentOffsetSum += (pct / 100) * donutCircumference;
    return {
      strokeDasharray,
      strokeDashoffset,
      color: subjectColors[idx % subjectColors.length]
    };
  });

  // 4. Consistency Grid Details
  // Grid size: 7 rows (days M to S) x 5 columns
  const consistencyRows = 7;
  const consistencyCols = 5;
  const getIntensityClass = (count: number) => {
    if (count === 0) return 'bg-bg-tertiary/20 dark:bg-bg-tertiary/15 border-transparent';
    if (count <= 2) return 'bg-purple-950/40 dark:bg-purple-950/30 border border-purple-500/10 text-purple-400';
    if (count <= 4) return 'bg-purple-800/40 border border-purple-500/20 text-purple-300';
    if (count <= 6) return 'bg-purple-600/70 border border-purple-400/20 text-purple-200';
    return 'bg-[#7c66ff] border border-purple-400/30 text-white';
  };

  return (
    <div className="flex min-h-screen bg-bg-primary text-text-primary overflow-hidden relative">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        streakCount={metrics.streakCount}
        streakDays={analytics?.metrics?.streakDays}
      />

      <div className="flex-grow flex flex-col min-h-screen overflow-y-auto z-10">
        <Navbar onMenuToggle={() => setSidebarOpen(true)} />

        <main className="flex-grow w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-6 space-y-6">
          
          {/* Breadcrumb & Date Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <nav className="flex items-center space-x-2 text-[10px] sm:text-xs font-bold text-text-muted uppercase tracking-wider">
                <span>Home</span>
                <span>/</span>
                <span className="text-text-primary">My Progress</span>
              </nav>
              <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight leading-none text-text-primary mt-1">
                My Progress
              </h1>
              <p className="text-[11px] sm:text-xs text-text-secondary">
                Track your preparation and improve every day
              </p>
            </div>

            {/* Date Range Selector */}
            <div className="relative self-start md:self-center">
              <button 
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border-primary bg-bg-secondary/40 hover:bg-bg-secondary text-xs font-bold transition-all text-text-primary"
              >
                <Calendar className="w-4 h-4 text-text-muted" />
                <span>May 1 – May 31, 2026</span>
              </button>

              <AnimatePresence>
                {showDatePicker && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowDatePicker(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 z-40 w-56 rounded-2xl border border-border-primary bg-bg-secondary p-3 shadow-xl text-left"
                    >
                      <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 px-1">Select Range</h4>
                      <button className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-bg-tertiary font-bold transition-colors">
                        Last 7 Days
                      </button>
                      <button className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-bg-tertiary font-bold transition-colors">
                        Last 30 Days
                      </button>
                      <button className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-bg-tertiary bg-accent/10 text-accent font-bold transition-colors">
                        May 1 – May 31, 2026
                      </button>
                      <button className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-bg-tertiary font-bold transition-colors">
                        Custom Range...
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Quick Metrics Grid (5 Cards) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            {[
              { label: 'Questions Solved', value: Number(metrics.questionsSolved).toLocaleString(), change: '▲ 18% vs Apr 1 - Apr 30', icon: BookOpen, color: 'text-purple-400 bg-purple-500/5 border-purple-500/10 dark:bg-purple-950/20 dark:border-purple-500/15' },
              { label: 'Accuracy', value: `${metrics.overallAccuracy}%`, change: '▲ 6% vs Apr 1 - Apr 30', icon: Target, color: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10 dark:bg-emerald-950/20 dark:border-emerald-500/15' },
              { label: 'Tests Taken', value: metrics.testsCompleted, change: '▲ 14% vs Apr 1 - Apr 30', icon: Zap, color: 'text-orange-400 bg-orange-400/5 border-orange-400/10 dark:bg-orange-950/20 dark:border-orange-500/15' },
              { label: 'Total Time', value: metrics.totalTimeString, change: '▲ 12% vs Apr 1 - Apr 30', icon: Clock, color: 'text-blue-400 bg-blue-500/5 border-blue-500/10 dark:bg-blue-950/20 dark:border-blue-500/15' },
              { label: 'Streak', value: `${metrics.streakCount} Days`, change: `Best: ${metrics.longestStreak} Days`, icon: Star, color: 'text-pink-400 bg-pink-500/5 border-pink-500/10 dark:bg-pink-950/20 dark:border-pink-500/15' }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border flex flex-col justify-between h-28 shadow-sm ${item.color} ${idx === 4 ? 'col-span-2 md:col-span-1' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-text-muted">{item.label}</span>
                    <div className="p-1.5 rounded-lg bg-black/10 dark:bg-white/5">
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-display font-black text-lg sm:text-xl leading-none text-text-primary">{item.value}</h4>
                    <p className={`text-[8.5px] font-bold ${idx === 4 ? 'text-text-muted' : 'text-emerald-400'}`}>
                      {item.change}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grids Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Subject Wise Performance Panel */}
              <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-primary">
                    Subject Wise Performance
                  </h3>
                  
                  {/* Metric Toggle Tabs */}
                  <div className="flex p-0.5 rounded-lg bg-bg-tertiary/80 border border-border-primary/50 text-[10px] font-bold">
                    <button
                      onClick={() => setRadarMetric('accuracy')}
                      className={`px-3 py-1 rounded-md transition-all ${radarMetric === 'accuracy' ? 'bg-bg-secondary text-accent dark:text-purple-400 shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                      Accuracy
                    </button>
                    <button
                      onClick={() => setRadarMetric('solved')}
                      className={`px-3 py-1 rounded-md transition-all ${radarMetric === 'solved' ? 'bg-bg-secondary text-accent dark:text-purple-400 shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                      Questions Solved
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6">
                  {/* SVG Radar Chart Column */}
                  <div className="md:col-span-5 flex justify-center">
                    <div className="relative w-56 h-56">
                      <svg viewBox="0 0 220 220" className="w-full h-full">
                        {/* pentagon grids */}
                        {[0.2, 0.4, 0.6, 0.8, 1.0].map((scale, idx) => {
                          const scalePoints = radarPoints.map((p: any, i: number) => {
                            const angle = (i * 2 * Math.PI) / radarCount - Math.PI / 2;
                            const curR = radarRadius * scale;
                            const px = radarCx + curR * Math.cos(angle);
                            const py = radarCy + curR * Math.sin(angle);
                            return `${px},${py}`;
                          }).join(' ');
                          return (
                            <polygon
                              key={idx}
                              points={scalePoints}
                              fill="none"
                              stroke="currentColor"
                              className="text-border-primary/20 dark:text-border-primary/45"
                              strokeWidth="0.75"
                            />
                          );
                        })}

                        {/* radial axis lines */}
                        {radarPoints.map((p: any, idx: number) => (
                          <line
                            key={idx}
                            x1={radarCx}
                            y1={radarCy}
                            x2={p.outerX}
                            y2={p.outerY}
                            stroke="currentColor"
                            className="text-border-primary/20 dark:text-border-primary/45"
                            strokeWidth="0.75"
                          />
                        ))}

                        {/* values polygon */}
                        <polygon
                          points={radarPointsStr}
                          className="fill-[#7c66ff]/15 stroke-[#7c66ff] dark:fill-[#7c66ff]/20 dark:stroke-[#7c66ff]"
                          strokeWidth="2"
                        />

                        {/* vertices circles */}
                        {radarPoints.map((p: any, idx: number) => (
                          <circle
                            key={idx}
                            cx={p.x}
                            cy={p.y}
                            r="3.5"
                            className="fill-[#7c66ff] stroke-bg-secondary"
                            strokeWidth="1.5"
                          />
                        ))}

                        {/* vertex labels */}
                        {radarPoints.map((p: any, idx: number) => {
                          const angle = (idx * 2 * Math.PI) / radarCount - Math.PI / 2;
                          const labelOffset = 18;
                          const lx = radarCx + (radarRadius + labelOffset) * Math.cos(angle);
                          const ly = radarCy + (radarRadius + labelOffset) * Math.sin(angle);
                          
                          let textAnchor: 'start' | 'middle' | 'end' | 'inherit' = 'middle';
                          if (Math.cos(angle) > 0.1) textAnchor = 'start';
                          else if (Math.cos(angle) < -0.1) textAnchor = 'end';
                          
                          const dy = Math.sin(angle) > 0.5 ? '0.7em' : Math.sin(angle) < -0.5 ? '-0.2em' : '0.35em';

                          return (
                            <text
                              key={idx}
                              x={lx}
                              y={ly}
                              dy={dy}
                              textAnchor={textAnchor}
                              className="text-[8.5px] font-black fill-text-primary"
                            >
                              {p.label}
                            </text>
                          );
                        })}
                      </svg>
                    </div>
                  </div>

                  {/* Subject List & Progress Column */}
                  <div className="md:col-span-7 space-y-4">
                    <div className="flex justify-between text-[9px] uppercase tracking-wider font-extrabold text-text-muted px-1">
                      <span>Subject</span>
                      <div className="flex space-x-12">
                        <span>Accuracy</span>
                        <span>Questions Solved</span>
                      </div>
                    </div>

                    <div className="space-y-3.5">
                      {subjectPerformance.map((sub: any, idx: number) => {
                        const colors = getSubjectColor(sub.subjectName);
                        return (
                          <div key={idx} className="flex items-center justify-between text-xs group cursor-pointer">
                            <span className="font-bold text-text-primary min-w-[90px] truncate">{sub.subjectName}</span>
                            
                            {/* Horizontal progress bar */}
                            <div className="flex-grow mx-4 flex items-center space-x-3">
                              <div className="flex-grow h-2 bg-bg-tertiary rounded-full overflow-hidden relative">
                                <div 
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ 
                                    width: `${sub.accuracy}%`, 
                                    backgroundColor: colors.dot 
                                  }}
                                />
                              </div>
                              <span className="font-black text-text-primary text-right min-w-[28px]">{sub.accuracy}%</span>
                            </div>

                            {/* Solved details */}
                            <div className="flex items-center space-x-2.5 shrink-0">
                              <span className="font-bold text-text-secondary min-w-[28px] text-right">{sub.questionsSolved}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:text-text-primary transition-colors" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="border-t border-border-primary/40 pt-4 flex justify-start">
                  <a href="/subjects" className="text-xs font-bold text-accent dark:text-purple-400 hover:underline flex items-center gap-1">
                    <span>View Detailed Subject Report</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Progress Over Time Panel */}
              <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-primary">
                    Progress Over Time
                  </h3>
                  
                  {/* Filter selector */}
                  <select className="px-2.5 py-1.5 rounded-lg border border-border-primary bg-bg-secondary text-[10px] font-bold text-text-secondary outline-none cursor-pointer">
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </select>
                </div>

                {/* Line Legends */}
                <div className="flex space-x-6 text-[10px] font-bold text-text-secondary">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#7c66ff]" />
                    <span>Questions Solved</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                    <span>Accuracy (%)</span>
                  </div>
                </div>

                {/* Responsive SVG Line Chart */}
                <div className="relative h-56 w-full">
                  <svg 
                    viewBox={`0 0 ${lineW} ${lineH}`} 
                    className="w-full h-full overflow-visible"
                    onMouseLeave={() => setHoveredLineIndex(null)}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const svgX = ((e.clientX - rect.left) / rect.width) * lineW;
                      
                      // Find closest coordinate index based on X position
                      let closestIdx = 0;
                      let minDistance = Infinity;
                      solvedCoords.forEach((coord: any, index: number) => {
                        const dist = Math.abs(coord.x - svgX);
                        if (dist < minDistance) {
                          minDistance = dist;
                          closestIdx = index;
                        }
                      });
                      setHoveredLineIndex(closestIdx);
                    }}
                  >
                    <defs>
                      <linearGradient id="solved-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c66ff" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#7c66ff" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="accuracy-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1.0].map((val, i) => {
                      const y = linePaddingTop + val * linePlotH;
                      return (
                        <line
                          key={i}
                          x1={linePaddingLeft}
                          y1={y}
                          x2={lineW - linePaddingRight}
                          y2={y}
                          stroke="currentColor"
                          className="text-border-primary/20 dark:text-border-primary/45"
                          strokeWidth="0.75"
                          strokeDasharray="4,4"
                        />
                      );
                    })}

                    {/* Y Axis labels (Left) */}
                    {[0, 0.25, 0.5, 0.75, 1.0].map((val, i) => {
                      const textVal = Math.round(solvedYMaxScale * (1.0 - val));
                      const y = linePaddingTop + val * linePlotH;
                      return (
                        <text
                          key={i}
                          x={linePaddingLeft - 10}
                          y={y}
                          dy="0.35em"
                          textAnchor="end"
                          className="text-[8.5px] font-bold fill-text-muted"
                        >
                          {textVal >= 1000 ? `${(textVal / 1000).toFixed(1)}k` : textVal}
                        </text>
                      );
                    })}

                    {/* Y Axis labels (Right) */}
                    {[0, 0.25, 0.5, 0.75, 1.0].map((val, i) => {
                      const textVal = Math.round(100 * (1.0 - val));
                      const y = linePaddingTop + val * linePlotH;
                      return (
                        <text
                          key={i}
                          x={lineW - linePaddingRight + 10}
                          y={y}
                          dy="0.35em"
                          textAnchor="start"
                          className="text-[8.5px] font-bold fill-text-muted"
                        >
                          {textVal}%
                        </text>
                      );
                    })}

                    {/* Gradient Area under curves */}
                    {solvedAreaPath && (
                      <path d={solvedAreaPath} fill="url(#solved-grad)" />
                    )}
                    {accuracyAreaPath && (
                      <path d={accuracyAreaPath} fill="url(#accuracy-grad)" />
                    )}

                    {/* Line paths */}
                    {solvedPath && (
                      <path
                        d={solvedPath}
                        fill="none"
                        stroke="#7c66ff"
                        strokeWidth="2"
                      />
                    )}
                    {accuracyPath && (
                      <path
                        d={accuracyPath}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2"
                      />
                    )}

                    {/* X Axis ticks & date labels */}
                    {lineChartPoints.map((pt: any, i: number) => {
                      if (i % 2 !== 0 && i !== lineCount - 1 && i !== 0) return null;
                      const x = linePaddingLeft + (i / (lineCount - 1)) * linePlotW;
                      return (
                        <text
                          key={i}
                          x={x}
                          y={lineH - linePaddingBottom + 16}
                          textAnchor="middle"
                          className="text-[8px] font-extrabold fill-text-muted"
                        >
                          {pt.date}
                        </text>
                      );
                    })}

                    {/* Interactive hover elements */}
                    {hoveredLineIndex !== null && (
                      <>
                        <line
                          x1={solvedCoords[hoveredLineIndex].x}
                          y1={linePaddingTop}
                          x2={solvedCoords[hoveredLineIndex].x}
                          y2={lineH - linePaddingBottom}
                          stroke="currentColor"
                          className="text-border-primary/60"
                          strokeWidth="1.5"
                          strokeDasharray="3,3"
                        />
                        <circle
                          cx={solvedCoords[hoveredLineIndex].x}
                          cy={solvedCoords[hoveredLineIndex].y}
                          r="4.5"
                          fill="#7c66ff"
                          stroke="white"
                          strokeWidth="1.5"
                        />
                        <circle
                          cx={accuracyCoords[hoveredLineIndex].x}
                          cy={accuracyCoords[hoveredLineIndex].y}
                          r="4.5"
                          fill="#10b981"
                          stroke="white"
                          strokeWidth="1.5"
                        />
                      </>
                    )}
                  </svg>

                  {/* Tooltip Overlay */}
                  {hoveredLineIndex !== null && (
                    <div 
                      className="absolute p-3 bg-bg-secondary border border-border-primary rounded-xl shadow-xl text-[10px] space-y-1 z-20 pointer-events-none"
                      style={{
                        left: `${Math.min(lineW - 140, Math.max(20, (solvedCoords[hoveredLineIndex].x / lineW) * 100))}%`,
                        top: '5%'
                      }}
                    >
                      <p className="font-extrabold text-text-primary border-b border-border-primary/40 pb-1 mb-1">
                        {lineChartPoints[hoveredLineIndex].date}, 2026
                      </p>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-text-secondary">Solved:</span>
                        <span className="font-black text-[#7c66ff]">
                          {lineChartPoints[hoveredLineIndex].questionsSolved} Qs
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-text-secondary">Accuracy:</span>
                        <span className="font-black text-[#10b981]">
                          {lineChartPoints[hoveredLineIndex].accuracy}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Tests Performance Panel */}
              <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-primary">
                    Recent Tests Performance
                  </h3>
                  <a href="/tests" className="text-xs font-bold text-accent dark:text-purple-400 hover:underline">
                    View All Tests
                  </a>
                </div>

                <div className="overflow-x-auto select-none rounded-xl border border-border-primary/40 bg-bg-primary/20">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border-primary/50 text-[9px] uppercase tracking-wider font-extrabold text-text-muted">
                        <th className="p-3.5 pl-4">Test Name</th>
                        <th className="p-3.5">Subject</th>
                        <th className="p-3.5">Score</th>
                        <th className="p-3.5">Accuracy</th>
                        <th className="p-3.5">Time</th>
                        <th className="p-3.5 pr-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-primary/30">
                      {recentTests.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-text-muted font-bold italic">
                            No tests completed yet. Start a mock test or PYQ test to view your performance here!
                          </td>
                        </tr>
                      ) : (
                        recentTests.map((test: any, idx: number) => {
                          const colors = getSubjectColor(test.subject);
                          return (
                            <tr key={idx} className="hover:bg-bg-tertiary/20 transition-colors">
                              <td className="p-3.5 pl-4 font-bold text-text-primary max-w-[180px] truncate">
                                {test.name}
                              </td>
                              <td className="p-3.5">
                                <span className={`inline-block px-2.5 py-0.5 rounded-lg border text-[10px] font-extrabold ${colors.bg} ${colors.text}`}>
                                  {test.subject}
                                </span>
                              </td>
                              <td className="p-3.5 font-semibold text-text-secondary">
                                {test.score}
                              </td>
                              <td className="p-3.5 font-bold text-text-primary">
                                {test.accuracy}%
                              </td>
                              <td className="p-3.5 font-medium text-text-secondary">
                                {test.timeSpent}
                              </td>
                              <td className="p-3.5 pr-4 font-medium text-text-muted">
                                {test.date}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Right Column (1/3 width) */}
            <div className="space-y-6">
              
              {/* Areas to Improve Panel */}
              <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4">
                <div className="space-y-1">
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-primary">
                    Areas to Improve
                  </h3>
                  <p className="text-[10px] text-text-muted">
                    Focus on these topics to boost your score
                  </p>
                </div>

                <div className="space-y-3">
                  {areasToImprove.length === 0 ? (
                    <div className="py-8 px-4 text-center border border-dashed border-border-primary/60 rounded-2xl bg-bg-primary/10">
                      <p className="text-xs text-text-muted italic font-medium">No areas to improve recorded yet. Keep practicing!</p>
                    </div>
                  ) : (
                    areasToImprove.map((item: any, idx: number) => {
                      const isLow = item.badgeType.toLowerCase().includes('low');
                      return (
                        <div key={idx} className="p-3.5 rounded-2xl border border-border-primary bg-bg-primary/20 flex items-center justify-between text-xs">
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
                              {item.subjectName}
                            </p>
                            <p className="font-bold text-text-primary max-w-[140px] truncate">
                              {item.topic}
                            </p>
                            <span className={`inline-block text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border ${isLow ? 'bg-red-500/5 border-red-500/10 text-red-400' : 'bg-amber-500/5 border-amber-500/10 text-amber-400'}`}>
                              {item.badgeType}
                            </span>
                          </div>

                          <span className={`font-display font-black text-sm px-2.5 py-1.5 rounded-xl border ${isLow ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                            {item.accuracy}%
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-border-primary/40 pt-4">
                  <a href="/dashboard#practice" className="text-xs font-bold text-accent dark:text-purple-400 hover:underline flex items-center gap-1 justify-center">
                    <span>View All Weak Areas</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Time Distribution Panel */}
              <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-primary">
                  Time Distribution
                </h3>

                <div className="flex items-center gap-5">
                  {timeDistribution.length === 0 ? (
                    <div className="py-8 px-4 text-center border border-dashed border-border-primary/60 rounded-2xl bg-bg-primary/10 w-full">
                      <p className="text-xs text-text-muted italic font-medium">No study sessions logged yet. Time spent will appear here!</p>
                    </div>
                  ) : (
                    <>
                      {/* SVG Donut Chart */}
                      <div className="relative w-28 h-28 shrink-0">
                        <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
                          {/* background track */}
                          <circle
                            cx={donutCx}
                            cy={donutCy}
                            r={donutR}
                            fill="transparent"
                            stroke="currentColor"
                            className="text-border-primary/20 dark:text-border-primary/45"
                            strokeWidth="9"
                          />
                          {/* slices */}
                          {donutSlices.map((slice: any, idx: number) => (
                            <circle
                              key={idx}
                              cx={donutCx}
                              cy={donutCy}
                              r={donutR}
                              fill="transparent"
                              stroke={slice.color}
                              strokeWidth="9"
                              strokeDasharray={slice.strokeDasharray}
                              strokeDashoffset={slice.strokeDashoffset}
                              strokeLinecap="round"
                            />
                          ))}
                        </svg>

                        {/* Center details */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="font-display font-black text-[11px] sm:text-xs leading-none text-text-primary">
                            {metrics.totalTimeString}
                          </span>
                          <span className="text-[7.5px] font-bold text-text-muted mt-0.5 uppercase tracking-wider">
                            Total Time
                          </span>
                        </div>
                      </div>

                      {/* Donut Legend */}
                      <div className="flex-grow space-y-2.5">
                        {timeDistribution.map((item: any, idx: number) => {
                          const color = subjectColors[idx % subjectColors.length];
                          return (
                            <div key={idx} className="flex items-center justify-between text-[11px] font-bold">
                              <div className="flex items-center gap-2 max-w-[90px] truncate">
                                <span 
                                  className="w-2 h-2 rounded-full shrink-0" 
                                  style={{ backgroundColor: color }}
                                />
                                <span className="text-text-primary truncate">{item.subjectName}</span>
                              </div>
                              <span className="text-text-secondary shrink-0 pl-1">
                                {item.percentage}% <span className="text-text-muted font-medium">({item.timeString})</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Consistency Panel (GitHub Grid) */}
              <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4">
                <div className="space-y-1">
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-primary">
                    Consistency
                  </h3>
                  <p className="text-[10px] text-text-muted">
                    Your activity for the last 30 days
                  </p>
                </div>

                {/* Contribution Grid */}
                <div className="flex flex-col items-end gap-2.5">
                  <div className="flex gap-2 w-full justify-center">
                    {/* Row labels */}
                    <div className="flex flex-col justify-between text-[8px] font-black text-text-muted py-0.5 select-none">
                      <span>Mon</span>
                      <span>Wed</span>
                      <span>Fri</span>
                      <span>Sun</span>
                    </div>

                    {/* Columns structure */}
                    <div className="grid grid-flow-col grid-rows-7 gap-1.5">
                      {Array.from({ length: 35 }).map((_, idx) => {
                        const dataItem = consistencyGrid[idx];
                        const count = dataItem ? dataItem.count : 0;
                        const dateStr = dataItem ? dataItem.date : '';
                        
                        return (
                          <div
                            key={idx}
                            className={`w-3.5 h-3.5 rounded-[4px] cursor-pointer transition-colors relative group ${getIntensityClass(count)}`}
                          >
                            {/* Cell tooltip */}
                            {dateStr && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-bg-secondary border border-border-primary rounded-lg p-2 text-[8px] font-bold shadow-xl z-20 whitespace-nowrap pointer-events-none">
                                <span className="text-text-primary block">{new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                <span className="text-accent mt-0.5 block">{count} XP / Practice Points</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Grid Legend */}
                  <div className="flex items-center gap-1.5 text-[8.5px] font-extrabold text-text-muted pr-1">
                    <span>Less</span>
                    <div className="flex gap-1">
                      <div className="w-2.5 h-2.5 rounded-[3px] bg-bg-tertiary/20" />
                      <div className="w-2.5 h-2.5 rounded-[3px] bg-purple-950/40" />
                      <div className="w-2.5 h-2.5 rounded-[3px] bg-purple-800/40" />
                      <div className="w-2.5 h-2.5 rounded-[3px] bg-purple-600/70" />
                      <div className="w-2.5 h-2.5 rounded-[3px] bg-[#7c66ff]" />
                    </div>
                    <span>More</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </main>
      </div>
    </div>
  );
}
