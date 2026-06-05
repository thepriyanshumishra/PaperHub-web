'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/sidebar';
import { Navbar } from '@/components/navbar';
import { seedColleges } from '@/lib/seedData';
import { 
  ArrowLeft, 
  ChevronRight, 
  HelpCircle, 
  CheckCircle2, 
  Target, 
  Sparkles,
  TrendingUp,
  FileCheck,
  Video,
  Bookmark,
  ChevronDown,
  Layers,
  Award,
  BookMarked,
  X,
  Play,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChapterDashboard() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.subjectId as string;
  const chapterId = params.chapterId as string;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'all' | 'topic' | 'bookmarks' | 'mistakes' | 'history'>('overview');
  
  // Topic-wise tab filters
  const [syllabusFilter, setSyllabusFilter] = useState<'all' | 'as-per' | 'removed' | 'reduced'>('all');

  const [subjectName, setSubjectName] = useState('Syllabus Topic');
  const [unitTitle, setUnitTitle] = useState(`Unit ${chapterId}`);
  const [unitTopics, setUnitTopics] = useState<string[]>([]);

  useEffect(() => {
    const college = localStorage.getItem('selectedCollege') || 'MMMUT';
    const branch = localStorage.getItem('selectedBranch') || 'CSE';
    
    // Find unit syllabus mapping
    const col = seedColleges.find((c) => c.code === college);
    const br = col?.branches.find((b) => b.code === branch);
    const sub = br?.subjects.find((s) => s.code === subjectId || `mock-${s.code}` === subjectId);
    
    if (sub) {
      setSubjectName(sub.name);
      const unitNum = Number(chapterId);
      const matchedUnit = sub.syllabus.find(u => u.unitNumber === unitNum);
      if (matchedUnit) {
        setUnitTitle(matchedUnit.unitTitle);
        setUnitTopics(matchedUnit.topics);
      }
    }
  }, [subjectId, chapterId]);

  const mockQuestions = [
    { id: 1, text: 'Determine the equivalent resistance of the electrical bridge circuit when the balancing parameter $\\lambda = 4$ is applied.', shift: 'Mid-Sem 2025 (CSE Shift 1)', hasVideo: true },
    { id: 2, text: 'State and prove the Superposition Theorem for a linear active network operating in steady-state AC conditions.', shift: 'End-Sem 2024 (ECE Shift 2)', hasVideo: false },
    { id: 3, text: 'Write a program in C language to perform matrix multiplication using pointer arithmetic and dynamic memory allocation.', shift: 'Carry-Over Exam 2025', hasVideo: true }
  ];

  return (
    <div className="flex min-h-screen bg-bg-primary text-text-primary overflow-hidden relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-grow flex flex-col min-h-screen overflow-y-auto z-10">
        <Navbar onMenuToggle={() => setSidebarOpen(true)} />

        <main className="flex-grow max-w-6xl w-full mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Left Sub-navigation Picker Panel */}
            <div className="lg:col-span-1 space-y-6 text-left">
              <div className="p-4 rounded-xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4">
                <div className="flex items-center space-x-2.5">
                  <Link 
                    href={`/subjects/${subjectId}`}
                    className="p-1.5 rounded-lg border border-border-primary bg-bg-primary/50 text-text-secondary hover:text-text-primary transition-all"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </Link>
                  <div>
                    <h3 className="font-display font-extrabold text-xs text-text-primary line-clamp-1">{unitTitle}</h3>
                    <p className="text-[9px] text-text-muted mt-0.5">{subjectName}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  {[
                    { id: 'overview', label: 'Overview', icon: Layers },
                    { id: 'all', label: 'All PYQs', icon: FileText },
                    { id: 'topic', label: 'Topic-wise PYQs', icon: BookMarked },
                    { id: 'bookmarks', label: 'Bookmarked Qs', icon: Bookmark },
                    { id: 'mistakes', label: 'My Mistakes', icon: HelpCircle },
                    { id: 'history', label: 'Test History', icon: Award, labelBadge: 'NEW' }
                  ].map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id as any)}
                        className={`
                          w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all
                          ${activeSubTab === tab.id
                            ? 'bg-accent/10 border-accent/25 text-accent shadow-xs'
                            : 'border-transparent text-text-secondary hover:bg-bg-tertiary/45 hover:text-text-primary'
                          }
                        `}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className="w-3.5 h-3.5" />
                          <span>{tab.label}</span>
                        </span>
                        {tab.labelBadge && (
                          <span className="text-[8px] font-black bg-accent/15 text-accent px-1 rounded">{tab.labelBadge}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Sub-Tab panels */}
            <div className="lg:col-span-3 space-y-6">
              
              <AnimatePresence mode="wait">
                {/* ── Overview Tab ── */}
                {activeSubTab === 'overview' && (
                  <motion.div 
                    key="overview"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-6"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-accent">Unit {chapterId}</span>
                      <h2 className="font-display font-black text-xl leading-none">{unitTitle} Overview</h2>
                    </div>

                    {/* Progress grid */}
                    <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm grid grid-cols-3 gap-4 text-center">
                      <div className="space-y-1">
                        <HelpCircle className="w-4 h-4 text-blue-400 mx-auto" />
                        <h4 className="font-display font-black text-sm text-text-primary">0 / 24</h4>
                        <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">PYQ Solved</p>
                      </div>
                      <div className="space-y-1 border-x border-border-primary/50">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                        <h4 className="font-display font-black text-sm text-text-primary">0 / 24</h4>
                        <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Correct Qs</p>
                      </div>
                      <div className="space-y-1">
                        <Target className="w-4 h-4 text-amber-500 mx-auto" />
                        <h4 className="font-display font-black text-sm text-text-primary">0%</h4>
                        <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Accuracy</p>
                      </div>
                    </div>

                    {/* All PYQs / Topic Banners */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button 
                        onClick={() => setActiveSubTab('all')}
                        className="p-5 rounded-xl border border-border-primary bg-bg-secondary/45 hover:bg-bg-secondary hover:border-accent/25 transition-all text-left flex items-start justify-between group shadow-xs"
                      >
                        <div>
                          <h4 className="font-display font-extrabold text-xs text-text-primary group-hover:text-accent transition-colors flex items-center gap-1.5">
                            <span>All Previous Year Qs</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </h4>
                          <p className="text-[9px] text-text-muted mt-1">24 questions mapped from previous papers</p>
                        </div>
                      </button>
                      
                      <button 
                        onClick={() => setActiveSubTab('topic')}
                        className="p-5 rounded-xl border border-border-primary bg-bg-secondary/45 hover:bg-bg-secondary hover:border-accent/25 transition-all text-left flex items-start justify-between group shadow-xs"
                      >
                        <div>
                          <h4 className="font-display font-extrabold text-xs text-text-primary group-hover:text-accent transition-colors flex items-center gap-1.5">
                            <span>Topic-wise PYQs</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </h4>
                          <p className="text-[9px] text-text-muted mt-1">{unitTopics.length} topics mapped under syllabus</p>
                        </div>
                      </button>
                    </div>

                    {/* Difficulty Buckets */}
                    <div className="space-y-3">
                      <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-muted">Difficulty Wise Qs Buckets</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { label: 'Beginner', desc: '8 Easy Qs', emoji: '☀️', color: 'border-blue-500/15 hover:border-blue-500/25' },
                          { label: 'Target Exam', desc: '12 Moderate Qs', emoji: '🎯', color: 'border-emerald-500/15 hover:border-emerald-500/25' },
                          { label: 'Advance Climb', desc: '4 Tough Qs', emoji: '🏔️', color: 'border-purple-500/15 hover:border-purple-500/25' }
                        ].map((item, idx) => (
                          <div 
                            key={idx}
                            className={`p-4 rounded-xl border bg-bg-secondary/35 text-left flex items-center space-x-3 cursor-default hover:bg-bg-secondary transition-all group ${item.color}`}
                          >
                            <span className="text-lg">{item.emoji}</span>
                            <div>
                              <h4 className="font-display font-bold text-xs text-text-primary group-hover:text-accent transition-colors leading-none">{item.label}</h4>
                              <p className="text-[9px] text-text-muted mt-1">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Chapter Trends line chart placeholder */}
                    <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-border-primary/45 pb-3">
                        <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-primary flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-accent" />
                          <span>PYQ Trends (Year-wise frequency)</span>
                        </h3>
                        <span className="text-[9px] font-bold text-text-muted">Last 3 Years</span>
                      </div>
                      
                      {/* Visual placeholder line chart */}
                      <div className="h-32 flex items-end justify-between px-4 pt-4 border-b border-border-primary/35 relative">
                        {[
                          { year: '2024', count: 4, height: 'h-12' },
                          { year: '2025', count: 8, height: 'h-24' },
                          { year: '2026', count: 12, height: 'h-28' }
                        ].map((col, idx) => (
                          <div key={idx} className="flex flex-col items-center gap-1.5 w-16">
                            <span className="text-[9px] font-bold text-accent">{col.count} Qs</span>
                            <div className={`w-3.5 bg-accent/25 border-t border-accent rounded-t-sm transition-all hover:bg-accent/40 ${col.height}`} />
                            <span className="text-[9px] font-bold text-text-muted mt-1">{col.year}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── All PYQs Tab ── */}
                {activeSubTab === 'all' && (
                  <motion.div 
                    key="all"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-5"
                  >
                    {/* Launch Action Banners */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Link 
                        href={`/subjects/${subjectId}/practice`}
                        className="p-4 rounded-xl border border-emerald-500/15 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all text-left flex items-center justify-between group shadow-xs"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <Play className="w-3.5 h-3.5 fill-emerald-400/20" />
                          </div>
                          <div>
                            <h4 className="font-display font-extrabold text-xs text-text-primary group-hover:text-emerald-400 transition-colors leading-none">Practice Chapter</h4>
                            <p className="text-[9px] text-text-muted mt-1 leading-none">Study step-by-step with AI</p>
                          </div>
                        </div>
                      </Link>

                      <Link 
                        href={`/subjects/${subjectId}/test`}
                        className="p-4 rounded-xl border border-purple-500/15 bg-purple-500/5 hover:bg-purple-500/10 transition-all text-left flex items-center justify-between group shadow-xs"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center text-purple-400">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h4 className="font-display font-extrabold text-xs text-text-primary group-hover:text-purple-400 transition-colors leading-none">Take Chapter Test</h4>
                            <p className="text-[9px] text-text-muted mt-1 leading-none">Simulate exam timing</p>
                          </div>
                        </div>
                      </Link>
                    </div>

                    {/* Question items list */}
                    <div className="space-y-3.5">
                      {mockQuestions.map((q, idx) => (
                        <div 
                          key={q.id}
                          className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/45 flex flex-col justify-between gap-4 text-left group hover:bg-bg-secondary hover:border-accent/25 transition-all"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start space-x-3.5">
                              <span className="font-display font-black text-xs text-text-muted mt-0.5">{idx + 1}</span>
                              <p className="text-xs text-text-primary leading-relaxed">{q.text}</p>
                            </div>
                            <button className="text-text-muted hover:text-accent shrink-0 mt-0.5">
                              <Bookmark className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="flex items-center justify-between border-t border-border-primary/45 pt-3 text-[10px] font-bold text-text-muted">
                            <span>{q.shift}</span>
                            {q.hasVideo && (
                              <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                                <Video className="w-3 h-3" />
                                <span>Video Solution</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* ── Topic-wise Tab ── */}
                {activeSubTab === 'topic' && (
                  <motion.div 
                    key="topic"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-5"
                  >
                    {/* Syllabus Status Filters */}
                    <div className="flex items-center space-x-2 border-b border-border-primary/45 pb-3.5">
                      {[
                        { id: 'all', label: 'All Topics' },
                        { id: 'as-per', label: 'As per Syllabus' },
                        { id: 'reduced', label: 'Reduced' },
                        { id: 'removed', label: 'Removed' }
                      ].map(f => (
                        <button
                          key={f.id}
                          onClick={() => setSyllabusFilter(f.id as any)}
                          className={`
                            px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all
                            ${syllabusFilter === f.id 
                              ? 'bg-accent/10 border-accent/25 text-accent' 
                              : 'border-transparent text-text-secondary hover:bg-bg-tertiary/40 hover:text-text-primary'
                            }
                          `}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {/* Topics lists checklist */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                      {unitTopics.map((topic, idx) => (
                        <div 
                          key={idx}
                          className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/45 flex items-center justify-between hover:bg-bg-secondary hover:border-accent/25 transition-all group"
                        >
                          <div className="space-y-1.5">
                            <h4 className="font-display font-extrabold text-xs text-text-primary group-hover:text-accent transition-colors leading-snug">{topic}</h4>
                            <p className="text-[9px] text-text-muted font-bold">12 questions mapped</p>
                          </div>
                          {idx % 2 === 0 && (
                            <span className="text-[8px] font-black uppercase tracking-wider bg-amber-500/10 border border-amber-500/25 text-amber-500 px-1.5 py-0.5 rounded">Must Do</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Empty State placeholders for bookmarks / mistakes / test history */}
                {['bookmarks', 'mistakes', 'history'].includes(activeSubTab) && (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-16 text-center border border-dashed border-border-primary rounded-2xl bg-bg-secondary/20 space-y-3.5"
                  >
                    <BookMarked className="w-8 h-8 text-text-muted mx-auto" />
                    <h4 className="text-sm font-bold text-text-secondary capitalize">No {activeSubTab} stored</h4>
                    <p className="text-xs text-text-muted max-w-xs mx-auto leading-relaxed">
                      Practice syllabus units to flag bookmarks, track mistakes, or log mock test history parameters.
                    </p>
                  </motion.div>
                )}

              </AnimatePresence>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
