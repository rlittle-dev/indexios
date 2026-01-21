import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { CheckCircle, XCircle, HelpCircle, Loader2, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EmailVerificationResponse() {
  const [status, setStatus] = useState('loading'); // loading, success, error, already_processed
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const processVerification = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const responseType = params.get('response');

      if (!token || !responseType) {
        setStatus('error');
        setError('Invalid verification link');
        return;
      }

      try {
        const result = await base44.functions.invoke('processEmailVerification', {
          token,
          response: responseType
        });

        if (result.data?.success) {
          setStatus('success');
          setResponse(responseType);
        } else if (result.data?.already_processed) {
          setStatus('already_processed');
        } else {
          setStatus('error');
          setError(result.data?.error || 'Failed to process verification');
        }
      } catch (err) {
        console.error('Verification error:', err);
        setStatus('error');
        setError('An error occurred while processing the verification');
      }
    };

    processVerification();
  }, []);

  const getResponseIcon = () => {
    switch (response) {
      case 'yes':
        return <CheckCircle className="w-16 h-16 text-green-400" />;
      case 'no':
        return <XCircle className="w-16 h-16 text-red-400" />;
      case 'refuse':
        return <HelpCircle className="w-16 h-16 text-orange-400" />;
      default:
        return <Shield className="w-16 h-16 text-purple-400" />;
    }
  };

  const getResponseMessage = () => {
    switch (response) {
      case 'yes':
        return {
          title: 'Employment Confirmed',
          message: 'Thank you for confirming this employment. An on-chain attestation has been created as a permanent record of this verification.'
        };
      case 'no':
        return {
          title: 'Employment Denied',
          message: 'Thank you for your response. This denial has been recorded as an on-chain attestation to help prevent resume fraud.'
        };
      case 'refuse':
        return {
          title: 'Response Recorded',
          message: 'Your response has been recorded. We understand that some organizations have policies against disclosing employment information.'
        };
      default:
        return {
          title: 'Verification Processed',
          message: 'Your response has been recorded.'
        };
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 md:p-12 max-w-lg w-full text-center"
      >
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-purple-400 animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white mb-2">Processing Verification</h1>
            <p className="text-white/60">Please wait while we record your response...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className="mb-6"
            >
              {getResponseIcon()}
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-4">{getResponseMessage().title}</h1>
            <p className="text-white/70 mb-6">{getResponseMessage().message}</p>
            
            <div className="bg-zinc-800/50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                <Shield className="w-4 h-4" />
                <span>On-Chain Attestation Created</span>
              </div>
              <p className="text-white/50 text-xs mt-2">
                This verification is now permanently recorded on the Base blockchain
              </p>
            </div>

            <p className="text-white/40 text-sm">You can safely close this window.</p>
          </>
        )}

        {status === 'already_processed' && (
          <>
            <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white mb-4">Already Processed</h1>
            <p className="text-white/70 mb-6">
              This verification link has already been used. Each verification can only be processed once.
            </p>
            <p className="text-white/40 text-sm">You can safely close this window.</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white mb-4">Verification Failed</h1>
            <p className="text-white/70 mb-6">{error}</p>
            <p className="text-white/40 text-sm">
              If you believe this is an error, please contact support@indexios.me
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}