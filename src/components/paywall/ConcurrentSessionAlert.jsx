import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Smartphone, Laptop } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ConcurrentSessionAlert({ deviceType, onDismiss }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-zinc-900 border border-red-500/30 rounded-2xl p-8 max-w-md w-full"
      >
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white text-center mb-2">
          Session Ended
        </h2>

        <p className="text-white/70 text-center mb-6">
          You've been logged out because you're now accessing your account from a different device ({deviceType}). You can only have one active session at a time.
        </p>

        <Button
          onClick={onDismiss}
          className="w-full bg-white hover:bg-gray-100 text-black font-semibold"
        >
          Go Back to Home
        </Button>
      </motion.div>
    </motion.div>
  );
}