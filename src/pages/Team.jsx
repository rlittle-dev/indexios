import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Mail, UserPlus, Trash2, Crown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Team() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setLoading(false);
    };
    fetchUser();
  }, []);

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.Team.filter({ owner_email: user.email });
    },
    enabled: !!user,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers', teams[0]?.id],
    queryFn: async () => {
      if (!teams[0]) return [];
      return await base44.entities.TeamMember.filter({ team_id: teams[0].id });
    },
    enabled: teams.length > 0,
  });

  const createTeamMutation = useMutation({
    mutationFn: async (teamName) => {
      const team = await base44.entities.Team.create({ name: teamName, owner_email: user.email });
      await base44.entities.TeamMember.create({ team_id: team.id, user_email: user.email, role: 'owner', status: 'active' });
      return team;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });

  const inviteMemberMutation = useMutation({
    mutationFn: async (email) => {
      await base44.entities.TeamMember.create({ team_id: teams[0].id, user_email: email, role: 'member', status: 'pending' });
      await base44.functions.invoke('sendTeamInvite', { email, teamId: teams[0].id, teamName: teams[0].name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      setInviteEmail('');
      setInviting(false);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId) => await base44.entities.TeamMember.update(memberId, { status: 'removed' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teamMembers'] }),
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId) => {
      const members = await base44.entities.TeamMember.filter({ team_id: teamId });
      await Promise.all(members.map(m => base44.entities.TeamMember.delete(m.id)));
      await base44.entities.Team.delete(teamId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    },
  });

  const handleCreateTeam = async () => {
    const teamName = prompt('Enter team name:');
    if (teamName) await createTeamMutation.mutateAsync(teamName);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    await inviteMemberMutation.mutateAsync(inviteEmail);
  };

  const handleDeleteTeam = async () => {
    if (!teams[0]) return;
    if (window.confirm('Are you sure you want to delete this team?')) {
      await deleteTeamMutation.mutateAsync(teams[0].id);
    }
  };

  const hasTeamAccess = user?.subscription_tier === 'enterprise';
  const activeMembers = teamMembers.filter(m => m.status !== 'removed').length;

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

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 md:py-20">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 mb-6">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Collaboration</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight leading-[1.1] mb-4">
            <span className="text-white/60">Team</span>
            <span className="text-white font-medium"> Management</span>
          </h1>
          <p className="text-lg text-white/50 max-w-xl mx-auto">Collaborate with your team on employment verification</p>
        </motion.div>

        {!hasTeamAccess ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-purple-500/30 overflow-hidden">
              <div className="px-5 py-3 border-b border-purple-500/20 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Access Required</span>
              </div>
              <div className="p-8 text-center">
                <div className="inline-flex p-4 rounded-2xl bg-red-500/10 mb-6">
                  <Lock className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-white text-2xl font-medium mb-3">Enterprise Feature</h3>
                <p className="text-white/50 mb-6 max-w-md mx-auto">
                  Team collaboration is available on Enterprise plans
                </p>
                <Link to={createPageUrl('Pricing')}>
                  <Button className="bg-white hover:bg-white/90 text-black font-medium rounded-full px-8">
                    View Plans
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        ) : teams.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Get Started</span>
              </div>
              <div className="p-8 text-center">
                <div className="inline-flex p-4 rounded-2xl bg-emerald-500/10 mb-6">
                  <Users className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-white text-2xl font-medium mb-3">Create Your Team</h3>
                <p className="text-white/50 mb-6">Start collaborating with your team members</p>
                <Button onClick={handleCreateTeam} className="bg-white hover:bg-white/90 text-black font-medium rounded-full px-8">
                  <Users className="w-4 h-4 mr-2" />
                  Create Team
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Team Info */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Your Team</span>
                  </div>
                  <Button onClick={handleDeleteTeam} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-white/60" />
                    </div>
                    <div>
                      <h2 className="text-xl font-medium text-white">{teams[0].name}</h2>
                      <p className="text-white/40 text-sm">{activeMembers} members</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Invite Members */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Invite Members</span>
                </div>
                <div className="p-6">
                  <form onSubmit={handleInvite} className="flex gap-3">
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      className="bg-white/[0.02] border-white/10 text-white placeholder:text-white/30 rounded-xl"
                    />
                    <Button type="submit" disabled={inviting || !inviteEmail} className="bg-white hover:bg-white/90 text-black font-medium rounded-xl">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite
                    </Button>
                  </form>
                </div>
              </div>
            </motion.div>

            {/* Team Members List */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Team Members</span>
                </div>
                <div className="p-6 space-y-3">
                  {teamMembers.filter(m => m.status !== 'removed').map((member) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                          <Mail className="w-4 h-4 text-white/40" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{member.user_email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {member.role === 'owner' && (
                              <Badge className="bg-yellow-500/20 text-yellow-300 border-0 text-xs">
                                <Crown className="w-3 h-3 mr-1" /> Owner
                              </Badge>
                            )}
                            <Badge className={member.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border-0 text-xs' : 'bg-yellow-500/20 text-yellow-300 border-0 text-xs'}>
                              {member.status === 'pending' ? 'Pending' : 'Active'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {member.role !== 'owner' && (
                        <Button onClick={() => removeMemberMutation.mutate(member.id)} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </section>
  );
}