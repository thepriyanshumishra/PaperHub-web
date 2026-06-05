'use client';

import React from 'react';

interface BetaBadgeProps {
  size?: 'sm' | 'md';
  className?: string;
}

export function BetaBadge({ size = 'sm', className = '' }: BetaBadgeProps) {
  const sizeClasses = size === 'sm'
    ? 'text-[8px] px-1.5 py-0.5'
    : 'text-[10px] px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center font-extrabold uppercase tracking-widest rounded-md border
        bg-gradient-to-r from-purple-500/10 to-accent/10
        border-purple-500/25 text-purple-400
        select-none ${sizeClasses} ${className}`}
      title="Free during beta!"
    >
      BETA
    </span>
  );
}
