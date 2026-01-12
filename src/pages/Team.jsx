import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Mail, UserPlus, Trash2, Crown, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
      const owned = await base44.entities.Team.filter({ owner_email: user.email });
      return owned;
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
      const team = await base44.entities.Team.create({
        name: teamName,
        owner_email: user.email
      });
      
      // Add owner as team member
      await base44.entities.TeamMember.create({
        team_id: team.id,
        user_email: user.email,
        role: 'owner',
        status: 'active'
      });
      
      return team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });

  const inviteMemberMutation = useMutation({
    mutationFn: async (email) => {
      // Invite user to the app
      await base44.users.inviteUser(email, 'user');
      
      // Add them to the team
      await base44.entities.TeamMember.create({
        team_id: teams[0].id,
        user_email: email,
        role: 'member',
        status: 'pending'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      setInviteEmail('');
      setInviting(false);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId) => {
      await base44.entities.TeamMember.update(memberId, { status: 'removed' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId) => {
      // Delete all team members first
      const members = await base44.entities.TeamMember.filter({ team_id: teamId });
      await Promise.all(members.map(m => base44.entities.TeamMember.delete(m.id)));
      
      // Delete the team
      await base44.entities.Team.delete(teamId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    },
  });

  const handleCreateTeam = async () => {
    const teamName = prompt('Enter team name:');
    if (teamName) {
      await createTeamMutation.mutateAsync(teamName);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    
    setInviting(true);
    await inviteMemberMutation.mutateAsync(inviteEmail);
  };

  const handleDeleteTeam = async () => {
    if (!teams[0]) return;
    
    const confirmed = window.confirm('Are you sure you want to delete this team? This action cannot be undone.');
    if (confirmed) {
      await deleteTeamMutation.mutateAsync(teams[0].id);
    }
  };

  const hasTeamAccess = user?.subscription_tier === 'professional' || user?.subscription_tier === 'enterprise';

  const teamCapacity = user?.subscription_tier === 'enterprise' ? 'unlimited' : 5;

  const activeMembers = teamMembers.filter(m => m.status !== 'removed').length;

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
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 md:py-12">
        <Link to={createPageUrl('Home')}>
          <Button variant="ghost" className="mb-6 text-white hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Team Management</h1>
            <p className="text-white/60">Collaborate with your team on resume verification</p>
          </div>

          {!hasTeamAccess ? (
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader className="text-center">
                <div className="inline-flex p-4 rounded-full bg-yellow-500/10 mb-4 mx-auto">
                  <Users className="w-8 h-8 text-yellow-400" />
                </div>
                <CardTitle className="text-white text-2xl">Professional Feature</CardTitle>
                <CardDescription className="text-white/60">
                  Team collaboration is available on Professional and Enterprise plans
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Link to={createPageUrl('Pricing')}>
                  <Button className="bg-white hover:bg-gray-100 text-black font-medium">
                    Upgrade to Professional
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              {teams.length === 0 ? (
                <Card className="bg-zinc-900/80 border-zinc-800">
                  <CardHeader className="text-center">
                    <div className="inline-flex p-4 rounded-full bg-emerald-500/10 mb-4 mx-auto">
                      <Users className="w-8 h-8 text-emerald-400" />
                    </div>
                    <CardTitle className="text-white text-2xl">Create Your Team</CardTitle>
                    <CardDescription className="text-white/60">
                      Start collaborating with your team members
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Button
                      onClick={handleCreateTeam}
                      className="bg-white hover:bg-gray-100 text-black font-medium"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Create Team
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Team Info */}
                  <Card className="bg-zinc-900/80 border-zinc-800">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-emerald-400" />
                            {teams[0].name}
                          </CardTitle>
                          <CardDescription className="text-white/60">
                            {teamMembers.filter(m => m.status === 'active').length} active members
                          </CardDescription>
                        </div>
                        <Button
                          onClick={handleDeleteTeam}
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Team
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Invite Members */}
                  <Card className="bg-zinc-900/80 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-white">Invite Team Members</CardTitle>
                      <CardDescription className="text-white/60">
                        Send invitations to collaborate on resume scans {teamCapacity !== 'unlimited' && `(${activeMembers}/${teamCapacity} members)`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {teamCapacity !== 'unlimited' && activeMembers >= teamCapacity ? (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
                          <p className="text-yellow-400 text-sm">
                            You've reached the team capacity of {teamCapacity} members. Contact support to expand your team size.
                          </p>
                        </div>
                      ) : null}
                      <form onSubmit={handleInvite} className="flex gap-2">
                        <Input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="colleague@company.com"
                          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-white/40"
                          disabled={teamCapacity !== 'unlimited' && activeMembers >= teamCapacity}
                        />
                        <Button
                          type="submit"
                          disabled={inviting || !inviteEmail || (teamCapacity !== 'unlimited' && activeMembers >= teamCapacity)}
                          className="bg-white hover:bg-gray-100 text-black font-medium"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Invite
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Team Members List */}
                  <Card className="bg-zinc-900/80 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-white">Team Members</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {teamMembers.filter(m => m.status !== 'removed').map((member) => (
                          <motion.div
                            key={member.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-4 border border-zinc-700"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-white/5">
                                <Mail className="w-4 h-4 text-white/60" />
                              </div>
                              <div>
                                <p className="text-white font-medium">{member.user_email}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  {member.role === 'owner' && (
                                    <span className="flex items-center gap-1 text-xs text-yellow-400">
                                      <Crown className="w-3 h-3" />
                                      Owner
                                    </span>
                                  )}
                                  <span className={`text-xs ${
                                    member.status === 'active' ? 'text-emerald-400' : 'text-yellow-400'
                                  }`}>
                                    {member.status === 'pending' ? 'Pending' : 'Active'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {member.role !== 'owner' && (
                              <Button
                                onClick={() => removeMemberMutation.mutate(member.id)}
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}