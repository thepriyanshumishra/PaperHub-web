'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/sidebar';
import { Navbar } from '@/components/navbar';
import { 
  FileText, 
  Wrench, 
  Flame, 
  ChevronRight, 
  ArrowUpRight,
  BookOpen,
  Calendar,
  Clock,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TestsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  
  // Custom test configuration state
  const [customQuestions, setCustomQuestions] = useState(15);
  const [customDuration, setCustomDuration] = useState(30);

  const mockTestSeries = [
    { title: 'B.Tech Sem 1 Mid-Term Test Series 2026', count: '1,240+ students took this' },
    { title: 'B.Tech Semester End Mock Exams 2026', count: '890+ students took this' },
    { title: 'MMMUT CSE Subject-wise Practice Tests', count: '1,500+ students took this' }
  ];

  return (
    <div className="flex min-h-screen bg-bg-primary text-text-primary overflow-hidden relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-grow flex flex-col min-h-screen overflow-y-auto z-10">
        <Navbar onMenuToggle={() => setSidebarOpen(true)} />

        <main className="flex-grow max-w-4xl w-full mx-auto px-6 py-8 space-y-8">
          
          <div className="flex items-center space-x-2.5">
            <ClipboardList className="w-5 h-5 text-accent" />
            <h2 className="font-display font-black text-lg">PaperHub Tests</h2>
          </div>

          <AnimatePresence mode="wait">
            {!isCreatingCustom ? (
              <motion.div 
                key="menu"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Visual grid layout matching the ideas mock tests layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Create Custom Test Card */}
                  <button 
                    onClick={() => setIsCreatingCustom(true)}
                    className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/45 hover:bg-bg-secondary hover:border-blue-500/25 transition-all text-left flex items-start justify-between group shadow-sm"
                  >
                    <div className="space-y-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                        <Wrench className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-sm text-text-primary group-hover:text-blue-400 transition-colors flex items-center gap-1">
                          <span>Create Your Own Test</span>
                          <ChevronRight className="w-4 h-4" />
                        </h3>
                        <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                          580+ students configured a Custom Test in last hour!
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  {/* PYQ Mock Tests Card */}
                  <button 
                    className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/45 hover:bg-bg-secondary hover:border-pink-500/25 transition-all text-left flex items-start justify-between group shadow-sm"
                  >
                    <div className="space-y-4">
                      <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/15 flex items-center justify-center text-pink-400 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-sm text-text-primary group-hover:text-pink-400 transition-colors flex items-center gap-1">
                          <span>PYQ Mock Tests</span>
                          <ChevronRight className="w-4 h-4" />
                        </h3>
                        <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                          548+ students started a Mock Exam in last hour!
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>

                {/* Test Series section */}
                <div className="space-y-4 pt-4">
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-muted">PaperHub Trusted Test Series</h3>
                  <div className="space-y-3.5">
                    {mockTestSeries.map((series, idx) => (
                      <div 
                        key={idx}
                        className="p-4 rounded-xl border border-border-primary bg-bg-secondary/20 flex items-center justify-between hover:bg-bg-secondary hover:border-accent/25 transition-all group"
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/15 flex items-center justify-center text-accent">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-display font-bold text-xs text-text-primary group-hover:text-accent transition-colors">{series.title}</h4>
                            <p className="text-[9px] text-text-muted mt-0.5">{series.count}</p>
                          </div>
                        </div>
                        <button className="text-[10px] font-bold text-text-muted group-hover:text-accent hover:underline flex items-center gap-0.5">
                          <span>View Details</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              // Custom Test configurator Wizard
              <motion.div 
                key="custom-creator"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-6 max-w-xl mx-auto"
              >
                <div className="flex items-center justify-between border-b border-border-primary/45 pb-4">
                  <h3 className="font-display font-bold text-sm text-text-primary">Configure Custom Mock Quiz</h3>
                  <button 
                    onClick={() => setIsCreatingCustom(false)}
                    className="text-xs font-bold text-accent hover:underline"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-5">
                  {/* Select parameters */}
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Number of Questions</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[5, 10, 15, 30].map(n => (
                        <button
                          key={n}
                          onClick={() => setCustomQuestions(n)}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all ${customQuestions === n ? 'bg-accent/10 border-accent/25 text-accent' : 'border-border-primary bg-bg-primary/50 text-text-secondary hover:text-text-primary'}`}
                        >
                          {n} Qs
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Duration (Minutes)</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[15, 30, 45, 60].map(m => (
                        <button
                          key={m}
                          onClick={() => setCustomDuration(m)}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all ${customDuration === m ? 'bg-accent/10 border-accent/25 text-accent' : 'border-border-primary bg-bg-primary/50 text-text-secondary hover:text-text-primary'}`}
                        >
                          {m} Mins
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4.5 rounded-xl border border-accent/15 bg-accent/5 text-xs text-accent font-semibold leading-relaxed flex items-start gap-2.5">
                    <Clock className="w-4 h-4 shrink-0 mt-0.5 animate-pulse" />
                    <span>This quiz will compile university questions based on your active semester subjects.</span>
                  </div>

                  <button 
                    onClick={() => {
                      // Generate and start custom test logic placeholder
                      alert(`Generating custom quiz with ${customQuestions} questions and ${customDuration} minute timer.`);
                      setIsCreatingCustom(false);
                    }}
                    className="w-full py-3 rounded-xl bg-accent text-white hover:bg-accent-hover text-xs font-bold transition-all shadow-md"
                  >
                    Start Test Session
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
