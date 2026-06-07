'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { seedColleges } from '@/lib/seedData';
import { ArrowLeft, Play, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

interface SubjectDetail {
  _id: string;
  name: string;
  code: string;
  syllabus: {
    unitNumber: number;
    unitTitle: string;
    topics: string[];
  }[];
}

export default function CustomPracticeBuilder() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.subjectId as string;
  const { fbUser, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !fbUser) {
      router.push('/login');
    }
  }, [fbUser, authLoading, router]);

  const [subject, setSubject] = useState<SubjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);

  // Selection state
  const [selectedUnits, setSelectedUnits] = useState<number[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  useEffect(() => {
    const college = localStorage.getItem('selectedCollege') || 'MMMUT';
    const branch = localStorage.getItem('selectedBranch') || 'CSE';
    const semester = localStorage.getItem('selectedSemester') || '1';
    setBreadcrumbs([college, branch, `Sem ${semester}`]);

    const isLocalFallback = localStorage.getItem('useLocalFallback') === 'true';

    if (isLocalFallback || subjectId.startsWith('mock-')) {
      const subjectCode = subjectId.replace('mock-', '');
      const col = seedColleges.find((c) => c.code === college);
      const br = col?.branches.find((b) => b.code === branch);
      const sub = br?.subjects.find((s) => s.code === subjectCode);
      if (sub) {
        setSubject({ _id: subjectId, name: sub.name, code: sub.code, syllabus: sub.syllabus });
        setSelectedUnits(sub.syllabus.map((u: { unitNumber: number }) => u.unitNumber));
      }
      setLoading(false);
    } else {
      fetch(`/api/subjects/${subjectId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.subject) {
            const subj = data.subject as SubjectDetail;
            setSubject(subj);
            setSelectedUnits(subj.syllabus.map((u) => u.unitNumber));
          } else {
            router.push('/dashboard');
          }
        })
        .catch(() => router.push('/dashboard'))
        .finally(() => setLoading(false));
    }
  }, [subjectId, router]);

  const toggleUnit = (unitNum: number) => {
    if (selectedUnits.includes(unitNum)) {
      setSelectedUnits(selectedUnits.filter((u) => u !== unitNum));
      const unit = subject?.syllabus.find((u) => u.unitNumber === unitNum);
      if (unit) {
        setSelectedTopics(selectedTopics.filter((t) => !unit.topics.includes(t)));
      }
    } else {
      setSelectedUnits([...selectedUnits, unitNum]);
    }
  };

  const toggleTopic = (topic: string, unitNum: number) => {
    if (!selectedUnits.includes(unitNum)) {
      setSelectedUnits([...selectedUnits, unitNum]);
    }

    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter((t) => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const handleStart = async () => {
    if (selectedUnits.length === 0) {
      alert('Please select at least one unit.');
      return;
    }

    const isLocalFallback = localStorage.getItem('useLocalFallback') === 'true';

    if (isLocalFallback) {
      const unitsQuery = selectedUnits.join(',');
      const topicsQuery = encodeURIComponent(selectedTopics.join(','));
      router.push(`/subjects/${subjectId}/practice/solve?type=custom&units=${unitsQuery}&topics=${topicsQuery}`);
    } else {
      try {
        const token = fbUser ? await fbUser.getIdToken() : '';
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            userId: localStorage.getItem('anonymousUserId') || 'guest',
            subjectId,
            type: 'practice',
            subType: 'custom',
            config: {
              units: selectedUnits,
              topics: selectedTopics
            }
          })
        });
        const data = await res.json();
        if (data.session) {
          router.push(`/subjects/${subjectId}/practice/solve?sessionId=${data.session._id}`);
        } else {
          const unitsQuery = selectedUnits.join(',');
          const topicsQuery = encodeURIComponent(selectedTopics.join(','));
          router.push(`/subjects/${subjectId}/practice/solve?type=custom&units=${unitsQuery}&topics=${topicsQuery}`);
        }
      } catch {
        const unitsQuery = selectedUnits.join(',');
        const topicsQuery = encodeURIComponent(selectedTopics.join(','));
        router.push(`/subjects/${subjectId}/practice/solve?type=custom&units=${unitsQuery}&topics=${topicsQuery}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
          <p className="text-xs text-text-secondary">Loading custom builder...</p>
        </div>
      </div>
    );
  }

  if (!subject) return null;

  return (
    <div className="min-h-screen flex flex-col justify-between transition-colors duration-300">
      {/* Top Navbar */}
      <header className="border-b border-border-primary/50 bg-bg-primary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href={`/subjects/${subjectId}/practice`} 
              className="p-2 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <nav className="flex items-center space-x-1.5 text-xs text-text-secondary font-medium overflow-x-auto">
              {breadcrumbs.map((c, idx) => (
                <span key={idx} className="flex items-center space-x-1.5">
                  <span>{c}</span>
                  <span className="text-text-muted">/</span>
                </span>
              ))}
              <Link href={`/subjects/${subjectId}`} className="hover:text-accent">{subject.code}</Link>
              <span className="text-text-muted">/</span>
              <Link href={`/subjects/${subjectId}/practice`} className="hover:text-accent">Practice</Link>
              <span className="text-text-muted">/</span>
              <span className="text-text-primary font-bold">Custom</span>
            </nav>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Builder Console */}
      <main className="flex-grow max-w-4xl w-full mx-auto px-6 py-12 relative overflow-hidden">
        {/* Subtle glowing space background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-accent/5 rounded-full blur-[120px] pointer-events-none dark:block hidden"></div>

        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 z-10 relative">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-accent mb-2 block">Configure</span>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-text-primary">
              Custom Practice Builder
            </h1>
          </div>
          
          <button
            onClick={handleStart}
            className="px-6 py-3 rounded-xl bg-accent text-white font-semibold hover:bg-accent-hover transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2 self-start md:self-auto hover:-translate-y-0.5"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Practice Session</span>
          </button>
        </div>

        <div className="max-w-3xl space-y-6 z-10 relative">
          <div className="space-y-6">
            <div className="p-8 rounded-2xl border border-border-primary bg-bg-secondary/60 backdrop-blur-sm shadow-[0_0_30px_rgba(0,0,0,0.25)]">
              <h3 className="font-display font-bold text-text-primary text-base mb-6">Select Units & Topics</h3>
              <div className="space-y-6">
                {subject.syllabus.map((unit) => {
                  const unitSelected = selectedUnits.includes(unit.unitNumber);
                  return (
                    <div key={unit.unitNumber} className="border-b border-border-primary/40 last:border-0 pb-6 last:pb-0">
                      {/* Unit Header row */}
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={() => toggleUnit(unit.unitNumber)}
                          className="flex items-start space-x-3 text-left group"
                        >
                          <div className={`w-5 h-5 rounded-md border mt-0.5 flex items-center justify-center transition-all duration-200 ${
                            unitSelected ? 'bg-accent border-accent text-white shadow-[0_0_10px_rgba(124,102,255,0.3)]' : 'border-border-primary bg-bg-primary/50 group-hover:border-accent/40'
                          }`}>
                            {unitSelected && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                          </div>
                          <div>
                            <h4 className={`font-display font-bold text-sm transition-colors flex items-center space-x-2 ${unitSelected ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>
                              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent/10 text-accent text-[9px] font-extrabold">
                                {unit.unitNumber}
                              </span>
                              <span>{unit.unitTitle}</span>
                            </h4>
                          </div>
                        </button>
                      </div>

                      {/* Topic Tag pills */}
                      <div className="flex flex-wrap gap-2 pl-8">
                        {unit.topics.map((topic: string, tIdx: number) => {
                          const topicSelected = selectedTopics.includes(topic);
                          return (
                            <button
                              key={tIdx}
                              onClick={() => toggleTopic(topic, unit.unitNumber)}
                              className={`text-xs px-3.5 py-1.5 rounded-full border transition-all duration-200 ${
                                topicSelected
                                  ? 'border-accent/40 bg-accent/10 text-accent font-semibold shadow-[0_0_12px_rgba(124,102,255,0.15)]'
                                  : 'border-border-primary bg-bg-primary/50 text-text-secondary hover:border-accent/30 hover:text-accent hover:bg-bg-primary'
                              }`}
                            >
                              {topic}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border-primary/50 bg-bg-secondary/20 py-6 text-center text-xs text-text-secondary">
        <p>Custom configurations will filter our university database in real-time.</p>
      </footer>
    </div>
  );
}
