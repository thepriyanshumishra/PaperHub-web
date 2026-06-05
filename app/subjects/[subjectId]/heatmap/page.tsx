'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/sidebar';
import { Navbar } from '@/components/navbar';
import { 
  ArrowLeft, 
  BarChart3, 
  ChevronRight, 
  Loader2, 
  AlertTriangle
} from 'lucide-react';

interface HeatmapItem {
  unit: number;
  topic: string;
  totalQuestions: number;
  practiceDensity: number;
  correctCount: number;
  mastery: number;
  status: 'strong' | 'weak' | 'needs_improvement' | 'unattempted';
}

interface SubjectDetail {
  _id: string;
  name: string;
  code: string;
}

export default function SubjectHeatmap() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.subjectId as string;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subject, setSubject] = useState<SubjectDetail | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [siblingSubjects, setSiblingSubjects] = useState<any[]>([]);

  useEffect(() => {
    const college = localStorage.getItem('selectedCollege') || 'MMMUT';
    const branch = localStorage.getItem('selectedBranch') || 'CSE';
    const semester = localStorage.getItem('selectedSemester') || '1';

    // Fetch sibling subjects
    fetch(`/api/subjects?collegeCode=${college}&branchCode=${branch}&semester=${semester}`)
      .then(res => res.json())
      .then(data => setSiblingSubjects(data.subjects || []))
      .catch(() => setSiblingSubjects([]));

    // Fetch Subject Details
    fetch(`/api/subjects/${subjectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.subject) {
          setSubject(data.subject);
        }
      })
      .catch(() => {});

    // Fetch Heatmap Data
    const fetchHeatmapData = async () => {
      try {
        const res = await fetch(`/api/subjects/${subjectId}/heatmap`);
        if (res.ok) {
          const data = await res.json();
          setHeatmap(data.heatmap || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchHeatmapData();
  }, [subjectId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!subject) return null;

  // Aggregate stats from heatmap
  const totalTopics = heatmap.length;
  const strongTopics = heatmap.filter(h => h.status === 'strong').length;
  const weakTopics = heatmap.filter(h => h.status === 'weak').length;
  const unattemptedTopics = heatmap.filter(h => h.status === 'unattempted').length;

  return (
    <div className="flex min-h-screen bg-bg-primary text-text-primary overflow-hidden relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-grow flex flex-col min-h-screen overflow-y-auto z-10">
        <Navbar onMenuToggle={() => setSidebarOpen(true)} />

        <main className="flex-grow max-w-6xl w-full mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Sibling picker sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <div className="p-4 rounded-xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4">
                <h3 className="font-display font-black text-xs uppercase tracking-wider text-text-muted">Subjects Directory</h3>
                <div className="space-y-1.5">
                  {siblingSubjects.map((sibling) => (
                    <Link
                      key={sibling._id}
                      href={`/subjects/${sibling._id}/heatmap`}
                      className={`
                        w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border
                        ${sibling._id === subjectId
                          ? 'bg-accent/10 border-accent/25 text-accent shadow-xs'
                          : 'border-transparent text-text-secondary hover:bg-bg-tertiary/40 hover:text-text-primary'
                        }
                      `}
                    >
                      <span className="truncate">{sibling.name}</span>
                      <ChevronRight className="w-3 h-3 text-text-muted shrink-0 ml-1.5" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Heatmap mastery dashboard */}
            <div className="lg:col-span-3 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="space-y-1 text-left">
                  <Link href={`/subjects/${subjectId}`} className="text-xs font-semibold text-text-muted hover:text-accent flex items-center gap-1">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Subject
                  </Link>
                  <h2 className="font-display font-black text-xl leading-none mt-2">{subject.name} Heatmap</h2>
                  <p className="text-xs text-text-secondary">Visual analysis of topic-wise mastery levels.</p>
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded bg-purple-500/10 border border-purple-500/25 text-purple-500 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" /> Subject Analysis
                </span>
              </div>

              {/* Aggregated Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Topics', value: totalTopics, color: 'text-text-primary border-border-primary' },
                  { label: 'Strong Mastery', value: strongTopics, color: 'text-emerald-500 border-emerald-500/15 bg-emerald-500/5' },
                  { label: 'Attention Needed', value: weakTopics, color: 'text-red-500 border-red-500/15 bg-red-500/5' },
                  { label: 'Unattempted Topics', value: unattemptedTopics, color: 'text-text-muted border-border-primary bg-bg-tertiary/30' }
                ].map((stat, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border text-left ${stat.color}`}>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-75">{stat.label}</span>
                    <h4 className="font-display font-black text-xl mt-1 leading-none">{stat.value}</h4>
                  </div>
                ))}
              </div>

              {/* Interactive Heatmap Table */}
              <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-4">
                <h3 className="font-display font-bold text-sm text-text-primary text-left">Topic Mastery Grid</h3>
                
                {heatmap.length === 0 ? (
                  <p className="text-xs text-text-muted italic py-8 text-center">No questions seeded for this subject's heatmap.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border-primary/50 text-[10px] uppercase tracking-wider text-text-muted font-bold">
                          <th className="py-3 px-2">Unit</th>
                          <th className="py-3 px-2">Topic</th>
                          <th className="py-3 px-2 text-center">Practice Density</th>
                          <th className="py-3 px-2 text-center">Mastery Score</th>
                          <th className="py-3 px-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {heatmap.map((item, idx) => (
                          <tr key={idx} className="border-b border-border-primary/30 hover:bg-bg-primary/20 transition-colors">
                            <td className="py-3.5 px-2 font-bold text-accent">Unit {item.unit}</td>
                            <td className="py-3.5 px-2 font-semibold text-text-primary">{item.topic}</td>
                            <td className="py-3.5 px-2 text-center font-semibold text-text-secondary">{item.practiceDensity} attempts</td>
                            <td className="py-3.5 px-2 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className="font-bold text-text-primary">{item.mastery}%</span>
                                <div className="w-12 h-1.5 bg-bg-tertiary rounded-full overflow-hidden hidden sm:block">
                                  <div 
                                    className={`h-full ${
                                      item.status === 'strong' ? 'bg-emerald-500' :
                                      item.status === 'weak' ? 'bg-red-500' :
                                      item.status === 'needs_improvement' ? 'bg-amber-500' :
                                      'bg-bg-tertiary'
                                    }`}
                                    style={{ width: `${item.mastery}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-2 text-right">
                              <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                item.status === 'strong' ? 'bg-emerald-500/10 text-emerald-500' :
                                item.status === 'weak' ? 'bg-red-500/10 text-red-500' :
                                item.status === 'needs_improvement' ? 'bg-amber-500/10 text-amber-500' :
                                'bg-bg-tertiary text-text-muted'
                              }`}>
                                {item.status.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Action Plan Alerts */}
              {weakTopics > 0 && (
                <div className="p-4.5 rounded-xl border border-red-500/25 bg-red-500/5 text-red-500 flex items-start gap-3.5 text-left">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-xs">Weak Topics Flagged</h5>
                    <p className="text-[10px] text-red-400 mt-1 leading-relaxed">
                      You are consistently scoring below passing thresholds in {weakTopics} topic areas. Reattempting practice question checks will reinforce exam weightage outcomes.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
