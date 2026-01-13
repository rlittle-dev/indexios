import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Phone } from 'lucide-react';

export default function ConsentSuccess() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center"
      >
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Consent Approved</h1>
        <p className="text-white/60 mb-6">
          Thank you for approving the employment verification request.
        </p>
        <div className="bg-zinc-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 text-left">
            <Phone className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <div>
              <p className="text-white font-medium text-sm mb-1">Next Step</p>
              <p className="text-white/60 text-xs">
                We will now call the employer to verify your employment. You will be notified of the results via email.
              </p>
            </div>
          </div>
        </div>
        <p className="text-white/40 text-xs">
          You can close this window. We'll keep you updated via email.
        </p>
      </motion.div>
    </div>
  );
}