import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VerificationConsent() {
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const loadVerification = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const id = urlParams.get('id');
      const action = urlParams.get('action');

      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const data = await base44.entities.Verification.get(id);
        setVerification(data);

        // Auto-execute action if provided in URL
        if (action && ['approve', 'reject'].includes(action)) {
          await handleAction(action, id);
        }
      } catch (error) {
        console.error('Error loading verification:', error);
      }
      setLoading(false);
    };

    loadVerification();
  }, []);

  const handleAction = async (action, verificationId = verification?.id) => {
    setProcessing(true);

    try {
      const response = await base44.functions.invoke('handleConsent', {
        verificationId,
        action
      });

      setResult({
        success: true,
        action,
        message: response.data.message
      });
    } catch (error) {
      console.error('Error handling consent:', error);
      setResult({
        success: false,
        message: 'Failed to process your response. Please try again.'
      });
    }

    setProcessing(false);
  };

  if (loading) {
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
          <Shield className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <p className="text-white">Verification not found</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-zinc-900/80 rounded-2xl p-8 border border-zinc-800 text-center"
        >
          {result.action === 'approve' ? (
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          ) : (
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          )}
          <h2 className="text-2xl font-bold text-white mb-2">
            {result.action === 'approve' ? 'Consent Approved' : 'Consent Rejected'}
          </h2>
          <p className="text-white/70">{result.message}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full bg-zinc-900/80 rounded-2xl p-8 border border-zinc-800"
      >
        <div className="text-center mb-8">
          <Shield className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Employment Verification Request</h1>
          <p className="text-white/60">Please review and respond to this verification request</p>
        </div>

        <div className="bg-zinc-800/50 rounded-xl p-6 mb-8">
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-white/60">Candidate:</span>
              <span className="text-white font-medium ml-2">{verification.candidate_name}</span>
            </div>
            <div>
              <span className="text-white/60">Company:</span>
              <span className="text-white font-medium ml-2">{verification.company_name}</span>
            </div>
            {verification.job_title && (
              <div>
                <span className="text-white/60">Position:</span>
                <span className="text-white font-medium ml-2">{verification.job_title}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6 mb-8">
          <h3 className="text-white font-semibold mb-3">This verification will include:</h3>
          <ul className="space-y-2 text-white/80 text-sm">
            <li>• Web-based public record search</li>
            <li>• Phone call to company HR (if available)</li>
            <li>• Email to company HR (as fallback)</li>
          </ul>
          <p className="text-white/60 text-xs mt-4">
            If you reject, no contact discovery or outreach will be performed.
          </p>
        </div>

        <div className="flex gap-4">
          <Button
            onClick={() => handleAction('reject')}
            disabled={processing}
            variant="outline"
            className="flex-1 border-red-500/30 text-red-300 hover:bg-red-900/20"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject
          </Button>
          <Button
            onClick={() => handleAction('approve')}
            disabled={processing}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {processing ? 'Processing...' : 'Approve'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}