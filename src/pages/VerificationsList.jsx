import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

export default function VerificationsList() {
  const [user, setUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        base44.auth.redirectToLogin(createPageUrl('VerificationsList'));
      }
    };
    fetchUser();
  }, []);

  const { data: verifications = [], isLoading } = useQuery({
    queryKey: ['verifications'],
    queryFn: () => base44.entities.Verification.list('-created_date', 100),
    enabled: !!user,
    refetchInterval: 10000
  });

  const filteredVerifications = verifications.filter(v => {
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    if (resultFilter !== 'all') {
      if (resultFilter === 'pending' && v.finalResult) return false;
      if (resultFilter !== 'pending' && v.finalResult !== resultFilter) return false;
    }
    return true;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING_CONSENT: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Pending' },
      CONSENT_APPROVED: { color: 'bg-blue-500/20 text-blue-400', label: 'Approved' },
      CONSENT_DENIED: { color: 'bg-red-500/20 text-red-400', label: 'Denied' },
      CALL_IN_PROGRESS: { color: 'bg-purple-500/20 text-purple-400', label: 'Calling' },
      PHONE_COMPLETED: { color: 'bg-orange-500/20 text-orange-400', label: 'Phone Done' },
      EMPLOYER_EMAIL_SENT: { color: 'bg-indigo-500/20 text-indigo-400', label: 'Email Sent' },
      COMPLETED: { color: 'bg-green-500/20 text-green-400', label: 'Complete' }
    };
    const config = statusConfig[status] || statusConfig.PENDING_CONSENT;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getResultBadge = (result) => {
    if (!result) return <Badge className="bg-gray-500/20 text-gray-400">Pending</Badge>;
    if (result === 'YES') return <Badge className="bg-green-500/20 text-green-400">✓ Verified</Badge>;
    return <Badge className="bg-red-500/20 text-red-400">✗ Not Verified</Badge>;
  };

  if (!user || isLoading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Employment Verifications</h1>
            <p className="text-white/60">Manage and track verification requests</p>
          </div>
          <Link to={createPageUrl('NewVerification')}>
            <Button className="bg-white hover:bg-gray-100 text-black font-medium">
              <Plus className="w-4 h-4 mr-2" />
              New Verification
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-white/60" />
            <span className="text-white/60 text-sm">Filters:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="PENDING_CONSENT">Pending Consent</option>
            <option value="CONSENT_APPROVED">Consent Approved</option>
            <option value="CALL_IN_PROGRESS">Call In Progress</option>
            <option value="PHONE_COMPLETED">Phone Completed</option>
            <option value="EMPLOYER_EMAIL_SENT">Email Sent</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="all">All Results</option>
            <option value="pending">Pending</option>
            <option value="YES">Verified</option>
            <option value="NO">Not Verified</option>
          </select>
        </motion.div>

        {/* List */}
        <div className="space-y-3">
          {filteredVerifications.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
              <Search className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/60">No verifications found</p>
            </div>
          ) : (
            filteredVerifications.map((verification, index) => (
              <motion.div
                key={verification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={createPageUrl('VerificationDetail') + `?id=${verification.id}`}>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {verification.candidateName}
                        </h3>
                        <p className="text-white/60 text-sm">{verification.companyName}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(verification.status)}
                        {getResultBadge(verification.finalResult)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <p className="text-white/40">
                        Created {format(new Date(verification.created_date), 'MMM d, yyyy')}
                      </p>
                      {verification.finalReason && (
                        <p className="text-white/40">{verification.finalReason}</p>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}