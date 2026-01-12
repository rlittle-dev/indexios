import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function ScoreCircle({ score, size = 180, strokeWidth = 12 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  
  const getScoreColor = (score) => {
    if (score >= 80) return { stroke: '#10b981', bg: 'text-emerald-400', glow: 'shadow-emerald-400/30' };
    if (score >= 60) return { stroke: '#facc15', bg: 'text-yellow-400', glow: 'shadow-yellow-400/30' };
    if (score >= 40) return { stroke: '#f97316', bg: 'text-orange-400', glow: 'shadow-orange-400/30' };
    return { stroke: '#ef4444', bg: 'text-red-400', glow: 'shadow-red-400/30' };
  };
  
  const colors = getScoreColor(score);
  
  const getScoreLabel = (score) => {
    if (score >= 80) return 'Highly Legitimate';
    if (score >= 60) return 'Moderately Legitimate';
    if (score >= 40) return 'Questionable';
    return 'High Risk';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="relative flex flex-col items-center"
    >
      <div className={cn("relative", `shadow-2xl ${colors.glow} rounded-full`)}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#27272a"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className={cn("text-5xl font-bold", colors.bg)}
          >
            {score}
          </motion.span>
          <span className="text-white/40 text-sm font-medium">%</span>
        </div>
      </div>
      
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className={cn("mt-4 font-semibold text-lg", colors.bg)}
      >
        {getScoreLabel(score)}
      </motion.p>
    </motion.div>
  );
}