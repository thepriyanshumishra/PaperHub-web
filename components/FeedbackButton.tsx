'use client';

import React, { useState } from 'react';
import { MessageSquarePlus, X, Send, Loader2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/auth-provider';
import { usePathname } from 'next/navigation';

const CATEGORIES = [
  { value: 'bug', label: '🐛 Bug Report', color: 'text-red-400' },
  { value: 'feature_request', label: '✨ Feature Request', color: 'text-purple-400' },
  { value: 'content_quality', label: '📝 Content Quality', color: 'text-amber-400' },
  { value: 'ui_ux', label: '🎨 UI/UX', color: 'text-blue-400' },
  { value: 'performance', label: '⚡ Performance', color: 'text-emerald-400' },
  { value: 'other', label: '💬 Other', color: 'text-text-secondary' },
];

export function FeedbackButton() {
  const { fbUser } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Don't show on login/onboarding pages
  if (pathname === '/login' || pathname === '/onboarding') return null;
  // Don't show if not authenticated
  if (!fbUser) return null;

  const resetForm = () => {
    setCategory('');
    setTitle('');
    setDescription('');
    setError('');
    setSuccess(false);
  };

  const handleSubmit = async () => {
    if (!category || !title.trim() || !description.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const idToken = await fbUser.getIdToken();
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ category, title: title.trim(), description: description.trim(), page: pathname }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit feedback.');
      }

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        resetForm();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => { setOpen(true); resetForm(); }}
        className="fixed bottom-6 right-6 z-40 p-3.5 rounded-full bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-all hover:scale-105 active:scale-95"
        aria-label="Send feedback"
        title="Send feedback"
      >
        <MessageSquarePlus className="w-5 h-5" />
      </button>

      {/* Feedback Modal */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setOpen(false); resetForm(); }} />
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-bg-secondary border border-border-primary rounded-2xl shadow-2xl p-6 space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquarePlus className="w-5 h-5 text-accent" />
                  <h3 className="font-display font-bold text-sm text-text-primary">Share Feedback</h3>
                </div>
                <button
                  onClick={() => { setOpen(false); resetForm(); }}
                  className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {success ? (
                <div className="py-8 text-center space-y-3">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
                  <p className="text-sm font-bold text-text-primary">Thank you for your feedback!</p>
                  <p className="text-xs text-text-secondary">We'll review it shortly.</p>
                </div>
              ) : (
                <>
                  {/* Category selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Category</label>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setCategory(cat.value)}
                          className={`px-3 py-2 rounded-xl border text-xs font-semibold text-left transition-all ${
                            category === cat.value
                              ? 'bg-accent/10 border-accent text-accent'
                              : 'bg-bg-primary/30 border-border-primary/50 text-text-secondary hover:bg-bg-tertiary/30'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Brief summary..."
                      maxLength={200}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border-primary bg-bg-primary/50 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Details</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what happened or what you'd like to see..."
                      maxLength={2000}
                      rows={4}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border-primary bg-bg-primary/50 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all resize-none"
                    />
                  </div>

                  {/* Page context */}
                  <p className="text-[9px] text-text-muted">📍 Sending from: {pathname}</p>

                  {error && (
                    <p className="text-xs text-red-400 font-semibold">{error}</p>
                  )}

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...</>
                    ) : (
                      <><Send className="w-3.5 h-3.5" /> Submit Feedback</>
                    )}
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
