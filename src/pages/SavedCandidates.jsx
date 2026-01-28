import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, FolderPlus, Lock, Plus, Trash2, Edit2, Save, X, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import CandidateCard from '@/components/candidates/CandidateCard';

const FOLDER_COLORS = [
  { name: 'blue', class: 'bg-blue-500' },
  { name: 'purple', class: 'bg-purple-500' },
  { name: 'emerald', class: 'bg-emerald-500' },
  { name: 'orange', class: 'bg-orange-500' },
  { name: 'pink', class: 'bg-pink-500' },
  { name: 'red', class: 'bg-red-500' },
];

export default function SavedCandidates() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('blue');
  const [editingFolder, setEditingFolder] = useState(null);
  const [editName, setEditName] = useState('');
  const [candidateNotes, setCandidateNotes] = useState({});

  const queryClient = useQueryClient();

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const hasAccess = user && (user.subscription_tier === 'personal' || user.subscription_tier === 'enterprise');

  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => base44.entities.Folder.filter({ user_email: user.email }),
    enabled: !!user && hasAccess,
  });

  const { data: savedCandidates = [] } = useQuery({
    queryKey: ['savedCandidates', selectedFolder?.id],
    queryFn: async () => {
      if (!selectedFolder) return [];
      const saved = await base44.entities.SavedCandidate.filter({ folder_id: selectedFolder.id, user_email: user.email });
      const candidateIds = saved.map(s => s.candidate_id);
      if (candidateIds.length === 0) return [];
      const candidates = await Promise.all(candidateIds.map(id => base44.entities.Candidate.filter({ id })));
      return saved.map(s => {
        const candidate = candidates.flat().find(c => c.id === s.candidate_id);
        return { ...s, candidate };
      }).filter(s => s.candidate);
    },
    enabled: !!selectedFolder && hasAccess,
  });

  const createFolderMutation = useMutation({
    mutationFn: (data) => base44.entities.Folder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setShowNewFolder(false);
      setNewFolderName('');
      setNewFolderColor('blue');
    },
  });

  const updateFolderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Folder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setEditingFolder(null);
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id) => base44.entities.Folder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setSelectedFolder(null);
    },
  });

  const removeCandidateMutation = useMutation({
    mutationFn: (id) => base44.entities.SavedCandidate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savedCandidates'] }),
  });

  const updateNotesMutation = useMutation({
    mutationFn: ({ id, notes }) => base44.entities.SavedCandidate.update(id, { notes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savedCandidates'] }),
  });

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolderMutation.mutate({ name: newFolderName, color: newFolderColor, user_email: user.email });
  };

  const handleUpdateFolder = () => {
    if (!editName.trim() || !editingFolder) return;
    updateFolderMutation.mutate({ id: editingFolder.id, data: { name: editName } });
  };

  const handleDeleteFolder = (folder) => {
    if (confirm(`Delete folder "${folder.name}"?`)) deleteFolderMutation.mutate(folder.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <section className="relative min-h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop")', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.15 }}>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/80 via-[#0a0a0a]/70 to-[#0a0a0a]" />
      </div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-purple-500/[0.04] rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 md:py-20">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 mb-6">
            <Folder className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Organization</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight leading-[1.1] mb-4">
            <span className="text-white/60">Saved</span>
            <span className="text-white font-medium"> Candidates</span>
          </h1>
          <p className="text-lg text-white/50 max-w-xl mx-auto">Organize and manage your saved candidates</p>
        </motion.div>

        {!hasAccess ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-purple-500/30 overflow-hidden max-w-xl mx-auto">
              <div className="px-5 py-3 border-b border-purple-500/20 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Access Required</span>
              </div>
              <div className="p-8 text-center">
                <div className="inline-flex p-4 rounded-2xl bg-red-500/10 mb-6">
                  <Lock className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-white text-2xl font-medium mb-3">Unlock Saved Candidates</h3>
                <p className="text-white/50 mb-6 max-w-md mx-auto">
                  Save candidates to folders and organize your hiring pipeline with Personal or Enterprise
                </p>
                <Link to={createPageUrl('Pricing')}>
                  <Button className="bg-white hover:bg-white/90 text-black font-medium rounded-full px-8">
                    View Plans
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Folders Sidebar */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-1">
              <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 overflow-hidden sticky top-20">
                <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">My Folders</span>
                  </div>
                  <Button size="sm" onClick={() => setShowNewFolder(true)} className="bg-white hover:bg-white/90 text-black rounded-lg h-8 w-8 p-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="p-4">
                  <AnimatePresence>
                    {showNewFolder && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 space-y-3 overflow-hidden">
                        <Input placeholder="Folder name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} className="bg-white/[0.02] border-white/10 text-white rounded-xl" />
                        <div className="flex flex-wrap gap-2">
                          {FOLDER_COLORS.map((color) => (
                            <button key={color.name} onClick={() => setNewFolderColor(color.name)} className={`w-6 h-6 rounded-full ${color.class} transition-all ${newFolderColor === color.name ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : 'hover:scale-110'}`} />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleCreateFolder} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl">Create</Button>
                          <Button size="sm" variant="ghost" onClick={() => setShowNewFolder(false)} className="text-white/60 hover:text-white hover:bg-white/5 rounded-xl">Cancel</Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {folders.map((folder) => (
                      <motion.div key={folder.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={`p-3 rounded-xl cursor-pointer transition-colors ${selectedFolder?.id === folder.id ? 'bg-white/10 border border-white/20' : 'hover:bg-white/5 border border-transparent'}`} onClick={() => setSelectedFolder(folder)}>
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${FOLDER_COLORS.find(c => c.name === folder.color)?.class || 'bg-blue-500'}`} />
                          {editingFolder?.id === folder.id ? (
                            <div className="flex-1 flex items-center gap-2">
                              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-white/5 border-white/10 text-white h-7 text-sm rounded-lg" onClick={(e) => e.stopPropagation()} />
                              <Button size="sm" onClick={(e) => { e.stopPropagation(); handleUpdateFolder(); }} className="h-7 w-7 p-0 bg-emerald-600 hover:bg-emerald-500 rounded-lg"><Save className="w-3 h-3" /></Button>
                              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingFolder(null); }} className="h-7 w-7 p-0 text-white hover:bg-white/10 rounded-lg"><X className="w-3 h-3" /></Button>
                            </div>
                          ) : (
                            <>
                              <span className="text-white text-sm flex-1">{folder.name}</span>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingFolder(folder); setEditName(folder.name); }} className="h-7 w-7 p-0 text-white/60 hover:text-white hover:bg-white/10 rounded-lg"><Edit2 className="w-3 h-3" /></Button>
                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }} className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-3 h-3" /></Button>
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    {folders.length === 0 && !showNewFolder && (
                      <div className="text-center py-8 text-white/40 text-sm">
                        <FolderPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        No folders yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Candidates Area */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
              {selectedFolder ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-medium text-white flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${FOLDER_COLORS.find(c => c.name === selectedFolder.color)?.class || 'bg-blue-500'}`} />
                      {selectedFolder.name}
                    </h2>
                    <Link to={createPageUrl('Scan')}>
                      <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-xl">Add Candidates</Button>
                    </Link>
                  </div>
                  {savedCandidates.length > 0 ? (
                    <div className="space-y-4">
                      {savedCandidates.map((saved) => (
                        <motion.div key={saved.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 overflow-hidden">
                          <div className="p-5">
                            <CandidateCard candidate={saved.candidate} onClick={() => {}} onDownload={() => {}} onShare={() => {}} />
                            <div className="mt-4 pt-4 border-t border-white/[0.06]">
                              <div className="flex items-center gap-2 mb-2">
                                <StickyNote className="w-4 h-4 text-white/60" />
                                <span className="text-white/80 text-sm font-medium">Notes</span>
                              </div>
                              <Textarea
                                placeholder="Add notes about this candidate..."
                                value={candidateNotes[saved.id] !== undefined ? candidateNotes[saved.id] : (saved.notes || '')}
                                onChange={(e) => setCandidateNotes({ ...candidateNotes, [saved.id]: e.target.value })}
                                onBlur={() => { if (candidateNotes[saved.id] !== undefined) updateNotesMutation.mutate({ id: saved.id, notes: candidateNotes[saved.id] }); }}
                                className="bg-white/[0.02] border-white/10 text-white text-sm min-h-[80px] rounded-xl"
                              />
                              <div className="flex justify-end mt-3">
                                <Button size="sm" variant="ghost" onClick={() => removeCandidateMutation.mutate(saved.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg">
                                  <Trash2 className="w-4 h-4 mr-2" />Remove
                                </Button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 p-12 text-center">
                      <Folder className="w-12 h-12 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">No candidates in this folder yet</p>
                      <Link to={createPageUrl('Scan')}>
                        <Button className="bg-white hover:bg-white/90 text-black font-medium rounded-full">Browse Scans</Button>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px]">
                  <FolderPlus className="w-16 h-16 text-white/40 mb-4" />
                  <h3 className="text-xl font-medium text-white mb-2">Select a Folder</h3>
                  <p className="text-white/60">Choose a folder to view saved candidates</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </section>
  );
}