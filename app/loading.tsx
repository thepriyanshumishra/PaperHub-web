import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 mx-auto rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center animate-pulse">
          <span className="font-display font-bold text-accent text-lg">P</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-xs text-text-muted font-medium">Loading PaperHub...</p>
      </div>
    </div>
  );
}
