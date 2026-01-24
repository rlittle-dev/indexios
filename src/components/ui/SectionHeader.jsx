import React from 'react';
import { motion } from 'framer-motion';

export default function SectionHeader({ 
  badge, 
  title, 
  subtitle, 
  centered = true,
  className = '' 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${centered ? 'text-center' : ''} ${className}`}
    >
      {badge && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 mb-6"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span className="text-purple-300/90 text-sm font-medium tracking-wide">{badge}</span>
        </motion.div>
      )}
      
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
        <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
          {title}
        </span>
      </h1>
      
      {subtitle && (
        <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed font-light">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}