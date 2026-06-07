'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  Loader2, 
  Sparkles, 
  Shield, 
  BookOpen, 
  Clock, 
  FileText, 
  CheckCircle2 
} from 'lucide-react';

interface SessionLoaderProps {
  type: 'practice' | 'test';
  isDataReady: boolean;
  onFinished: () => void;
}

interface LoadingStep {
  label: string;
  minProgress: number;
  description: string;
}

export function SessionLoader({ type, isDataReady, onFinished }: SessionLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  const steps: LoadingStep[] = type === 'test' 
    ? [
        { label: 'Securing exam paper...', minProgress: 0, description: 'Downloading authentic university-level sessional PYQs...' },
        { label: 'Applying sessional constraints...', minProgress: 25, description: 'Configuring time limits, pacing metrics, and mark weightings...' },
        { label: 'Configuring anti-cheat environment...', minProgress: 50, description: 'Initializing focus trackers and browser tab-switch guards...' },
        { label: 'Shuffling question sequence...', minProgress: 75, description: 'Randomizing question order for unique sandbox iteration...' },
        { label: 'Exam Ready! Launching...', minProgress: 90, description: 'Finalizing sandbox rendering. Good luck!' }
      ]
    : [
        { label: 'Analyzing syllabus units...', minProgress: 0, description: 'Mapping selected chapters and core course topics...' },
        { label: 'Selecting practice problems...', minProgress: 25, description: 'Extracting verified questions from the subject bank...' },
        { label: 'Shuffling question sequences...', minProgress: 50, description: 'Randomizing problems to match your active progress...' },
        { label: 'Readying interactive canvas...', minProgress: 75, description: 'Pre-compiling AI grading models and hint templates...' },
        { label: 'Ready! Launching...', minProgress: 90, description: 'Session initialized. Let\'s practice!' }
      ];

  // Perceived Performance Progress Bar simulation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    const tick = () => {
      setProgress((prev) => {
        // If data is ready, zip to 100%
        if (isDataReady) {
          if (prev >= 100) {
            clearInterval(timer);
            // Wait 400ms at 100% so the user satisfies seeing it complete, then finish
            setTimeout(() => {
              onFinished();
            }, 400);
            return 100;
          }
          // Increment fast to 100
          return Math.min(100, prev + Math.floor(Math.random() * 8 + 6));
        }

        // Standard simulation (0% -> 90%)
        if (prev >= 90) {
          // Crawl extremely slowly at 90% to feel alive but not hung
          return Math.min(94, prev + 0.05);
        }

        let increment = 0;
        if (prev < 50) {
          // Shoot up fast
          increment = Math.random() * 3 + 2;
        } else if (prev < 75) {
          // Moderate pace
          increment = Math.random() * 1.5 + 0.8;
        } else {
          // Slow down towards 90%
          increment = Math.random() * 0.6 + 0.2;
        }

        return Math.min(90, prev + increment);
      });
    };

    timer = setInterval(tick, 30);
    return () => clearInterval(timer);
  }, [isDataReady, onFinished]);

  // Update current step index based on progress
  useEffect(() => {
    const current = steps.findIndex((step, idx) => {
      const nextStep = steps[idx + 1];
      if (nextStep) {
        return progress >= step.minProgress && progress < nextStep.minProgress;
      }
      return progress >= step.minProgress;
    });

    if (current !== -1 && current !== currentStepIdx) {
      setCurrentStepIdx(current);
    }
  }, [progress, steps, currentStepIdx]);

  const CenterIcon = type === 'test' ? Shield : BookOpen;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-bg-primary text-text-primary px-6 select-none overflow-hidden">
      {/* Premium ambient glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/8 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full text-center space-y-8 relative z-10">
        
        {/* Animated Central Icon with scanning laser effect */}
        <div className="relative w-24 h-24 mx-auto flex items-center justify-center rounded-2xl bg-bg-secondary border border-border-primary shadow-xl shadow-black/10 overflow-hidden group">
          {/* Laser scanning bar */}
          <motion.div 
            className="absolute inset-x-0 h-[2px] bg-accent/50 shadow-[0_0_8px_var(--accent)]"
            animate={{ 
              top: ['0%', '100%', '0%'] 
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity, 
              ease: 'easeInOut' 
            }}
          />
          
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
              opacity: [0.9, 1, 0.9]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: 'easeInOut' 
            }}
          >
            <CenterIcon className="w-10 h-10 text-accent" />
          </motion.div>
          
          {/* Decorative Corner Borders */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-accent/40 rounded-tl" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-accent/40 rounded-tr" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-accent/40 rounded-bl" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-accent/40 rounded-br" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2 className="font-display font-black text-xl tracking-tight text-text-primary uppercase flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-accent animate-pulse" />
            <span>{type === 'test' ? 'Assembling Exam Paper' : 'Preparing Practice Canvas'}</span>
          </h2>
          <p className="text-xs text-text-secondary font-medium">
            Please wait while we set up your session sandbox.
          </p>
        </div>

        {/* Dynamic Progress Bar & Percent */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center text-[10px] font-bold text-text-muted px-1">
            <span className="uppercase tracking-wider">Preparation Status</span>
            <span className="font-mono text-xs text-accent">{Math.floor(progress)}%</span>
          </div>
          
          <div className="w-full h-2 bg-bg-secondary border border-border-primary/50 rounded-full overflow-hidden p-[2px]">
            <motion.div 
              className="h-full bg-gradient-to-r from-accent/80 via-accent to-purple-500 rounded-full shadow-[0_0_8px_rgba(124,102,255,0.4)]"
              style={{ width: `${progress}%` }}
              layoutId="progressBar"
            />
          </div>
        </div>

        {/* Step-by-Step Loader Steps list */}
        <div className="rounded-2xl border border-border-primary bg-bg-secondary/60 backdrop-blur-md p-5 text-left space-y-3 shadow-lg">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block border-b border-border-primary/50 pb-2">
            Sequence Roadmap
          </span>
          
          <div className="space-y-2.5">
            {steps.map((step, idx) => {
              const isCompletedIdx = idx < currentStepIdx;
              const isActiveIdx = idx === currentStepIdx;
              
              return (
                <div 
                  key={step.label}
                  className={`flex items-start gap-3 transition-opacity duration-300 ${
                    isCompletedIdx || isActiveIdx ? 'opacity-100' : 'opacity-30'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isCompletedIdx ? (
                      <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/35">
                        <Check className="w-2.5 h-2.5 stroke-[3px]" />
                      </div>
                    ) : isActiveIdx ? (
                      <div className="w-4 h-4 rounded-full bg-accent/20 text-accent flex items-center justify-center border border-accent/35">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-bg-tertiary border border-border-primary flex items-center justify-center text-[9px] text-text-muted font-bold">
                        {idx + 1}
                      </div>
                    )}
                  </div>
                  
                  <div className="min-w-0">
                    <h4 className={`text-xs font-bold leading-tight ${isActiveIdx ? 'text-accent' : 'text-text-primary'}`}>
                      {step.label}
                    </h4>
                    {isActiveIdx && (
                      <motion.p 
                        initial={{ opacity: 0, y: -2 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[10px] text-text-secondary mt-0.5 leading-snug"
                      >
                        {step.description}
                      </motion.p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
