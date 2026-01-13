import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Phone, Mail, ExternalLink, User, Building, Calendar, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

export default function VerificationDetail() {
  const [user, setUser] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const verificationId = urlParams.get('id');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        base44.auth.redirectToLogin(createPageUrl('VerificationDetail'));
      }
    };
    fetchUser();
  }, []);

  const { data: verification, isLoading } = useQuery({
    queryKey: ['verification', verificationId],
    queryFn: async () => {
      const results = await base44.entities.Verification.filter({ id: verificationId });
      return results[0];
    },
    enabled: !!verificationId && !!user,
    refetchInterval: 5000
  });

  const { data: consents = [] } = useQuery({
    queryKey: ['consents', verificationId],
    queryFn: () => base44.entities.Consent.filter({ verificationId }),
    enabled: !!verificationId && !!user,
    refetchInterval: 5000
  });

  const { data: calls = [] } = useQuery({
    queryKey: ['calls', verificationId],
    queryFn: () => base44.entities.Call.filter({ verificationId }),
    enabled: !!verificationId && !!user,
    refetchInterval: 5000
  });

  const { data: emailVerifications = [] } = useQuery({
    queryKey: ['emailVerifications', verificationId],
    queryFn: () => base44.entities.EmployerEmailVerification.filter({ verificationId }),
    enabled: !!verificationId && !!user,
    refetchInterval: 5000
  });

  if (!user || isLoading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  if (!verification) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-white">Verification not found</div>
    </div>;
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING_CONSENT: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Pending Consent' },
      CONSENT_APPROVED: { color: 'bg-blue-500/20 text-blue-400', label: 'Consent Approved' },
      CONSENT_DENIED: { color: 'bg-red-500/20 text-red-400', label: 'Consent Denied' },
      CALL_IN_PROGRESS: { color: 'bg-purple-500/20 text-purple-400', label: 'Call In Progress' },
      PHONE_COMPLETED: { color: 'bg-orange-500/20 text-orange-400', label: 'Phone Completed' },
      EMPLOYER_EMAIL_SENT: { color: 'bg-indigo-500/20 text-indigo-400', label: 'Email Sent to Employer' },
      COMPLETED: { color: 'bg-green-500/20 text-green-400', label: 'Completed' }
    };
    const config = statusConfig[status] || statusConfig.PENDING_CONSENT;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getResultBadge = (result) => {
    if (!result) return null;
    if (result === 'YES') {
      return <Badge className="bg-green-500/20 text-green-400 text-lg px-4 py-1">✓ VERIFIED</Badge>;
    }
    return <Badge className="bg-red-500/20 text-red-400 text-lg px-4 py-1">✗ NOT VERIFIED</Badge>;
  };

  const consent = consents[0];
  const call = calls[0];
  const emailVerif = emailVerifications[0];

  return (
    <div className="min-h-screen bg-zinc-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link to={createPageUrl('VerificationsList')}>
          <Button variant="ghost" className="mb-6 text-white hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to List
          </Button>
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 mb-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{verification.candidateName}</h1>
              <p className="text-white/60">{verification.candidateEmail}</p>
            </div>
            <div className="text-right space-y-2">
              {getStatusBadge(verification.status)}
              {getResultBadge(verification.finalResult)}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white/60">
                <Building className="w-4 h-4" />
                <span className="text-sm">Company</span>
              </div>
              <p className="text-white font-medium">{verification.companyName}</p>
            </div>
            {verification.jobTitle && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-white/60">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-sm">Position</span>
                </div>
                <p className="text-white font-medium">{verification.jobTitle}</p>
              </div>
            )}
            {verification.employmentDates && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-white/60">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Employment Dates</span>
                </div>
                <p className="text-white font-medium">{verification.employmentDates}</p>
              </div>
            )}
          </div>

          {verification.finalReason && (
            <div className="mt-6 p-4 bg-zinc-800 rounded-lg">
              <p className="text-white/60 text-sm">Final Reason</p>
              <p className="text-white font-medium">{verification.finalReason}</p>
            </div>
          )}
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8"
        >
          <h2 className="text-xl font-bold text-white mb-6">Verification Timeline</h2>

          <div className="space-y-6">
            {/* Consent Step */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                {consent?.status === 'APPROVED' ? (
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  </div>
                ) : consent?.status === 'DENIED' ? (
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-400" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-1">Candidate Consent</h3>
                <p className="text-white/60 text-sm mb-2">
                  {consent?.status === 'APPROVED' ? 'Candidate approved the verification request' :
                   consent?.status === 'DENIED' ? 'Candidate denied the verification request' :
                   'Waiting for candidate to approve consent'}
                </p>
                {consent?.actedAt && (
                  <p className="text-white/40 text-xs">
                    {format(new Date(consent.actedAt), 'MMM d, yyyy h:mm a')}
                  </p>
                )}
              </div>
            </div>

            {/* Call Step */}
            {call && (
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  {call.result === 'YES' ? (
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    </div>
                  ) : call.result === 'NO' ? (
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-red-400" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-purple-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-1">Phone Verification</h3>
                  <p className="text-white/60 text-sm mb-2">
                    {call.result === 'YES' ? 'Employment confirmed via phone' :
                     call.result === 'NO' ? `Phone verification failed: ${call.failureReason}` :
                     'Phone call in progress'}
                  </p>
                  {call.endedAt && (
                    <p className="text-white/40 text-xs mb-2">
                      {format(new Date(call.endedAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  )}
                  {call.transcript && (
                    <div className="mt-3 p-3 bg-zinc-800 rounded-lg">
                      <p className="text-white/60 text-xs mb-2">Transcript:</p>
                      <p className="text-white/80 text-sm whitespace-pre-wrap">{call.transcript}</p>
                    </div>
                  )}
                  {call.recordingUrl && (
                    <a href={call.recordingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm mt-2">
                      <ExternalLink className="w-4 h-4" />
                      Listen to Recording
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Email Verification Step */}
            {emailVerif && (
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  {emailVerif.status === 'YES' ? (
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    </div>
                  ) : emailVerif.status === 'NO' ? (
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-red-400" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-indigo-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-1">Email Verification</h3>
                  <p className="text-white/60 text-sm mb-2">
                    {emailVerif.status === 'YES' ? 'Employer confirmed employment via email' :
                     emailVerif.status === 'NO' ? 'Employer could not confirm employment' :
                     `Email sent to ${emailVerif.employerEmail}, waiting for response`}
                  </p>
                  {emailVerif.respondedAt && (
                    <p className="text-white/40 text-xs">
                      {format(new Date(emailVerif.respondedAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}