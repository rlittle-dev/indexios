import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const STEP_CONFIG = [
  { key: 'consent_requested', label: 'Consent Requested' },
  { key: 'consent_response', label: 'Consent Response' },
  { key: 'web_scan', label: 'Web Evidence Scan' },
  { key: 'contact_discovery', label: 'Contact Discovery' },
  { key: 'phone_call', label: 'Phone Verification' },
  { key: 'email_outreach', label: 'Email Outreach' },
  { key: 'final_outcome', label: 'Final Outcome' }
];

const StatusIcon = ({ status }) => {
  switch (status) {
    case 'SUCCESS':
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    case 'FAILED':
      return <XCircle className="w-5 h-5 text-red-400" />;
    case 'RUNNING':
      return <Clock className="w-5 h-5 text-blue-400 animate-pulse" />;
    case 'SKIPPED':
      return <AlertCircle className="w-5 h-5 text-yellow-400" />;
    default:
      return <Clock className="w-5 h-5 text-gray-400" />;
  }
};

const StatusBadge = ({ status }) => {
  const colors = {
    SUCCESS: 'bg-green-900/40 text-green-300',
    FAILED: 'bg-red-900/40 text-red-300',
    RUNNING: 'bg-blue-900/40 text-blue-300',
    SKIPPED: 'bg-yellow-900/40 text-yellow-300',
    PENDING: 'bg-gray-900/40 text-gray-300'
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || colors.PENDING}`}>
      {status}
    </span>
  );
};

export default function VerificationTimeline() {
  const urlParams = new URLSearchParams(window.location.search);
  const verificationId = urlParams.get('id');

  const { data: verification, isLoading } = useQuery({
    queryKey: ['verification', verificationId],
    queryFn: async () => {
      const result = await base44.entities.Verification.get(verificationId);
      return result;
    },
    refetchInterval: (data) => {
      // Poll every 2 seconds if not completed
      return data?.status !== 'COMPLETED' ? 2000 : false;
    },
    enabled: !!verificationId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!verification) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Verification not found</p>
          <Link to={createPageUrl('Scan')}>
            <Button>Go Back</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentStep = STEP_CONFIG.find(step => 
    verification.progress?.[step.key]?.status === 'RUNNING'
  ) || STEP_CONFIG[STEP_CONFIG.length - 1];

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 pointer-events-none" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
        <Link to={createPageUrl('Scan')}>
          <Button variant="ghost" className="mb-6 text-white hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Employment Verification</h1>
          <p className="text-white/60">
            {verification.candidate_name} at {verification.company_name}
          </p>
        </motion.div>

        {/* Current Step Highlight */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900/80 backdrop-blur-sm rounded-xl p-6 border border-zinc-800 mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <StatusIcon status={verification.progress?.[currentStep.key]?.status || 'PENDING'} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-1">Current Step: {currentStep.label}</h2>
              <p className="text-white/70">
                {verification.progress?.[currentStep.key]?.message || 'Processing...'}
              </p>
            </div>
            <StatusBadge status={verification.status} />
          </div>
        </motion.div>

        {/* Timeline */}
        <div className="space-y-4">
          {STEP_CONFIG.map((step, index) => {
            const stepData = verification.progress?.[step.key];
            const status = stepData?.status || 'PENDING';
            
            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-zinc-900/60 rounded-lg p-4 border border-zinc-800"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <StatusIcon status={status} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-white font-medium">{step.label}</h3>
                      <StatusBadge status={status} />
                    </div>
                    {stepData?.message && (
                      <p className="text-white/60 text-sm">{stepData.message}</p>
                    )}
                    {stepData?.timestamp && (
                      <p className="text-white/40 text-xs mt-1">
                        {new Date(stepData.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Final Result */}
        {verification.final_result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-2 border-purple-500/60 rounded-xl p-6"
          >
            <h2 className="text-2xl font-bold text-white mb-2">Final Result</h2>
            <div className="flex items-center gap-4">
              <span className="text-4xl font-black text-purple-400">
                {verification.final_result}
              </span>
              <div>
                <p className="text-white/80">Reason: {verification.final_reason}</p>
                {verification.notes && (
                  <p className="text-white/60 text-sm mt-1">{verification.notes}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}