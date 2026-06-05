'use client';

import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display font-black text-2xl">Something went wrong</h1>
          <p className="text-sm text-text-secondary">
            An unexpected error occurred. Please try again or return to the homepage.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Try Again
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl border border-border-primary hover:bg-bg-tertiary text-text-secondary text-xs font-semibold transition-all flex items-center gap-2"
          >
            <Home className="w-3.5 h-3.5" /> Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
