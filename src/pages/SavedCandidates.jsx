import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, FolderPlus, Lock, Plus, Trash2, Edit2, Save, X, StickyNote, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import CandidateCard from '@/components/candidates/CandidateCard';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const FOLDER_COLORS = [
  { name: 'blue', class: 'bg-blue-500' },
  { name: 'purple', class: 'bg-purple-500' },
  { name: 'emerald', class: 'bg-emerald-500' },
  { name: 'orange', class: 'bg-orange-500' },
  { name: 'pink', class: 'bg-pink-500' },
  { name: 'red', class: 'bg-red-500' },
  { name: 'cyan', class: 'bg-cyan-500' },
  { name: 'amber', class: 'bg-amber-500' },
  { name: 'lime', class: 'bg-lime-500' },
  { name: 'rose', class: 'bg-rose-500' },
  { name: 'indigo', class: 'bg-indigo-500' },
  { name: 'teal', class: 'bg-teal-500' }
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
  const navigate = useNavigate();

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

  const hasAccess = user && (user.subscription_tier === 'professional' || user.subscription_tier === 'enterprise');

  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => base44.entities.Folder.filter({ user_email: user.email }),
    enabled: !!user && hasAccess,
  });

  const { data: savedCandidates = [] } = useQuery({
    queryKey: ['savedCandidates', selectedFolder?.id],
    queryFn: async () => {
      if (!selectedFolder) return [];
      const saved = await base44.entities.SavedCandidate.filter({ 
        folder_id: selectedFolder.id,
        user_email: user.email 
      });
      
      const candidateIds = saved.map(s => s.candidate_id);
      if (candidateIds.length === 0) return [];
      
      const candidates = await Promise.all(
        candidateIds.map(id => base44.entities.Candidate.filter({ id }))
      );
      
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedCandidates'] });
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: ({ id, notes }) => base44.entities.SavedCandidate.update(id, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedCandidates'] });
    },
  });

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolderMutation.mutate({
      name: newFolderName,
      color: newFolderColor,
      user_email: user.email
    });
  };

  const handleUpdateFolder = () => {
    if (!editName.trim() || !editingFolder) return;
    updateFolderMutation.mutate({
      id: editingFolder.id,
      data: { name: editName }
    });
  };

  const handleDeleteFolder = (folder) => {
    if (confirm(`Delete folder "${folder.name}"? All saved candidates will be removed.`)) {
      deleteFolderMutation.mutate(folder.id);
    }
  };

  const handleViewCandidate = (candidate) => {
    navigate(createPageUrl('Scan'), { state: { selectedCandidate: candidate } });
  };

  const handleDownload = async (candidate) => {
    try {
      const response = await base44.functions.invoke('getSharedCandidate', {
        candidateId: candidate.id
      });

      if (response.data.success) {
        const element = document.createElement('div');
        element.innerHTML = `
          <div style="padding: 40px; font-family: Arial, sans-serif;">
            <h1 style="color: #7c3aed; margin-bottom: 20px;">Indexios Resume Analysis Report</h1>
            <h2 style="margin-bottom: 10px;">${candidate.name}</h2>
            <p style="color: #666; margin-bottom: 30px;">Generated: ${new Date().toLocaleDateString()}</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #7c3aed; font-size: 48px; margin: 0;">${candidate.legitimacy_score}%</h3>
              <p style="margin: 0; color: #666;">Legitimacy Score</p>
            </div>
            ${candidate.analysis?.summary ? `<p style="margin-bottom: 20px;">${candidate.analysis.summary}</p>` : ''}
          </div>
        `;
        document.body.appendChild(element);
        
        const canvas = await html2canvas(element, { scale: 2 });
        document.body.removeChild(element);
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${candidate.name || 'candidate'}-analysis.pdf`);
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download report');
    }
  };

  const handleShare = async (candidate) => {
    try {
      const response = await base44.functions.invoke('getSharedCandidate', {
        candidateId: candidate.id
      });

      if (response.data.success && response.data.shareUrl) {
        await navigator.clipboard.writeText(response.data.shareUrl);
        alert('Share link copied to clipboard!');
      }
    } catch (error) {
      console.error('Share error:', error);
      alert('Failed to generate share link');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 pointer-events-none" />
      
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
        <Link to={createPageUrl('Home')}>
          <Button variant="ghost" className="mb-6 text-white hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Saved Candidates</h1>
          <p className="text-white/60">Organize and manage your saved candidates</p>
        </motion.div>

        {!hasAccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-2 border-purple-500/60 rounded-2xl p-8 md:p-12 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex p-4 rounded-full bg-red-500/20 mb-6"
            >
              <Lock className="w-8 h-8 text-red-400" />
            </motion.div>
            
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Unlock Saved Candidates
            </h2>
            
            <p className="text-white/80 text-lg mb-6 max-w-md mx-auto">
              Save candidates to folders, add notes, and organize your hiring pipeline with Professional or Enterprise
            </p>

            <Link to={createPageUrl('Pricing')}>
              <Button size="lg" className="bg-white hover:bg-gray-100 text-black font-semibold">
                View Plans & Upgrade
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Folders Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-zinc-900/80 backdrop-blur-sm rounded-xl p-5 border border-zinc-800 sticky top-20">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-semibold flex items-center gap-2">
                    <Folder className="w-5 h-5" />
                    My Folders
                  </h2>
                  <Button
                    size="sm"
                    onClick={() => setShowNewFolder(true)}
                    className="bg-white hover:bg-gray-100 text-black"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <AnimatePresence>
                  {showNewFolder && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 space-y-3 overflow-hidden"
                    >
                      <Input
                        placeholder="Folder name"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                      <div className="flex flex-wrap gap-3">
                        {FOLDER_COLORS.map((color) => (
                          <button
                            key={color.name}
                            onClick={() => setNewFolderColor(color.name)}
                            className={`w-8 h-8 rounded-full ${color.class} transition-all ${
                              newFolderColor === color.name ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-800' : 'hover:scale-110'
                            }`}
                            title={color.name}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleCreateFolder}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                        >
                          Create
                        </Button>
                        <Button
                           size="sm"
                           variant="outline"
                           onClick={() => setShowNewFolder(false)}
                           className="border-zinc-700 bg-transparent text-white hover:bg-zinc-800 hover:text-white"
                         >
                           Cancel
                         </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {folders.map((folder) => (
                    <motion.div
                      key={folder.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedFolder?.id === folder.id
                          ? 'bg-white/10 border border-white/20'
                          : 'hover:bg-white/5 border border-transparent'
                      }`}
                      onClick={() => setSelectedFolder(folder)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${FOLDER_COLORS.find(c => c.name === folder.color)?.class || 'bg-blue-500'}`} />
                        {editingFolder?.id === folder.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="bg-zinc-800 border-zinc-700 text-white h-7 text-sm"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateFolder();
                              }}
                              className="h-7 w-7 p-0 bg-emerald-600 hover:bg-emerald-500"
                            >
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingFolder(null);
                              }}
                              className="h-7 w-7 p-0 text-white hover:bg-zinc-800"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="text-white text-sm flex-1">{folder.name}</span>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingFolder(folder);
                                  setEditName(folder.name);
                                }}
                                className="h-7 w-7 p-0 text-white/60 hover:text-white hover:bg-white/10"
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFolder(folder);
                                }}
                                className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
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

            {/* Candidates Area */}
            <div className="lg:col-span-2">
              {selectedFolder ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${FOLDER_COLORS.find(c => c.name === selectedFolder.color)?.class || 'bg-blue-500'}`} />
                      {selectedFolder.name}
                    </h2>
                    <Link to={createPageUrl('Home')}>
                       <Button variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
                         Add Candidates
                       </Button>
                     </Link>
                  </div>

                  {savedCandidates.length > 0 ? (
                    <div className="space-y-4">
                      {savedCandidates.map((saved) => (
                        <motion.div
                          key={saved.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-zinc-900/80 backdrop-blur-sm rounded-xl p-5 border border-zinc-800"
                        >
                          <CandidateCard
                            candidate={saved.candidate}
                            onClick={() => handleViewCandidate(saved.candidate)}
                            onDownload={() => handleDownload(saved.candidate)}
                            onShare={() => handleShare(saved.candidate)}
                          />
                          
                          <div className="mt-4 pt-4 border-t border-zinc-800">
                            <div className="flex items-center gap-2 mb-2">
                              <StickyNote className="w-4 h-4 text-white/60" />
                              <span className="text-white/80 text-sm font-medium">Notes</span>
                            </div>
                            <Textarea
                              placeholder="Add notes about this candidate..."
                              value={candidateNotes[saved.id] !== undefined ? candidateNotes[saved.id] : (saved.notes || '')}
                              onChange={(e) => setCandidateNotes({ ...candidateNotes, [saved.id]: e.target.value })}
                              onBlur={() => {
                                if (candidateNotes[saved.id] !== undefined) {
                                  updateNotesMutation.mutate({ id: saved.id, notes: candidateNotes[saved.id] });
                                }
                              }}
                              className="bg-zinc-800 border-zinc-700 text-white text-sm min-h-[80px]"
                            />
                            <div className="flex justify-end mt-3">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeCandidateMutation.mutate(saved.id)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remove from folder
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-zinc-900/80 backdrop-blur-sm rounded-xl p-12 border border-zinc-800 text-center">
                      <Folder className="w-12 h-12 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">No candidates in this folder yet</p>
                      <Link to={createPageUrl('Home')}>
                        <Button className="bg-white hover:bg-gray-100 text-black">
                          Browse Scans
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-zinc-900/80 backdrop-blur-sm rounded-xl p-12 border border-zinc-800 text-center h-full flex flex-col items-center justify-center">
                  <FolderPlus className="w-16 h-16 text-white/40 mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Select a Folder</h3>
                  <p className="text-white/60">Choose a folder to view saved candidates</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}