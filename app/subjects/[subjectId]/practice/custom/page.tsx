'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { seedColleges } from '@/lib/seedData';
import { ArrowLeft, Play, Check, Loader2 } from 'lucide-react';

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
            router.push('/onboarding');
          }
        })
        .catch(() => router.push('/onboarding'))
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
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
      <main className="flex-grow max-w-4xl w-full mx-auto px-6 py-12">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-accent mb-2 block">Configure</span>
            <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary">
              Custom Practice Builder
            </h1>
          </div>
          
          <button
            onClick={handleStart}
            className="px-6 py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent-hover transition-colors shadow-sm flex items-center justify-center space-x-2 self-start md:self-auto"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Practice Session</span>
          </button>
        </div>

        <div className="max-w-3xl space-y-6">
          <div className="space-y-6">
            <div className="p-6 rounded-xl border border-border-primary bg-bg-secondary">
              <h3 className="font-display font-semibold text-text-primary mb-6">Select Units & Topics</h3>
              <div className="space-y-6">
                {subject.syllabus.map((unit) => {
                  const unitSelected = selectedUnits.includes(unit.unitNumber);
                  return (
                    <div key={unit.unitNumber} className="border-b border-border-primary/50 last:border-0 pb-6 last:pb-0">
                      {/* Unit Header row */}
                      <div className="flex items-center justify-between mb-3">
                        <button
                          onClick={() => toggleUnit(unit.unitNumber)}
                          className="flex items-start space-x-3 text-left group"
                        >
                          <div className={`w-5 h-5 rounded border mt-0.5 flex items-center justify-center transition-colors duration-150 ${
                            unitSelected ? 'bg-accent border-accent text-white' : 'border-border-primary bg-bg-primary group-hover:border-accent/40'
                          }`}>
                            {unitSelected && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <h4 className={`font-display font-bold text-sm transition-colors ${unitSelected ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>
                              Unit {unit.unitNumber}: {unit.unitTitle}
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
                              className={`text-xs px-3 py-1 rounded-full border transition-all duration-150 ${
                                topicSelected
                                  ? 'border-accent bg-accent/5 text-accent font-medium'
                                  : 'border-border-primary bg-bg-primary text-text-secondary hover:border-accent/25 hover:text-text-primary'
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
