import React from 'react';
import { motion } from 'framer-motion';

export default function GlassCard({ 
  children, 
  className = '', 
  hover = true, 
  gradient = false,
  delay = 0,
  ...props 
}) {
  const baseClasses = `
    relative overflow-hidden
    bg-gradient-to-br from-white/[0.05] to-white/[0.02]
    backdrop-blur-xl
    border border-white/[0.08]
    rounded-2xl
    ${hover ? 'transition-all duration-300 hover:border-white/[0.15] hover:shadow-2xl hover:shadow-purple-500/5' : ''}
  `;

  const gradientOverlay = gradient && (
    <div className="absolute inset-0 opacity-50 pointer-events-none rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, transparent 50%, rgba(59, 130, 246, 0.05) 100%)'
      }}
    />
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`${baseClasses} ${className}`}
      {...props}
    >
      {gradientOverlay}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}