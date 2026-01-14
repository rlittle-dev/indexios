import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ChevronDown, Play, RefreshCw, Eye, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';

export default function EmploymentVerificationBox({ companyNames = [], candidateId, candidateName }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  const handleRunVerification = async () => {
    if (!candidateName || companyNames.length === 0) return;

    setIsRunning(true);
    try {
      const response = await base44.functions.invoke('employmentConfirmation', {
        candidateName,
        unconfirmedEmployers: companyNames.map(name => ({ name, jobTitle: '' }))
      });

      if (response.data.success) {
        setResults(response.data.results);
        console.log('✅ Verification complete:', response.data.summary);
      }
    } catch (error) {
      console.error('Verification error:', error);
    }
    setIsRunning(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'partial':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'not_found':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-900/40 text-green-300';
      case 'partial':
        return 'bg-yellow-900/40 text-yellow-300';
      case 'not_found':
        return 'bg-red-900/40 text-red-300';
      default:
        return 'bg-zinc-700 text-zinc-300';
    }
  };

  const getSourceLabel = (source) => {
    switch (source) {
      case 'rocketreach':
        return 'RocketReach';
      case 'web':
        return 'Web Evidence';
      case 'none':
        return 'Not found';
      default:
        return 'Unknown';
    }
  };

  if (!companyNames || companyNames.length === 0) {
    return null;
  }

  const confirmedCount = results
    ? Object.values(results).filter(r => r.status === 'confirmed').length
    : 0;
  const partialCount = results
    ? Object.values(results).filter(r => r.status === 'partial').length
    : 0;

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
          <h3 className="text-blue-400 font-semibold">Employment Verification</h3>
          {results && (
            <div className="flex items-center gap-2 ml-2">
              {confirmedCount > 0 && (
                <span className="text-xs bg-green-500/30 text-green-300 px-2 py-0.5 rounded-full font-medium">
                  {confirmedCount} confirmed
                </span>
              )}
              {partialCount > 0 && (
                <span className="text-xs bg-yellow-500/30 text-yellow-300 px-2 py-0.5 rounded-full font-medium">
                  {partialCount} partial
                </span>
              )}
            </div>
          )}
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
        <div className="px-5 pb-5 border-t border-blue-500/20 space-y-4">
          {/* Run Button */}
          <div className="flex items-center gap-2 pt-3">
            <Button
              onClick={handleRunVerification}
              disabled={isRunning || results !== null}
              className="bg-blue-500 hover:bg-blue-400 text-white text-sm"
              size="sm"
            >
              {isRunning ? (
                <>
                  <Play className="w-3 h-3 mr-1 animate-pulse" />
                  Verifying...
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 mr-1" />
                  {results ? 'Verification Complete' : 'Run Verification'}
                </>
              )}
            </Button>
            {results && (
              <Button
                onClick={() => setResults(null)}
                variant="outline"
                className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10 text-sm"
                size="sm"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            )}
          </div>

          {/* Results Table */}
          {results && (
            <div className="space-y-2">
              {companyNames.map((company, idx) => {
                const result = results[company] || {};
                const status = result.status || 'not_found';

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-zinc-800/50 rounded-lg p-3 grid grid-cols-5 gap-2 items-center text-sm"
                  >
                    {/* Employer */}
                    <div className="text-white font-medium truncate">{company}</div>

                    {/* Status */}
                    <div className="flex items-center gap-1">
                      {getStatusIcon(result.status || status)}
                      <Badge className={`text-xs ${getStatusColor(result.status || status)}`}>
                        {result.status || status}
                      </Badge>
                    </div>

                    {/* Confidence */}
                    <div className="text-white/70 text-xs font-medium">
                      {result.confidence || 0}%
                    </div>

                    {/* Source */}
                    <div className="text-white/60 text-xs">
                      {getSourceLabel(result.source)}
                    </div>

                    {/* Evidence Button */}
                    {result.artifacts && result.artifacts.length > 0 && (
                      <Button
                        onClick={() => setSelectedEvidence({ company, result })}
                        variant="ghost"
                        size="sm"
                        className="text-blue-300 hover:text-blue-200 hover:bg-blue-500/10 text-xs h-8"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {!results && companyNames.length > 0 && (
            <p className="text-white/60 text-xs italic pt-2">
              Click "Run Verification" to verify employment claims
            </p>
          )}
        </div>
      </motion.div>

      {/* Evidence Drawer */}
      <AnimatePresence>
        {selectedEvidence && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-end"
            onClick={() => setSelectedEvidence(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-zinc-900 w-full max-h-[70vh] overflow-y-auto rounded-t-xl border-t border-zinc-800 p-6"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold text-white mb-4">
                {selectedEvidence.company} Evidence
              </h2>

              <div className="space-y-4">
                {selectedEvidence.result.artifacts?.map((artifact, idx) => (
                  <div key={idx} className="bg-zinc-800/50 rounded-lg p-4 border-l-2 border-blue-500/30">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-white font-medium text-sm">{artifact.label}</p>
                      <Badge variant="outline" className="text-xs">
                        {artifact.type}
                      </Badge>
                    </div>

                    {artifact.snippet && (
                      <p className="text-white/70 text-xs mb-2 italic">
                        "{artifact.snippet}"
                      </p>
                    )}

                    {artifact.value && (
                      <a
                        href={artifact.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-xs break-all"
                      >
                        {artifact.value}
                      </a>
                    )}

                    {artifact.matchedFields && Object.keys(artifact.matchedFields).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/10 text-xs text-white/60">
                        <p className="font-medium mb-1">Matched fields:</p>
                        {Object.entries(artifact.matchedFields).map(([key, val]) => (
                          <p key={key}>
                            {key}: <span className="text-white/80">{val}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Button
                onClick={() => setSelectedEvidence(null)}
                className="w-full mt-6 bg-white hover:bg-gray-100 text-black font-medium"
              >
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}