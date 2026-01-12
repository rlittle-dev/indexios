import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function AnalysisCard({ title, score, icon: Icon, delay = 0 }) {
  const getBarColor = (score) => {
    if (score >= 80) return 'bg-gradient-to-r from-emerald-500 to-emerald-400';
    if (score >= 60) return 'bg-gradient-to-r from-yellow-500 to-yellow-400';
    if (score >= 40) return 'bg-gradient-to-r from-orange-500 to-orange-400';
    return 'bg-gradient-to-r from-red-500 to-red-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-zinc-900/80 backdrop-blur-sm rounded-xl p-5 border border-zinc-800 hover:border-zinc-700 transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/5">
            <Icon className="w-4 h-4 text-white/60" />
          </div>
          <span className="text-white font-medium text-sm">{title}</span>
        </div>
        <span className={cn(
          "text-lg font-bold",
          score >= 80 ? "text-emerald-400" :
          score >= 60 ? "text-yellow-400" :
          score >= 40 ? "text-orange-400" : "text-red-400"
        )}>
          {score}%
        </span>
      </div>
      
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, delay: delay + 0.2, ease: "easeOut" }}
          className={cn("h-full rounded-full", getBarColor(score))}
        />
      </div>
    </motion.div>
  );
}