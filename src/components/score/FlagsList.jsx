import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FlagsList({ redFlags = [], greenFlags = [] }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Red Flags */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="bg-zinc-900/80 backdrop-blur-sm rounded-xl p-5 border border-red-500/30"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <h3 className="text-red-400 font-semibold">Red Flags</h3>
          <span className="ml-auto text-xs bg-red-500/30 text-red-300 px-2 py-0.5 rounded-full font-medium">
            {redFlags.length}
          </span>
        </div>
        
        {redFlags.length > 0 ? (
          <ul className="space-y-2">
            {redFlags.map((flag, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="flex items-start gap-2 text-sm text-white/70"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                {flag}
              </motion.li>
            ))}
          </ul>
        ) : (
          <p className="text-white/40 text-sm italic">No red flags detected</p>
        )}
      </motion.div>
      
      {/* Green Flags */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="bg-zinc-900/80 backdrop-blur-sm rounded-xl p-5 border border-emerald-500/30"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-emerald-500/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-emerald-400 font-semibold">Green Flags</h3>
          <span className="ml-auto text-xs bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full font-medium">
            {greenFlags.length}
          </span>
        </div>
        
        {greenFlags.length > 0 ? (
          <ul className="space-y-2">
            {greenFlags.map((flag, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="flex items-start gap-2 text-sm text-white/70"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                {flag}
              </motion.li>
            ))}
          </ul>
        ) : (
          <p className="text-white/40 text-sm italic">No green flags detected</p>
        )}
      </motion.div>
    </div>
  );
}