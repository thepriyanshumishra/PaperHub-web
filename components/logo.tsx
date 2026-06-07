import React from 'react';

interface PaperHubLogoProps {
  className?: string;
}

export function PaperHubLogo({ className = "" }: PaperHubLogoProps) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Premium SVG Logo: Overlapping document sheets forming a stylized P */}
      <svg 
        viewBox="0 0 32 32" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-8 h-8 transition-transform duration-300 group-hover:scale-105"
      >
        <defs>
          <linearGradient id="paperhub-accent-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--logo-stop-1, #7c66ff)" />
            <stop offset="100%" stopColor="var(--logo-stop-2, #f97316)" />
          </linearGradient>
          <filter id="logo-drop-shadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.15" />
          </filter>
        </defs>
        
        {/* Back sheet (representing archive) */}
        <path 
          d="M7 9C7 7.89543 7.89543 7 9 7H17L23 13V23C23 24.1046 22.1046 25 21 25H9C7.89543 25 7 24.1046 7 23V9Z" 
          fill="currentColor"
          className="text-bg-secondary border border-border-primary/20"
          opacity="0.6"
        />
        
        {/* Front sheet (vibrant, representing active exam study) */}
        <path 
          d="M10 6C10 4.89543 10.8954 4 12 4H20L26 10V24C26 25.1046 25.1046 26 24 26H12C10.8954 26 10 25.1046 10 24V6Z" 
          fill="url(#paperhub-accent-grad)"
          filter="url(#logo-drop-shadow)"
        />
        
        {/* Folded corner on front sheet */}
        <path 
          d="M20 4V8C20 9.10457 20.8954 10 22 10H26L20 4Z" 
          fill="white" 
          opacity="0.35"
        />
        
        {/* Stylized 'P' letter mark cut out of the front sheet */}
        <path 
          d="M14 11H18C19.6569 11 21 12.3431 21 14C21 15.6569 19.6569 17 18 17H16V21H14V11ZM16 13V15H18C18.5523 15 19 14.5523 19 14C19 13.4477 18.5523 13 18 13H16Z" 
          fill="white" 
        />
      </svg>
    </div>
  );
}

