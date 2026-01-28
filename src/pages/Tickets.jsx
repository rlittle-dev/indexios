import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, CheckCircle2, Clock, AlertCircle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function Tickets() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [adminResponse, setAdminResponse] = useState('');
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (!isAuthenticated) {
        base44.auth.redirectToLogin(createPageUrl('Tickets'));
        return;
      }
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setLoading(false);
    };
    checkAuth();
  }, []);

  const { data: userTickets = [] } = useQuery({
    queryKey: ['userTickets', user?.email],
    queryFn: async () => {
      const tickets = await base44.entities.Ticket.filter({ user_email: user?.email }, '-created_date');
      return tickets.filter(t => t.status !== 'resolved');
    },
    enabled: !!user && user.role !== 'admin',
    refetchInterval: selectedTicket ? 3000 : false,
  });

  const { data: allTickets = [] } = useQuery({
    queryKey: ['allTickets'],
    queryFn: () => base44.entities.Ticket.list('-created_date', 100),
    enabled: !!user && user.role === 'admin',
    refetchInterval: selectedTicket ? 3000 : false,
  });

  useEffect(() => {
    if (!selectedTicket || user?.role === 'admin') return;
    const checkTicketStatus = async () => {
      const tickets = await base44.entities.Ticket.filter({ id: selectedTicket.id });
      if (tickets.length > 0) {
        const currentTicket = tickets[0];
        if (currentTicket.status === 'resolved') {
          toast.info('This ticket has been resolved and closed.');
          setSelectedTicket(null);
          queryClient.invalidateQueries({ queryKey: ['userTickets'] });
        } else {
          setSelectedTicket(currentTicket);
        }
      }
    };
    const interval = setInterval(checkTicketStatus, 3000);
    return () => clearInterval(interval);
  }, [selectedTicket, user]);

  const respondToTicketMutation = useMutation({
    mutationFn: async ({ ticketId, message }) => {
      const ticket = selectedTicket;
      const responses = ticket.responses || [];
      responses.push({ responder_email: user.email, message, timestamp: new Date().toISOString() });
      return await base44.entities.Ticket.update(ticketId, { responses });
    },
    onSuccess: (updatedTicket) => {
      queryClient.invalidateQueries({ queryKey: ['allTickets'] });
      queryClient.invalidateQueries({ queryKey: ['userTickets'] });
      setAdminResponse('');
      setSelectedTicket(updatedTicket);
      toast.success('Response added!');
    },
  });

  const updateTicketStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status }) => {
      const updatedTicket = await base44.entities.Ticket.update(ticketId, { status });
      if (status === 'resolved') {
        try { await base44.functions.invoke('sendTicketResolvedEmail', { ticketId }); } catch (error) {}
      }
      return updatedTicket;
    },
    onSuccess: (updatedTicket) => {
      queryClient.invalidateQueries({ queryKey: ['allTickets'] });
      queryClient.invalidateQueries({ queryKey: ['userTickets'] });
      setSelectedTicket(updatedTicket);
      toast.success(updatedTicket.status === 'resolved' ? 'Ticket resolved!' : 'Ticket updated!');
    },
  });

  const handleRespond = async () => {
    if (!adminResponse.trim()) return;
    respondToTicketMutation.mutate({ ticketId: selectedTicket.id, message: adminResponse });
  };

  const statusConfig = {
    open: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: AlertCircle },
    in_progress: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Clock },
    resolved: { color: 'text-green-400', bg: 'bg-green-500/20', icon: CheckCircle2 },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const tickets = isAdmin ? allTickets : userTickets;

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
            <MessageCircle className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Support</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight leading-[1.1] mb-4">
            <span className="text-white/60">{isAdmin ? 'Support' : 'My'}</span>
            <span className="text-white font-medium"> Tickets</span>
          </h1>
          <p className="text-lg text-white/50 max-w-xl mx-auto">{isAdmin ? 'Manage and respond to support requests' : 'View and track your support requests'}</p>
        </motion.div>

        {selectedTicket ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <button onClick={() => setSelectedTicket(null)} className="text-white/60 hover:text-white flex items-center gap-2 text-sm">
                  <ArrowLeft className="w-4 h-4" /> Back to Tickets
                </button>
                <Badge className={`${statusConfig[selectedTicket.status]?.bg} ${statusConfig[selectedTicket.status]?.color} border-0`}>
                  {selectedTicket.status.charAt(0).toUpperCase() + selectedTicket.status.slice(1)}
                </Badge>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-medium text-white mb-2">{selectedTicket.subject}</h2>
                      <p className="text-white/40 text-sm">Created {new Date(selectedTicket.created_date).toLocaleDateString()}</p>
                    </div>
                    {isAdmin && selectedTicket.status !== 'resolved' && (
                      <Button onClick={() => updateTicketStatusMutation.mutate({ ticketId: selectedTicket.id, status: selectedTicket.status === 'open' ? 'in_progress' : 'resolved' })} size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl">
                        {selectedTicket.status === 'open' ? 'Mark In Progress' : 'Resolve'}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
                  <p className="text-white/40 text-sm mb-2">Original Message</p>
                  <p className="text-white">{selectedTicket.message}</p>
                </div>

                {selectedTicket.responses && selectedTicket.responses.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-white/40 text-sm font-medium">Responses</p>
                    {selectedTicket.responses.map((response, index) => (
                      <div key={index} className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
                        <p className="text-white/80 text-sm font-medium mb-1">{response.responder_email}</p>
                        <p className="text-white/40 text-xs mb-2">{new Date(response.timestamp).toLocaleString()}</p>
                        <p className="text-white">{response.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                {selectedTicket.status !== 'resolved' && (
                  <div className="border-t border-white/[0.06] pt-6">
                    <label className="text-white/80 text-sm mb-2 block">{isAdmin ? 'Add Response' : 'Reply to Support'}</label>
                    <textarea
                      placeholder="Type your message..."
                      value={adminResponse}
                      onChange={(e) => setAdminResponse(e.target.value)}
                      rows="3"
                      className="w-full bg-white/[0.02] border border-white/10 text-white rounded-xl px-4 py-3 text-sm placeholder-white/30 focus:outline-none focus:border-purple-500/50 mb-3"
                    />
                    <Button onClick={handleRespond} disabled={!adminResponse.trim() || respondToTicketMutation.isPending} className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl">
                      <Send className="w-4 h-4 mr-2" />Send
                    </Button>
                  </div>
                )}
                {selectedTicket.status === 'resolved' && !isAdmin && (
                  <div className="border-t border-white/[0.06] pt-6">
                    <p className="text-white/40 text-sm text-center">This ticket has been resolved and closed.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {tickets.length > 0 ? (
              tickets.map((ticket, index) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedTicket(ticket)}
                  className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 p-5 cursor-pointer hover:border-white/20 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-white">{ticket.subject}</h3>
                        {React.createElement(statusConfig[ticket.status]?.icon || AlertCircle, { className: `w-4 h-4 ${statusConfig[ticket.status]?.color}` })}
                      </div>
                      <p className="text-white/40 text-sm mb-1">{isAdmin ? `From: ${ticket.user_email}` : `ID: ${ticket.id.slice(0, 8)}`}</p>
                      <p className="text-white/30 text-sm">{new Date(ticket.created_date).toLocaleDateString()}</p>
                    </div>
                    <Badge className={`${statusConfig[ticket.status]?.bg} ${statusConfig[ticket.status]?.color} border-0`}>
                      {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                    </Badge>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 p-12 text-center">
                <AlertCircle className="w-8 h-8 text-white/40 mx-auto mb-4" />
                <p className="text-white/60">{isAdmin ? 'No support tickets yet' : 'No support tickets. Create one if you need help!'}</p>
                {!isAdmin && (
                  <Link to={createPageUrl('Contact')}>
                    <Button className="mt-4 bg-white hover:bg-white/90 text-black font-medium rounded-full">Create Ticket</Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}