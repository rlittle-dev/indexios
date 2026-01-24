import React from 'react';
import { motion } from 'framer-motion';

export default function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  color = 'purple',
  delay = 0 
}) {
  const colors = {
    purple: {
      bg: 'from-purple-500/20 to-purple-600/10',
      border: 'group-hover:border-purple-500/30',
      icon: 'text-purple-400',
      glow: 'group-hover:shadow-purple-500/10'
    },
    green: {
      bg: 'from-emerald-500/20 to-emerald-600/10',
      border: 'group-hover:border-emerald-500/30',
      icon: 'text-emerald-400',
      glow: 'group-hover:shadow-emerald-500/10'
    },
    blue: {
      bg: 'from-blue-500/20 to-blue-600/10',
      border: 'group-hover:border-blue-500/30',
      icon: 'text-blue-400',
      glow: 'group-hover:shadow-blue-500/10'
    },
    orange: {
      bg: 'from-orange-500/20 to-orange-600/10',
      border: 'group-hover:border-orange-500/30',
      icon: 'text-orange-400',
      glow: 'group-hover:shadow-orange-500/10'
    }
  };

  const c = colors[color] || colors.purple;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`group relative p-6 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.06] hover:border-white/[0.1] transition-all duration-500 hover:shadow-2xl ${c.glow}`}
    >
      {/* Subtle gradient glow on hover */}
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${c.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      
      <div className="relative z-10">
        <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${c.bg} mb-4`}>
          <Icon className={`w-6 h-6 ${c.icon}`} />
        </div>
        
        <h3 className="text-lg font-semibold text-white mb-2 tracking-tight">{title}</h3>
        <p className="text-white/50 text-sm leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}