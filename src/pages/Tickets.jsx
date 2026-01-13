import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  // Fetch user's tickets (exclude resolved ones)
  const { data: userTickets = [] } = useQuery({
    queryKey: ['userTickets', user?.email],
    queryFn: async () => {
      const tickets = await base44.entities.Ticket.filter({ user_email: user?.email }, '-created_date');
      // Filter out resolved tickets for regular users
      return tickets.filter(t => t.status !== 'resolved');
    },
    enabled: !!user && user.role !== 'admin',
  });

  // Fetch all tickets for admins
  const { data: allTickets = [] } = useQuery({
    queryKey: ['allTickets'],
    queryFn: () => base44.entities.Ticket.list('-created_date', 100),
    enabled: !!user && user.role === 'admin',
  });



  const respondToTicketMutation = useMutation({
    mutationFn: async ({ ticketId, message }) => {
      const ticket = selectedTicket;
      const responses = ticket.responses || [];
      responses.push({
        responder_email: user.email,
        message,
        timestamp: new Date().toISOString()
      });
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
      return await base44.entities.Ticket.update(ticketId, { status });
    },
    onSuccess: (updatedTicket) => {
      queryClient.invalidateQueries({ queryKey: ['allTickets'] });
      queryClient.invalidateQueries({ queryKey: ['userTickets'] });
      setSelectedTicket(updatedTicket);
      toast.success('Ticket updated!');
    },
  });



  const handleRespond = async () => {
    if (!adminResponse.trim()) return;
    respondToTicketMutation.mutate({ ticketId: selectedTicket.id, message: adminResponse });
  };

  const statusConfig = {
    open: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: AlertCircle },
    in_progress: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Clock },
    resolved: { color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle2 },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const tickets = isAdmin ? allTickets : userTickets;

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
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
          <div className="mb-8">
            <h1 className="text-4xl font-black text-white mb-2">
              {isAdmin ? 'Support Tickets' : 'My Support Tickets'}
            </h1>
            <p className="text-white/60">
              {isAdmin ? 'Manage and respond to support requests' : 'View and track your support requests'}
            </p>
          </div>



          {/* Tickets List */}
          {selectedTicket ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-800"
            >
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-white/60 hover:text-white mb-4 flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Tickets
              </button>

              <div className="space-y-6">
                {/* Ticket Header */}
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">{selectedTicket.subject}</h2>
                      <p className="text-white/60 text-sm">Ticket ID: {selectedTicket.id}</p>
                    </div>
                    <div className="flex gap-2">
                      {isAdmin && selectedTicket.status !== 'resolved' && (
                        <Button
                          onClick={() => updateTicketStatusMutation.mutate({ ticketId: selectedTicket.id, status: selectedTicket.status === 'open' ? 'in_progress' : 'resolved' })}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {selectedTicket.status === 'open' ? 'Mark In Progress' : 'Resolve'}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {React.createElement(statusConfig[selectedTicket.status]?.icon || AlertCircle, {
                      className: `w-5 h-5 ${statusConfig[selectedTicket.status]?.color}`,
                    })}
                    <span className={`font-medium ${statusConfig[selectedTicket.status]?.color}`}>
                      {selectedTicket.status.charAt(0).toUpperCase() + selectedTicket.status.slice(1)}
                    </span>
                    <span className="text-white/60">•</span>
                    <span className="text-white/60 text-sm">
                      Created {new Date(selectedTicket.created_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Initial Message */}
                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                  <p className="text-white/60 text-sm mb-2">Original Message</p>
                  <p className="text-white">{selectedTicket.message}</p>
                </div>

                {/* Responses */}
                {selectedTicket.responses && selectedTicket.responses.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-white/60 text-sm font-medium">Responses</p>
                    {selectedTicket.responses.map((response, index) => (
                      <div key={index} className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                        <p className="text-white/80 text-sm font-medium mb-2">{response.responder_email}</p>
                        <p className="text-white/60 text-xs mb-2">
                          {new Date(response.timestamp).toLocaleString()}
                        </p>
                        <p className="text-white">{response.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Response Form */}
                {selectedTicket.status !== 'resolved' && (
                  <div className="border-t border-zinc-700 pt-6">
                    <label className="text-white/80 text-sm mb-2 block">
                      {isAdmin ? 'Add Response' : 'Reply to Support Team'}
                    </label>
                    <textarea
                      placeholder={isAdmin ? "Type your response..." : "Type your reply..."}
                      value={adminResponse}
                      onChange={(e) => setAdminResponse(e.target.value)}
                      rows="3"
                      className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm placeholder-white/40 focus:outline-none focus:border-purple-500 mb-3"
                    />
                    <Button
                      onClick={handleRespond}
                      disabled={!adminResponse.trim() || respondToTicketMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {isAdmin ? 'Send Response' : 'Send Reply'}
                    </Button>
                  </div>
                )}
                {selectedTicket.status === 'resolved' && !isAdmin && (
                  <div className="border-t border-zinc-700 pt-6">
                    <p className="text-white/60 text-sm text-center">This ticket has been resolved and closed.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="grid gap-3">
              {tickets.length > 0 ? (
                tickets.map((ticket, index) => (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedTicket(ticket)}
                    className="bg-zinc-900/80 backdrop-blur-sm rounded-xl p-4 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{ticket.subject}</h3>
                          {React.createElement(statusConfig[ticket.status]?.icon || AlertCircle, {
                            className: `w-4 h-4 ${statusConfig[ticket.status]?.color}`,
                          })}
                        </div>
                        <p className="text-white/60 text-sm mb-2">
                          {isAdmin ? `From: ${ticket.user_email}` : `ID: ${ticket.id}`}
                        </p>
                        <p className="text-white/50 text-sm">
                          {new Date(ticket.created_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[ticket.status]?.bg} ${statusConfig[ticket.status]?.color}`}>
                        {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="w-8 h-8 text-white/40 mx-auto mb-4" />
                  <p className="text-white/60">
                    {isAdmin ? 'No support tickets yet' : 'No support tickets. Create one if you need help!'}
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}