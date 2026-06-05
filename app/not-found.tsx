import React from 'react';
import { FileQuestion } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
          <FileQuestion className="w-8 h-8 text-accent" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display font-black text-5xl text-accent">404</h1>
          <h2 className="font-display font-bold text-xl">Page Not Found</h2>
          <p className="text-sm text-text-secondary">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all shadow-md"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
