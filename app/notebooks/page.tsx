'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Navbar } from '@/components/navbar';
import { useAuth } from '@/components/auth-provider';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
  FolderHeart, 
  Archive, 
  ArrowUpDown, 
  Loader2, 
  BookMarked,
  HelpCircle,
  FileCheck,
  Trash2,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MathMarkdown = dynamic(() => import('@/components/math-markdown').then((mod) => mod.MathMarkdown), {
  ssr: false,
  loading: () => <div className="animate-pulse h-8 bg-bg-secondary rounded-lg border border-border-primary/50 w-full" />,
});

export default function NotebooksPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'incorrect' | 'notes'>('bookmarks');
  const { user, fbUser, loading: authLoading, refreshProfile } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotebookData = async () => {
    if (!fbUser) return;
    setLoading(true);
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch(`/api/users/notebook?type=${activeTab}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (activeTab === 'notes') {
          setItems(data.notes || []);
        } else {
          setItems(data.questions || []);
        }
      }
    } catch (err) {
      console.error("Failed to load notebook data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchNotebookData();
    }
  }, [activeTab, authLoading, fbUser]);

  const handleRemoveBookmark = async (qId: string) => {
    if (!user) return;
    const newBookmarks = (user.bookmarks || []).filter(id => id !== qId);
    try {
      const token = await fbUser?.getIdToken();
      await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookmarks: newBookmarks })
      });
      setItems(prev => prev.filter(item => item._id !== qId));
      refreshProfile();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveNote = async (qId: string) => {
    if (!user) return;
    const updatedNotes = { ...(user.personalNotes || {}) };
    delete updatedNotes[qId];
    try {
      const token = await fbUser?.getIdToken();
      await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ personalNotes: updatedNotes })
      });
      setItems(prev => prev.filter(item => item.question._id !== qId));
      refreshProfile();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex min-h-screen bg-bg-primary text-text-primary overflow-hidden relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-grow flex flex-col min-h-screen overflow-y-auto z-10">
        <Navbar onMenuToggle={() => setSidebarOpen(true)} />

        <main className="flex-grow max-w-4xl w-full mx-auto px-6 py-8 flex flex-col justify-between">
          <div className="space-y-6 flex-grow">
            {/* Header section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <FolderHeart className="w-5 h-5 text-accent animate-pulse" />
                <h2 className="font-display font-black text-lg">Notebooks & Bookmarks</h2>
              </div>
              
              <button className="p-2 rounded-lg border border-border-primary bg-bg-secondary/40 hover:bg-bg-tertiary text-xs font-semibold text-text-secondary flex items-center gap-1.5 transition-all">
                <Archive className="w-3.5 h-3.5" />
                <span>Archive</span>
              </button>
            </div>

            {/* Sub Tabs selector */}
            <div className="flex items-center gap-2 border-b border-border-primary/45 pb-3">
              {[
                { id: 'bookmarks', label: 'Bookmarked Qs', icon: BookMarked },
                { id: 'incorrect', label: 'Incorrect Answers', icon: HelpCircle },
                { id: 'notes', label: 'My Notes', icon: FileCheck }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`
                      flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border
                      ${activeTab === tab.id 
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

            {/* Loader state */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 flex-grow">
                {/* Visual empty state sleeping/studying mascot */}
                <div className="w-36 h-36 rounded-full bg-bg-secondary/45 border border-border-primary flex items-center justify-center relative shadow-inner">
                  <svg viewBox="0 0 100 100" className="w-24 h-24 text-text-muted">
                    <circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" strokeWidth="4" />
                    <path d="M 28,68 Q 50,56 72,68" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                    <line x1="50" y1="50" x2="50" y2="62" stroke="currentColor" strokeWidth="4" />
                    <path d="M 72,25 L 80,25 L 72,33 L 80,33" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-bounce" />
                    <path d="M 82,12 L 88,12 L 82,18 L 88,18" fill="none" stroke="currentColor" strokeWidth="1.5" className="animate-pulse" />
                    <path d="M 38,44 Q 42,48 46,44" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
                    <path d="M 54,44 Q 58,48 62,44" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
                  </svg>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-text-secondary leading-relaxed max-w-xs mx-auto">
                    You have not added any {activeTab === 'bookmarks' ? 'bookmarks' : activeTab === 'incorrect' ? 'incorrect attempts' : 'notes'} yet.
                  </p>
                </div>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {activeTab === 'notes' ? (
                  items.map((noteItem, idx) => (
                    <div key={idx} className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-3">
                      <div className="flex items-center justify-between border-b border-border-primary/30 pb-2">
                        <span className="text-[10px] uppercase font-black text-accent tracking-wide">
                          Unit {noteItem.question.unit} • {noteItem.question.topic}
                        </span>
                        <button
                          onClick={() => handleRemoveNote(noteItem.question._id)}
                          className="p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-rose-400 transition-colors"
                          title="Delete Note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-xs font-semibold text-text-primary">
                        <MathMarkdown content={noteItem.question.questionText} />
                      </div>
                      <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-300">
                        <div className="font-bold mb-1 flex items-center gap-1">
                          <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                          <span>My Personal Study Note:</span>
                        </div>
                        <p className="text-text-secondary whitespace-pre-wrap">{noteItem.note}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  items.map((q, idx) => (
                    <div key={idx} className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-border-primary/30 pb-2">
                        <span className="text-[10px] uppercase font-black text-text-secondary tracking-wide">
                          Unit {q.unit} • {q.topic}
                        </span>
                        
                        {activeTab === 'bookmarks' ? (
                          <button
                            onClick={() => handleRemoveBookmark(q._id)}
                            className="p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-rose-400 transition-colors"
                            title="Remove Bookmark"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400">
                            Incorrect Attempted
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-text-primary">
                        <MathMarkdown content={q.questionText} />
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </div>

          {/* Bottom Actions Bar */}
          <div className="flex items-center gap-3 border-t border-border-primary pt-4 mt-6">
            <button className="flex-1 py-2.5 rounded-xl border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary text-xs font-bold transition-all flex items-center justify-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort by Topic</span>
            </button>
            <Link 
              href="/dashboard"
              className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-accent/15"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Practice More Questions</span>
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
