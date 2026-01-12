import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Lock, Zap } from 'lucide-react';

export default function UpgradePrompt({ scansUsed, scansLimit, onUpgrade, reason = 'scan limit' }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-zinc-900 to-zinc-800 border-2 border-white/20 rounded-2xl p-8 text-center"
    >
      <div className="inline-flex p-4 rounded-2xl bg-white/10 mb-4">
        <Lock className="w-10 h-10 text-white" />
      </div>
      
      <h3 className="text-2xl font-bold text-white mb-2">
        Scan Limit Reached
      </h3>
      
      <p className="text-white/70 mb-1">
        You've used <span className="font-bold text-white">{scansUsed}</span> of <span className="font-bold text-white">{scansLimit}</span> scans this month
      </p>
      
      <p className="text-white/60 text-sm mb-6">
        Upgrade to continue scanning resumes with Indexios
      </p>

      <Button
        onClick={onUpgrade}
        size="lg"
        className="bg-white hover:bg-gray-100 text-black font-semibold px-8"
      >
        <Zap className="w-4 h-4 mr-2" />
        Upgrade Plan
      </Button>
    </motion.div>
  );
}