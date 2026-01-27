import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export default function AnalysisCard({ title, score, details, icon: Icon, delay = 0, isBasic = false, subtitle }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const getBarColor = (score) => {
    if (score >= 80) return 'bg-gradient-to-r from-emerald-500 to-emerald-400';
    if (score >= 60) return 'bg-gradient-to-r from-yellow-500 to-yellow-400';
    if (score >= 40) return 'bg-gradient-to-r from-orange-500 to-orange-400';
    return 'bg-gradient-to-r from-red-500 to-red-400';
  };

  const getBorderColor = (score) => {
    if (score >= 80) return 'border-emerald-500/30';
    if (score >= 60) return 'border-yellow-500/30';
    if (score >= 40) return 'border-orange-500/30';
    return 'border-red-500/30';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`bg-zinc-900/80 backdrop-blur-sm rounded-xl p-5 border ${getBorderColor(score)} transition-colors flex flex-col`}
    >
      <button
        onClick={(e) => {
          e.preventDefault();
          setIsExpanded(!isExpanded);
        }}
        className="w-full text-left cursor-pointer hover:bg-white/5 rounded-lg -m-1 p-1 transition-colors"
        type="button"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/5">
              <Icon className="w-4 h-4 text-white/60" />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-medium text-sm">{title}</span>
              {subtitle && <span className="text-white/40 text-xs">{subtitle}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-lg font-bold",
              score >= 80 ? "text-emerald-400" :
              score >= 60 ? "text-yellow-400" :
              score >= 40 ? "text-orange-400" : "text-red-400"
            )}>
              {score}%
            </span>
            {details && (
              <ChevronDown className={cn(
                "w-4 h-4 text-white/60 transition-transform",
                isExpanded && "rotate-180"
              )} />
            )}
          </div>
        </div>
        
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.8, delay: delay + 0.2, ease: "easeOut" }}
            className={cn("h-full rounded-full", getBarColor(score))}
          />
        </div>
      </button>

      <AnimatePresence mode="wait">
        {isExpanded && details && (
          <motion.div
            key={`${title}-expanded`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="text-white/70 text-sm mt-4 leading-relaxed">
              {details}
            </p>
            {isBasic && (
              <p className="text-yellow-400 text-xs mt-2 italic">
                💎 Upgrade for detailed analysis and insights
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}