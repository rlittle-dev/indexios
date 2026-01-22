import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FlagsList({ redFlags = [], greenFlags = [], isBasic = false }) {
  const [redExpanded, setRedExpanded] = useState(false);
  const [greenExpanded, setGreenExpanded] = useState(false);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Red Flags */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="bg-zinc-900/80 backdrop-blur-sm rounded-xl border border-zinc-800"
      >
        <button
          onClick={() => setRedExpanded(!redExpanded)}
          className="w-full p-5 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-500/20">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <h3 className="text-red-400 font-semibold">Red Flags</h3>
            <span className="ml-auto text-xs bg-red-500/30 text-red-300 px-2 py-0.5 rounded-full font-medium">
              {redFlags.length}
            </span>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-red-400 transition-transform duration-300 ${
              redExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        <motion.div
          initial={false}
          animate={{
            height: redExpanded ? 'auto' : 0,
            opacity: redExpanded ? 1 : 0,
          }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="px-5 pb-5 pt-3 space-y-2">
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
            {isBasic && (
              <p className="text-yellow-400/80 text-xs italic mt-3">
                Limited to basic flags - upgrade for comprehensive fraud detection
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
      
      {/* Green Flags */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="bg-zinc-900/80 backdrop-blur-sm rounded-xl border border-zinc-800"
      >
        <button
          onClick={() => setGreenExpanded(!greenExpanded)}
          className="w-full p-5 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-emerald-400 font-semibold">Green Flags</h3>
            <span className="ml-auto text-xs bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full font-medium">
              {greenFlags.length}
            </span>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-emerald-400 transition-transform duration-300 ${
              greenExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        <motion.div
          initial={false}
          animate={{
            height: greenExpanded ? 'auto' : 0,
            opacity: greenExpanded ? 1 : 0,
          }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="px-5 pb-5 border-t border-emerald-500/20 space-y-2">
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
            {isBasic && (
              <p className="text-yellow-400/80 text-xs italic mt-3">
                Upgrade for advanced verification insights
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}