import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Smartphone, Laptop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ConcurrentSessionAlert({ deviceType, onDismiss }) {
  const getDeviceIcon = (type) => {
    if (type === 'Mobile') return <Smartphone className="w-6 h-6" />;
    return <Laptop className="w-6 h-6" />;
  };

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
          Concurrent Session Detected
        </h2>

        <p className="text-white/70 text-center mb-6">
          You're already logged in on another device ({deviceType}). Your current session has been logged out to protect your account.
        </p>

        <div className="bg-zinc-800/50 rounded-xl p-4 mb-6 border border-zinc-700/50">
          <p className="text-white/60 text-sm text-center">
            Your plan only allows one device at a time. Upgrade to <span className="font-semibold text-white">Enterprise</span> to access your account from multiple devices simultaneously.
          </p>
        </div>

        <div className="space-y-3">
          <Link to={createPageUrl('Pricing')} className="block">
            <Button className="w-full bg-white hover:bg-gray-100 text-black font-semibold">
              Upgrade to Enterprise
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={onDismiss}
            className="w-full border-white/20 text-white hover:bg-white/10"
          >
            Go Back
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}