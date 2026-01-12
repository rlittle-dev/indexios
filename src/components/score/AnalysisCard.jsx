import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function AnalysisCard({ title, score, icon: Icon, delay = 0 }) {
  const getBarColor = (score) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
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
          <div className="p-2 rounded-lg bg-zinc-800">
            <Icon className="w-4 h-4 text-zinc-400" />
          </div>
          <span className="text-zinc-300 font-medium text-sm">{title}</span>
        </div>
        <span className={cn(
          "text-lg font-bold",
          score >= 80 ? "text-emerald-500" :
          score >= 60 ? "text-amber-500" :
          score >= 40 ? "text-orange-500" : "text-red-500"
        )}>
          {score}%
        </span>
      </div>
      
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
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