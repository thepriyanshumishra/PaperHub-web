'use client';

import React from 'react';
import { useAuth } from '@/components/auth-provider';
import { AlertTriangle, LogOut } from 'lucide-react';

export function StatusGuard({ children }: { children: React.ReactNode }) {
  const { error, fbUser, logout, loading } = useAuth();

  const isBlocked = error?.includes('suspended') || error?.includes('banned');

  if (loading) {
    return <>{children}</>;
  }

  if (fbUser && isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary p-6 relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="w-full max-w-md p-8 rounded-3xl border border-red-500/20 bg-bg-secondary/40 backdrop-blur-md shadow-2xl relative z-10 text-center space-y-6 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500 mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h1 className="font-display font-extrabold text-xl tracking-tight text-red-500">Access Restricted</h1>
            <p className="text-xs text-text-secondary leading-relaxed">
              {error || 'Your account has been suspended or banned due to a violation of our community terms.'}
            </p>
          </div>

          <div className="pt-4 border-t border-border-primary/50 font-sans">
            <button
              onClick={() => logout()}
              className="w-full py-3 px-4 rounded-xl bg-bg-tertiary hover:bg-bg-tertiary/80 text-text-primary text-xs font-bold transition-all flex items-center justify-center space-x-2 border border-border-primary"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
export default StatusGuard;
