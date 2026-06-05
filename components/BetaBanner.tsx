'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Rocket, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BANNER_DISMISSED_KEY = 'paperhub_beta_banner_dismissed';

export function BetaBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="relative bg-gradient-to-r from-purple-500/10 via-accent/10 to-purple-500/10 border-b border-purple-500/20">
            <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-xs">
                <Rocket className="w-4 h-4 text-purple-400 shrink-0" />
                <p className="text-text-primary font-semibold">
                  <span className="font-extrabold text-purple-400">Welcome to the PaperHub Beta!</span>
                  {' '}All Pro features are free during the beta period.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href="/pricing"
                  className="hidden sm:inline-flex text-[10px] font-bold text-accent hover:text-accent-hover transition-colors"
                >
                  View Plans
                </Link>
                <button
                  onClick={dismiss}
                  className="p-1 rounded-md hover:bg-bg-tertiary/50 text-text-muted hover:text-text-secondary transition-colors"
                  aria-label="Dismiss beta banner"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
