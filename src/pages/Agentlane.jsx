import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, Shield, CheckCircle, XCircle, Clock, Loader2, 
  Plus, Trash2, Eye, FileText, CreditCard, Link2,
  AlertTriangle, Zap
} from 'lucide-react';
import { createPageUrl } from '@/utils';

const RISK_COLORS = {
  low: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  med: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  high: 'bg-red-500/20 text-red-300 border-red-500/30'
};

const ACTION_ICONS = {
  'resume.view': Eye,
  'resume.list': FileText,
  'resume.scan': FileText,
  'verification.run': Shield,
  'attestation.create': Link2,
  'subscription.change': CreditCard,
  'subscription.cancel': CreditCard,
  'folder.create': Plus,
  'candidate.save': Plus
};

export default function Agentlane() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState([]);
  const [pendingActions, setPendingActions] = useState([]);
  const [actionHistory, setActionHistory] = useState([]);
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [agentName, setAgentName] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [deciding, setDeciding] = useState(null);
  const [activeTab, setActiveTab] = useState('agents');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        setLoading(false);
        return;
      }

      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Fetch user's enrolled agents
      const userAgents = await base44.entities.PortaldAgent.filter({ user_email: currentUser.email });
      setAgents(userAgents.filter(a => a.status !== 'pending'));

      // Fetch pending actions
      const pending = await base44.entities.PortaldAction.filter({ 
        user_email: currentUser.email, 
        status: 'pending' 
      });
      setPendingActions(pending);

      // Fetch action history (last 50)
      const history = await base44.entities.PortaldAction.filter({ user_email: currentUser.email });
      setActionHistory(history.filter(a => a.status !== 'pending').slice(0, 50));

    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const handleEnrollAgent = async () => {
    if (!enrollmentCode.trim()) return;
    setEnrolling(true);
    try {
      const response = await base44.functions.invoke('portaldEnrollAgent', {
        enrollment_code: enrollmentCode.trim(),
        agent_name: agentName.trim() || 'AI Agent'
      });

      if (response.data?.success) {
        setEnrollmentCode('');
        setAgentName('');
        fetchData();
      } else {
        alert(response.data?.error || 'Failed to enroll agent');
      }
    } catch (error) {
      alert('Failed to enroll agent: ' + error.message);
    }
    setEnrolling(false);
  };

  const handleRevokeAgent = async (agentId) => {
    if (!confirm('Revoke this agent? It will no longer be able to perform actions on your behalf.')) return;
    try {
      await base44.entities.PortaldAgent.update(agentId, {
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        current_session_token: null
      });
      fetchData();
    } catch (error) {
      alert('Failed to revoke agent');
    }
  };

  const handleActionDecision = async (actionId, decision) => {
    setDeciding(actionId);
    try {
      const response = await base44.functions.invoke('portaldActionDecision', {
        action_id: actionId,
        decision
      });

      if (response.data?.success) {
        fetchData();
      } else {
        alert(response.data?.error || 'Failed to process decision');
      }
    } catch (error) {
      alert('Failed to process decision: ' + error.message);
    }
    setDeciding(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <section className="relative min-h-screen bg-[#0a0a0a] overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-purple-500/[0.04] rounded-full blur-[150px]" />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto px-4 py-20 text-center">
          <Bot className="w-16 h-16 text-purple-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">Agent Lane</h1>
          <p className="text-white/60 mb-8">Sign in to manage your AI agents and approve their actions.</p>
          <Button onClick={() => base44.auth.redirectToLogin(createPageUrl('Agentlane'))} className="bg-white hover:bg-white/90 text-black font-medium rounded-full px-8">
            Sign In
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-purple-500/[0.04] rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 md:py-20">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 mb-6">
            <Bot className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Portald Integration</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight leading-[1.1] mb-4">
            <span className="text-white/60">Agent</span>
            <span className="text-white font-medium"> Lane</span>
          </h1>
          <p className="text-lg text-white/50 max-w-xl mx-auto">
            Manage AI agents and approve their actions on your Indexios account
          </p>
        </motion.div>

        {/* Pending Actions Alert */}
        {pendingActions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl bg-yellow-900/20 border border-yellow-500/30 p-4"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-300 font-medium">
                {pendingActions.length} action{pendingActions.length > 1 ? 's' : ''} awaiting your approval
              </span>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {['agents', 'pending', 'history'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab 
                  ? 'bg-white/10 text-white border border-white/20' 
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab === 'agents' && 'My Agents'}
              {tab === 'pending' && `Pending (${pendingActions.length})`}
              {tab === 'history' && 'History'}
            </button>
          ))}
        </div>

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <div className="space-y-6">
            {/* Enroll New Agent */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-purple-500/30 overflow-hidden">
                <div className="px-5 py-3 border-b border-purple-500/20 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Enroll New Agent</span>
                </div>
                <div className="p-6">
                  <p className="text-white/60 text-sm mb-4">
                    Enter the enrollment code provided by your AI agent to authorize it.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      placeholder="Enrollment code (e.g., ABC123)"
                      value={enrollmentCode}
                      onChange={(e) => setEnrollmentCode(e.target.value.toUpperCase())}
                      className="bg-white/[0.02] border-white/10 text-white placeholder:text-white/30 rounded-xl font-mono"
                    />
                    <Input
                      placeholder="Agent name (optional)"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      className="bg-white/[0.02] border-white/10 text-white placeholder:text-white/30 rounded-xl"
                    />
                    <Button 
                      onClick={handleEnrollAgent}
                      disabled={enrolling || !enrollmentCode.trim()}
                      className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl px-6"
                    >
                      {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enroll'}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Enrolled Agents */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Enrolled Agents</span>
                </div>
                <div className="p-6">
                  {agents.filter(a => a.status === 'enrolled').length === 0 ? (
                    <p className="text-white/40 text-center py-8">No agents enrolled yet</p>
                  ) : (
                    <div className="space-y-3">
                      {agents.filter(a => a.status === 'enrolled').map((agent) => (
                        <div key={agent.id} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-emerald-500/20">
                              <Bot className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-white font-medium">{agent.agent_name}</p>
                              <p className="text-white/40 text-xs">
                                Enrolled {new Date(agent.enrolled_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="hidden sm:flex flex-wrap gap-1">
                              {(agent.permissions || []).slice(0, 3).map((perm) => (
                                <Badge key={perm} className="bg-white/5 text-white/50 border-0 text-xs">
                                  {perm.split('.')[1]}
                                </Badge>
                              ))}
                              {(agent.permissions || []).length > 3 && (
                                <Badge className="bg-white/5 text-white/50 border-0 text-xs">
                                  +{agent.permissions.length - 3}
                                </Badge>
                              )}
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleRevokeAgent(agent.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Pending Actions Tab */}
        {activeTab === 'pending' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Pending Approval</span>
              </div>
              <div className="p-6">
                {pendingActions.length === 0 ? (
                  <p className="text-white/40 text-center py-8">No pending actions</p>
                ) : (
                  <div className="space-y-4">
                    {pendingActions.map((action) => {
                      const Icon = ACTION_ICONS[action.action_type] || Zap;
                      const payload = JSON.parse(action.action_payload || '{}');
                      return (
                        <div key={action.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${RISK_COLORS[action.risk_level]?.split(' ')[0] || 'bg-white/10'}`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-white font-medium">{action.action_type}</p>
                                <p className="text-white/40 text-xs">
                                  {new Date(action.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <Badge className={RISK_COLORS[action.risk_level]}>
                              {action.risk_level} risk
                            </Badge>
                          </div>
                          
                          <div className="bg-white/[0.02] rounded-lg p-3 mb-4 font-mono text-xs text-white/60 overflow-x-auto">
                            <pre>{JSON.stringify(payload, null, 2)}</pre>
                          </div>

                          <div className="flex gap-3">
                            <Button
                              onClick={() => handleActionDecision(action.id, 'approve')}
                              disabled={deciding === action.id}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl"
                            >
                              {deciding === action.id ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <CheckCircle className="w-4 h-4 mr-2" />
                              )}
                              Approve
                            </Button>
                            <Button
                              onClick={() => handleActionDecision(action.id, 'deny')}
                              disabled={deciding === action.id}
                              variant="outline"
                              className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Deny
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Action History</span>
              </div>
              <div className="p-6">
                {actionHistory.length === 0 ? (
                  <p className="text-white/40 text-center py-8">No action history yet</p>
                ) : (
                  <div className="space-y-2">
                    {actionHistory.map((action) => {
                      const Icon = ACTION_ICONS[action.action_type] || Zap;
                      return (
                        <div key={action.id} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                          <div className="flex items-center gap-3">
                            <Icon className="w-4 h-4 text-white/40" />
                            <div>
                              <p className="text-white text-sm">{action.action_type}</p>
                              <p className="text-white/40 text-xs">
                                {new Date(action.decided_at || action.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <Badge className={action.status === 'approved' 
                            ? 'bg-emerald-500/20 text-emerald-300 border-0' 
                            : 'bg-red-500/20 text-red-300 border-0'
                          }>
                            {action.status === 'approved' ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                            {action.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Info Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 p-6 mt-6">
            <h3 className="text-white font-medium mb-4 text-sm">About Agent Lane</h3>
            <div className="space-y-2 text-white/40 text-sm">
              <p>Agent Lane uses Portald to securely gate AI agent actions on your account.</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><span className="text-emerald-400">Low risk</span> actions (viewing, listing) execute automatically</li>
                <li><span className="text-yellow-400">Medium risk</span> actions (scans, verifications) require your approval</li>
                <li><span className="text-red-400">High risk</span> actions (payments, attestations) require approval + verification</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}