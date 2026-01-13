import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

export default function EmployerVerified() {
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
        <h1 className="text-2xl font-bold text-white mb-2">Thank You!</h1>
        <p className="text-white/60 mb-6">
          You have confirmed the employment verification. Your response has been recorded.
        </p>
        <p className="text-white/40 text-xs">
          You can safely close this window.
        </p>
      </motion.div>
    </div>
  );
}