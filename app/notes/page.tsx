'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Navbar } from '@/components/navbar';
import { useAuth } from '@/components/auth-provider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { 
  Home as HomeIcon, 
  ChevronRight, 
  Atom, 
  Sigma, 
  Server, 
  Code, 
  Monitor, 
  GraduationCap, 
  Plus, 
  FileCheck, 
  FileText, 
  Sparkles, 
  Edit3, 
  MoreVertical, 
  Lock, 
  ArrowLeft, 
  Trash2, 
  Loader2, 
  X,
  FileSignature
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MathMarkdown = dynamic(() => import('@/components/math-markdown').then((mod) => mod.MathMarkdown), {
  ssr: false,
  loading: () => <div className="animate-pulse h-8 bg-bg-secondary rounded-lg border border-border-primary/50 w-full" />,
});

// Subject icon helper
function getSubjectIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('physics') || n.includes('phy')) return { icon: Atom, colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20 shadow-purple-500/5', activeColorClass: 'border-purple-500/50 bg-purple-500/20 shadow-purple-500/10 text-purple-300' };
  if (n.includes('math') || n.includes('as-') || n.includes('algebra') || n.includes('calculus') || n.includes('analysis')) return { icon: Sigma, colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-blue-500/5', activeColorClass: 'border-blue-500/50 bg-blue-500/20 shadow-blue-500/10 text-blue-300' };
  if (n.includes('bhs') || n.includes('humanities') || n.includes('english') || n.includes('management')) return { icon: Server, colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5', activeColorClass: 'border-emerald-500/50 bg-emerald-500/20 shadow-emerald-500/10 text-emerald-300' };
  if (n.includes('programming') || n.includes('intro to c') || n.includes('coding') || n.includes('computer') || n.includes('data structure')) return { icon: Code, colorClass: 'text-orange-400 bg-orange-500/10 border-orange-500/20 shadow-orange-500/5', activeColorClass: 'border-orange-500/50 bg-orange-500/20 shadow-orange-500/10 text-orange-300' };
  if (n.includes('web') || n.includes('design') || n.includes('ui') || n.includes('graphic')) return { icon: Monitor, colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-rose-500/5', activeColorClass: 'border-rose-500/50 bg-rose-500/20 shadow-rose-500/10 text-rose-300' };
  return { icon: GraduationCap, colorClass: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 shadow-indigo-500/5', activeColorClass: 'border-indigo-500/50 bg-indigo-500/20 shadow-indigo-500/10 text-indigo-300' };
}

// Folder icon renderer
function FolderIcon({ iconName, colorName }: { iconName: string; colorName: string }) {
  let IconComponent = FileCheck;
  if (iconName === 'file-text') IconComponent = FileText;
  else if (iconName === 'sparkles') IconComponent = Sparkles;
  else if (iconName === 'edit-3') IconComponent = Edit3;

  let colorClass = 'text-purple-400 bg-purple-500/10 border-purple-500/20';
  if (colorName === 'blue') colorClass = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  else if (colorName === 'yellow') colorClass = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
  else if (colorName === 'green') colorClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  else if (colorName === 'red') colorClass = 'text-rose-400 bg-rose-500/10 border-rose-500/20';

  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colorClass}`}>
      <IconComponent className="w-5 h-5" />
    </div>
  );
}

export default function NotesPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, fbUser, loading: authLoading } = useAuth();
  
  const [subjects, setSubjects] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]); // note folders
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // New Folder Modal Form
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState('file-check');
  const [newFolderColor, setNewFolderColor] = useState('purple');
  const [creating, setCreating] = useState(false);
  const [folderMenuOpenId, setFolderMenuOpenId] = useState<string | null>(null);
  
  // Note details list (populated with actual note text)
  const [noteDetails, setNoteDetails] = useState<Record<string, string>>({});

  // Fetch page data
  const loadPageData = async () => {
    if (!fbUser) return;
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch('/api/playlists?type=note', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSubjects(data.subjects || []);
        setPlaylists(data.playlists || []);
        
        // Select first subject by default if none selected yet
        if (data.subjects && data.subjects.length > 0 && !selectedSubjectId) {
          setSelectedSubjectId(data.subjects[0]._id);
        }
      }

      // Fetch all user notes to display note texts in details
      const notesRes = await fetch('/api/users/notebook?type=notes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (notesRes.ok) {
        const notesData = await notesRes.json();
        const mappedNotes: Record<string, string> = {};
        if (notesData.notes && Array.isArray(notesData.notes)) {
          for (const item of notesData.notes) {
            if (item.question?._id) {
              mappedNotes[item.question._id] = item.note;
            }
          }
        }
        setNoteDetails(mappedNotes);
      }
    } catch (err) {
      console.error("Failed to load notes metadata:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!fbUser) {
        router.push('/login');
      } else if (fbUser && user && user.role === 'student' && !user.onboardingCompleted) {
        router.push('/onboarding');
      } else {
        loadPageData();
      }
    }
  }, [authLoading, fbUser, user, router]);

  // Sync selected folder details in detail view if playlists refresh
  useEffect(() => {
    if (selectedFolder) {
      const updated = playlists.find(p => p._id === selectedFolder._id);
      if (updated) setSelectedFolder(updated);
    }
  }, [playlists]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !selectedSubjectId || creating) return;
    setCreating(true);
    try {
      const token = await fbUser?.getIdToken();
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          type: 'note',
          subjectId: selectedSubjectId,
          icon: newFolderIcon,
          color: newFolderColor
        })
      });
      if (res.ok) {
        setNewFolderName('');
        setNewFolderIcon('file-check');
        setNewFolderColor('purple');
        setNewFolderModalOpen(false);
        await loadPageData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (confirm("Are you sure you want to delete this folder? This will not delete the questions/notes themselves.")) {
      try {
        const token = await fbUser?.getIdToken();
        const res = await fetch(`/api/playlists/${folderId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          if (selectedFolder?._id === folderId) {
            setSelectedFolder(null);
          }
          await loadPageData();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleRemoveNoteFromFolder = async (qId: string) => {
    if (!selectedFolder) return;
    try {
      const token = await fbUser?.getIdToken();
      const res = await fetch(`/api/playlists/${selectedFolder._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          questionId: qId,
          action: 'remove'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setPlaylists(prev => prev.map(p => p._id === data.playlist._id ? data.playlist : p));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const activeSubject = subjects.find(s => s._id === selectedSubjectId);
  const filteredFolders = playlists.filter(p => String(p.subjectId) === String(selectedSubjectId));

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg-primary text-text-primary overflow-hidden relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-grow flex flex-col min-h-screen overflow-y-auto z-10">
        <Navbar onMenuToggle={() => setSidebarOpen(true)} />

        <main className="flex-grow max-w-5xl w-full mx-auto px-6 py-6 flex flex-col justify-between">
          <div className="space-y-6 flex-grow">
            
            {/* Breadcrumbs */}
            <div className="flex items-center space-x-1.5 text-xs text-text-secondary font-medium">
              <Link href="/dashboard" className="hover:text-text-primary flex items-center gap-1 transition-colors">
                <HomeIcon className="w-3.5 h-3.5" />
                <span>Home</span>
              </Link>
              <ChevronRight className="w-3 h-3 text-text-muted" />
              <span className="text-text-muted">Notes</span>
            </div>

            {/* Title Section */}
            <div className="space-y-1">
              <h1 className="font-display font-black text-2xl tracking-tight">My Study Notes</h1>
              <p className="text-xs text-text-secondary">Your saved note folders and annotations</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
              </div>
            ) : !selectedFolder ? (
              <>
                {/* Choose a Subject Section */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h2 className="text-xs uppercase font-black tracking-wider text-text-secondary">Choose a Subject</h2>
                    <p className="text-[10px] text-text-muted">View your note folders by subject</p>
                  </div>

                  {/* Horizontal Subject list */}
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
                    {subjects.map((subj) => {
                      const { icon: IconComponent, colorClass, activeColorClass } = getSubjectIcon(subj.name);
                      const isSelected = subj._id === selectedSubjectId;
                      return (
                        <button
                          key={subj._id}
                          onClick={() => setSelectedSubjectId(subj._id)}
                          className={`flex-shrink-0 flex items-center gap-3.5 p-4 rounded-xl border text-left transition-all duration-200 w-52 relative group shadow-sm
                            ${isSelected 
                              ? activeColorClass + ' border-accent ring-1 ring-accent/35 scale-[1.02]' 
                              : 'bg-bg-secondary/40 border-border-primary hover:bg-bg-tertiary/20 hover:scale-[1.01]'
                            }`}
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all ${colorClass}`}>
                            <IconComponent className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <h3 className="text-[11px] font-black text-text-primary group-hover:text-accent transition-colors truncate w-32" title={subj.name}>
                              {subj.name}
                            </h3>
                            <p className="text-[9px] font-bold text-text-secondary mt-0.5">
                              {subj.playlistCount || 0} Folders
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Your Folders Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h2 className="text-xs uppercase font-black tracking-wider text-text-secondary">Your Folders</h2>
                      <p className="text-[10px] text-text-muted">Organize and revise your personal notes</p>
                    </div>

                    <button
                      onClick={() => setNewFolderModalOpen(true)}
                      className="py-1.5 px-3.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-accent/20"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Folder</span>
                    </button>
                  </div>

                  {/* Folders List */}
                  {filteredFolders.length === 0 ? (
                    <div className="p-10 rounded-2xl border border-dashed border-border-primary text-center bg-bg-secondary/10">
                      <p className="text-xs text-text-secondary italic">No note folders created for this subject.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredFolders.map((folder) => {
                        const noteCount = folder.questions?.length || 0;
                        const dateFormatted = folder.updatedAt ? new Date(folder.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recently';
                        return (
                          <div
                            key={folder._id}
                            className="flex items-center justify-between p-4 bg-bg-secondary/40 hover:bg-bg-tertiary/20 border border-border-primary/80 rounded-2xl transition-all duration-200 text-left relative"
                          >
                            <div 
                              onClick={() => setSelectedFolder(folder)}
                              className="flex items-center gap-4 flex-grow cursor-pointer"
                            >
                              <FolderIcon iconName={folder.icon} colorName={folder.color} />
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-xs font-black text-text-primary hover:text-accent transition-colors">{folder.name}</h3>
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-accent/15 border border-accent/20 text-accent">
                                    {noteCount} Notes
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[9px] text-text-secondary font-semibold">
                                  <span>{activeSubject?.name || 'Subject'}</span>
                                  <span>•</span>
                                  <span>Updated {dateFormatted}</span>
                                  <span>•</span>
                                  <span className="flex items-center gap-0.5">
                                    <Lock className="w-2.5 h-2.5" /> Private
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right hand side elements */}
                            <div className="flex items-center gap-6 shrink-0 relative">
                              <div className="hidden sm:flex flex-col text-right space-y-0.5">
                                <span className="text-[10px] font-black text-text-primary flex items-center gap-1">
                                  <FileSignature className="w-3 h-3 text-text-muted" /> {noteCount} Notes
                                </span>
                                <span className="text-[8px] text-text-muted">Updated {dateFormatted}</span>
                              </div>

                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFolderMenuOpenId(folderMenuOpenId === folder._id ? null : folder._id);
                                  }}
                                  className="p-1 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                
                                {/* Dropdown menu */}
                                {folderMenuOpenId === folder._id && (
                                  <>
                                    <div className="fixed inset-0 z-10" onClick={() => setFolderMenuOpenId(null)} />
                                    <div className="absolute right-0 mt-1.5 w-32 rounded-xl bg-bg-secondary border border-border-primary shadow-xl z-20 overflow-hidden py-1 text-left">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setFolderMenuOpenId(null);
                                          handleDeleteFolder(folder._id);
                                        }}
                                        className="w-full px-3 py-2 text-[10px] font-bold text-red-400 hover:bg-red-500/10 flex items-center gap-1.5"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Delete Folder</span>
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Detail View - List of Notes inside the selected folder */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedFolder(null)}
                    className="flex items-center gap-1.5 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors py-1.5 px-3 rounded-lg hover:bg-bg-secondary"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Folders</span>
                  </button>
                </div>

                {/* Folder info card */}
                <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/40 flex items-center gap-4">
                  <FolderIcon iconName={selectedFolder.icon} colorName={selectedFolder.color} />
                  <div className="space-y-1">
                    <h2 className="text-lg font-black text-text-primary">{selectedFolder.name}</h2>
                    <p className="text-xs text-text-secondary leading-relaxed">{selectedFolder.description || 'Custom study notes collection'}</p>
                    <div className="text-[10px] font-bold text-text-muted mt-1">
                      Subject: {activeSubject?.name} • {selectedFolder.questions?.length || 0} Notes
                    </div>
                  </div>
                </div>

                {/* Notes list */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs uppercase font-black tracking-wider text-text-secondary">Study Notes ({selectedFolder.questions?.length || 0})</h3>
                  {selectedFolder.questions?.length === 0 ? (
                    <div className="p-10 rounded-2xl border border-dashed border-border-primary text-center bg-bg-secondary/10">
                      <p className="text-xs text-text-secondary italic">This folder is empty. Create personal notes on practice questions to populate it!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedFolder.questions.map((q: any, idx: number) => {
                        const noteText = noteDetails[q._id] || 'Note content missing.';
                        return (
                          <div
                            key={q._id}
                            className="p-5 rounded-2xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm space-y-3 relative text-left"
                          >
                            <div className="flex items-center justify-between border-b border-border-primary/30 pb-2">
                              <span className="text-[9px] uppercase font-black text-accent tracking-wide">
                                Unit {q.unit} • {q.topic}
                              </span>
                              
                              <button
                                onClick={() => handleRemoveNoteFromFolder(q._id)}
                                className="p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-rose-400 transition-colors"
                                title="Remove from Folder"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="text-xs font-semibold text-text-primary">
                              <MathMarkdown content={q.questionText} />
                            </div>
                            <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-300">
                              <div className="font-bold mb-1 flex items-center gap-1">
                                <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                                <span>My Personal Study Note:</span>
                              </div>
                              <p className="text-text-secondary whitespace-pre-wrap">{noteText}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* New Folder Modal */}
      {newFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setNewFolderModalOpen(false)} />
          
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-bg-secondary border border-border-primary max-w-sm w-full rounded-2xl shadow-2xl p-6 relative z-10 space-y-4 text-left"
          >
            <div className="flex items-center justify-between border-b border-border-primary/50 pb-2">
              <h3 className="font-display font-black text-sm text-text-primary">Create New Folder</h3>
              <button 
                onClick={() => setNewFolderModalOpen(false)}
                className="p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-text-secondary">Folder Name</label>
                <input
                  type="text"
                  placeholder="e.g. Exam Formulas"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-border-primary bg-bg-primary text-xs focus:border-accent focus:outline-none transition-colors text-text-primary"
                  required
                  maxLength={100}
                />
              </div>

              {/* Icon select */}
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase font-bold text-text-secondary">Choose Icon</label>
                <div className="flex gap-2">
                  {[
                    { id: 'file-check', icon: FileCheck },
                    { id: 'file-text', icon: FileText },
                    { id: 'sparkles', icon: Sparkles },
                    { id: 'edit-3', icon: Edit3 }
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setNewFolderIcon(item.id)}
                        className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all
                          ${newFolderIcon === item.id 
                            ? 'bg-accent/15 border-accent text-accent' 
                            : 'border-border-primary bg-bg-primary text-text-muted hover:text-text-primary'}`}
                      >
                        <Icon className="w-4.5 h-4.5" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color select */}
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase font-bold text-text-secondary">Choose Theme Color</label>
                <div className="flex gap-2">
                  {[
                    { id: 'purple', bg: 'bg-purple-500' },
                    { id: 'blue', bg: 'bg-blue-500' },
                    { id: 'yellow', bg: 'bg-yellow-500' },
                    { id: 'green', bg: 'bg-emerald-500' },
                    { id: 'red', bg: 'bg-rose-500' }
                  ].map(color => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setNewFolderColor(color.id)}
                      className={`w-6 h-6 rounded-full ${color.bg} transition-all relative flex items-center justify-center
                        ${newFolderColor === color.id ? 'ring-2 ring-white scale-105' : 'opacity-80 hover:opacity-100 hover:scale-105'}`}
                      aria-label={`Select ${color.id}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-border-primary/50">
                <button
                  type="button"
                  onClick={() => setNewFolderModalOpen(false)}
                  className="px-4 py-2 border border-border-primary bg-bg-primary hover:bg-bg-secondary rounded-xl text-xs font-semibold text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-accent/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Folder</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
