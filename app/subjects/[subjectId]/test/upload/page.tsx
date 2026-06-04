'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { 
  ArrowLeft, 
  Camera, 
  UploadCloud, 
  Trash2, 
  Sparkles, 
  Loader2, 
  FileText, 
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadedImage {
  id: string;
  previewUrl: string;
  base64: string;
}

export default function TestUpload() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-secondary">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-sm">Loading upload environment...</p>
        </div>
      </div>
    }>
      <TestUploadContent />
    </Suspense>
  );
}

function TestUploadContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const subjectId = params.subjectId as string;
  const sessionId = searchParams.get('sessionId');

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [evalProgress, setEvalProgress] = useState(0);
  const [evalMessage, setEvalMessage] = useState('Initializing AI Examiner...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!sessionId) {
      router.push(`/subjects/${subjectId}`);
      return;
    }

    // Verify session
    fetch(`/api/sessions/${sessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Session not found');
        return res.json();
      })
      .then((data) => {
        if (data.session) {
          setLoading(false);
          // If session is already evaluated, redirect to summary
          if (data.session.status === 'completed' && data.session.evaluationResult) {
            router.push(`/subjects/${subjectId}/test/summary?sessionId=${sessionId}`);
          }
        } else {
          router.push(`/subjects/${subjectId}`);
        }
      })
      .catch((err) => {
        console.error('Error verifying upload session:', err);
        router.push(`/subjects/${subjectId}`);
      });
  }, [subjectId, sessionId, router]);

  // Handle progress animation during AI evaluation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (evaluating) {
      interval = setInterval(() => {
        setEvalProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          // Increment progress incrementally
          const diff = Math.random() * 8;
          const next = prev + diff;
          
          // Dynamic messages based on progress percentage
          if (next > 80) setEvalMessage('Synthesizing rubric scoring & grading feedback...');
          else if (next > 50) setEvalMessage('Scanning structural formulas & handwriting strokes...');
          else if (next > 20) setEvalMessage('Running high-accuracy OCR text transcription...');
          
          return next;
        });
      }, 800);
    }
    return () => clearInterval(interval);
  }, [evaluating]);

  const processFiles = (files: FileList | null) => {
    if (!files) return;
    setErrorMsg(null);

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Only image uploads are allowed.');
        return;
      }
      
      // Limit file size to 8MB
      if (file.size > 8 * 1024 * 1024) {
        setErrorMsg('Images must be smaller than 8MB each.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            previewUrl: URL.createObjectURL(file),
            base64: base64String
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCameraSnap = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
  };

  const handleFileChoose = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
  };

  const handleAIRegistration = async () => {
    if (images.length === 0) {
      setErrorMsg('Please upload at least one page of your answer sheet.');
      return;
    }

    setEvaluating(true);
    setEvalProgress(10);
    setEvalMessage('Uploading answer sheets securely to session server...');

    try {
      const base64ImagesOnly = images.map((img) => img.base64);

      // 1. Save uploadedImages base64 strings to session in DB
      const sessionUpdateRes = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadedImages: base64ImagesOnly
        })
      });

      if (!sessionUpdateRes.ok) {
        throw new Error('Failed to synchronize images on session');
      }

      // 2. Trigger the AI examiner valuation route
      setEvalProgress(35);
      setEvalMessage('AI Examiner active. Performing transcription and OCR...');

      const evaluateRes = await fetch('/api/ai/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      if (!evaluateRes.ok) {
        const errJson = await evaluateRes.json();
        throw new Error(errJson.error || 'AI multimodal evaluation failed');
      }

      setEvalProgress(100);
      setEvalMessage('Grading sheet compiled! Generating results...');
      
      // Delay navigation briefly for smooth transition
      setTimeout(() => {
        router.push(`/subjects/${subjectId}/test/summary?sessionId=${sessionId}`);
      }, 1000);

    } catch (err: unknown) {
      console.error('Grading submission error:', err);
      setErrorMsg((err as Error).message || 'System error grading your sheets. Please retry.');
      setEvaluating(false);
      setEvalProgress(0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
          <p className="text-xs text-text-secondary">Verifying timed test session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between transition-colors duration-300 relative overflow-hidden bg-bg-primary text-text-primary">
      {/* ambient space glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[140px] pointer-events-none dark:block hidden"></div>

      {/* Top Navbar */}
      <header className="border-b border-border-primary/50 bg-bg-primary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href={`/subjects/${subjectId}/test/solve?sessionId=${sessionId}`} 
              className="p-2 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <nav className="flex items-center space-x-1.5 text-xs text-text-secondary font-medium">
              <span className="text-accent font-bold uppercase tracking-wider">Timed Test Ingestion</span>
            </nav>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-4xl w-full mx-auto px-6 py-12 relative z-10">
        <AnimatePresence mode="wait">
          {!evaluating ? (
            <motion.div
              key="upload-ui"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Header */}
              <div className="text-center space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded badge-premium text-accent bg-accent/10 border border-accent/25">
                  AI Multimodal Evaluation Arena
                </span>
                <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-text-primary">
                  Upload Answer Sheets
                </h1>
                <p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
                  Snap high-contrast photos or upload images of your physical answer sheet. The vision AI scans each page, identifies question responses, and grades them.
                </p>
              </div>

              {/* Error messages */}
              {errorMsg && (
                <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-xs flex items-start space-x-2.5 max-w-xl mx-auto shadow-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold">Grading Check Blocked</h5>
                    <p className="mt-0.5 leading-relaxed">{errorMsg}</p>
                  </div>
                </div>
              )}

              {/* Visual uploading actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
                {/* Camera Snapper Button */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-6 rounded-2xl border border-dashed border-accent/40 bg-accent/5 hover:bg-accent/10 hover:border-accent flex flex-col items-center justify-center text-center group transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-3 group-hover:scale-105 transition-transform duration-200">
                    <Camera className="w-5 h-5 animate-pulse" />
                  </div>
                  <span className="text-xs font-bold text-text-primary">Capture with Camera</span>
                  <span className="text-[10px] text-text-secondary mt-1">Snap pages in sequence using phone camera</span>
                </button>

                {/* Local Folder Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 rounded-2xl border border-dashed border-border-primary bg-bg-secondary/40 hover:bg-bg-tertiary/60 hover:border-accent/40 flex flex-col items-center justify-center text-center group transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="w-12 h-12 rounded-xl bg-bg-primary border border-border-primary flex items-center justify-center text-text-secondary mb-3 group-hover:scale-105 transition-transform duration-200">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-text-primary">Browse Files</span>
                  <span className="text-[10px] text-text-secondary mt-1">Select existing image files from directory</span>
                </button>

                {/* Hidden input tags */}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cameraInputRef}
                  onChange={handleCameraSnap}
                  className="hidden"
                />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileChoose}
                  className="hidden"
                />
              </div>

              {/* Visual Guidelines */}
              <div className="max-w-xl mx-auto p-4 rounded-xl border border-border-primary bg-bg-secondary/30 text-[10px] text-text-secondary flex items-start space-x-2.5 shadow-sm leading-relaxed">
                <Sparkles className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-extrabold text-text-primary uppercase tracking-wider block">Best Grading Scan Guidelines:</span>
                  <p>1. Ensure sheets are flat with bright, uniform lighting (avoid shadows).</p>
                  <p>2. Keep pages oriented upright. AI vision expects normal reading text flow.</p>
                  <p>3. Snap pages sequentially (e.g., Page 1, Page 2, Page 3...) for seamless exam flow mapping.</p>
                </div>
              </div>

              {/* Preview Grid */}
              {images.length > 0 && (
                <div className="space-y-4 pt-6 border-t border-border-primary/40">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-extrabold text-xs uppercase tracking-wider text-text-secondary flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-accent" />
                      <span>Uploaded Sheets ({images.length} pages)</span>
                    </h3>
                    <button
                      onClick={() => setImages([])}
                      className="text-[10px] font-bold text-red-500 hover:underline flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear All</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {images.map((img, idx) => (
                      <motion.div
                        key={img.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative group rounded-xl overflow-hidden border border-border-primary bg-bg-secondary flex flex-col shadow-sm transition-all"
                      >
                        <div className="aspect-[3/4] relative w-full overflow-hidden bg-black/10">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.previewUrl}
                            alt={`Sheet Page ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <span className="absolute top-2 left-2 text-[8px] font-extrabold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white border border-white/10 uppercase tracking-widest z-10">
                            Page {idx + 1}
                          </span>
                        </div>
                        <div className="p-2 border-t border-border-primary/50 flex justify-between items-center bg-bg-secondary/80 backdrop-blur-sm">
                          <span className="text-[8px] text-text-muted font-mono truncate max-w-[100px]">Sheet ID: {img.id.split('-')[0]}</span>
                          <button
                            type="button"
                            onClick={() => removeImage(img.id)}
                            className="p-1.5 rounded-md hover:bg-red-500/10 text-text-secondary hover:text-red-500 transition-colors"
                            title="Remove Page"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Submission Action */}
                  <div className="flex justify-center pt-8">
                    <button
                      onClick={handleAIRegistration}
                      className="px-8 py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-xs transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2.5 hover:-translate-y-0.5"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Submit for AI Grading</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            /* Glowing Loading Bar during AI grading */
            <motion.div
              key="grading-loader"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto py-20 px-8 rounded-2xl border border-border-primary/80 bg-bg-secondary/60 backdrop-blur-sm shadow-[0_0_50px_rgba(0,0,0,0.3)] space-y-8 text-center relative overflow-hidden"
            >
              {/* Pulsing glow under the loader */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-accent/10 rounded-full blur-[40px] pointer-events-none animate-pulse"></div>

              <div className="relative z-10 space-y-6">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-accent/5 border border-accent/25 flex items-center justify-center text-accent shadow-md shadow-accent/5">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>

                <div className="space-y-2">
                  <h3 className="font-display font-extrabold text-base text-text-primary">Grading In Progress</h3>
                  <p className="text-xs text-text-secondary leading-relaxed max-w-xs mx-auto">
                    The Llama 3.2 Multimodal Vision Engine is actively scanning your physical sheets to compile detailed grading and feedback.
                  </p>
                </div>

                {/* Progress bar container */}
                <div className="space-y-2.5 pt-4">
                  <div className="h-2 w-full rounded-full bg-bg-primary border border-border-primary overflow-hidden relative">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-accent shadow-[0_0_12px_rgba(124,102,255,0.8)]"
                      style={{ width: `${evalProgress}%` }}
                      transition={{ ease: 'easeOut', duration: 0.4 }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[9px] uppercase tracking-wider font-extrabold font-mono text-text-muted">
                    <span className="animate-pulse">{evalMessage}</span>
                    <span>{Math.round(evalProgress)}%</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-primary/50 bg-bg-secondary/20 py-6 text-center text-xs text-text-secondary">
        <p>PaperHub-web Visual Grading • Secure SSL encryption actively shielding uploads.</p>
      </footer>
    </div>
  );
}
