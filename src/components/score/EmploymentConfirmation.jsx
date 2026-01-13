import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, ChevronDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EmploymentConfirmation({ phoneNumbers = {}, allCompanies = [] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Normalize to object format
  const companiesMap = typeof phoneNumbers === 'object' && !Array.isArray(phoneNumbers) 
    ? phoneNumbers 
    : {};

  // Get all companies mentioned in the resume (fallback if not provided)
  const companies = allCompanies.length > 0 ? allCompanies : Object.keys(companiesMap);
  const totalCount = companies.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.8 }}
      className="bg-zinc-900/80 backdrop-blur-sm rounded-xl border border-blue-500/30"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20">
            <Phone className="w-4 h-4 text-blue-400" />
          </div>
          <h3 className="text-blue-400 font-semibold">Employment Confirmation</h3>
          <span className="ml-auto text-xs bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full font-medium">
            {totalCount}
          </span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-blue-400 transition-transform duration-300 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      <motion.div
        initial={false}
        animate={{
          height: isExpanded ? 'auto' : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="px-5 pb-5 border-t border-blue-500/20 space-y-3">
          {totalCount > 0 ? (
            <>
              {companies.map((company, index) => {
                const phoneNumber = companiesMap[company];
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-zinc-800/50 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-white font-medium text-sm">{company}</span>
                    </div>
                    {phoneNumber ? (
                      <div className="flex items-center justify-between">
                        <span className="text-blue-400 font-mono text-sm">{phoneNumber}</span>
                        <Button
                          disabled
                          className="bg-blue-500/50 hover:bg-blue-500/50 text-white text-xs cursor-not-allowed"
                        >
                          Verify with AI?
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                        <span className="text-white/60 text-xs">No number found - research manually</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
              <p className="text-white/60 text-xs italic pt-2">
                AI call verification coming soon
              </p>
            </>
          ) : (
            <p className="text-white/60 text-sm py-2">
              No companies found in work experience. Add employment history to extract contact information.
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}