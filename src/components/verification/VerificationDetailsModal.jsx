import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Clock, Network, Mail, Phone, FileSearch, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';

export default function VerificationDetailsModal({ verification, onClose }) {
  const [showDebug, setShowDebug] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  if (!verification) return null;

  const statusIcons = {
    not_started: <Clock className="w-4 h-4" />,
    queued: <Clock className="w-4 h-4" />,
    in_progress: <Clock className="w-4 h-4 animate-spin" />,
    action_required: <AlertCircle className="w-4 h-4" />,
    completed: <CheckCircle className="w-4 h-4" />,
    failed: <AlertCircle className="w-4 h-4" />
  };

  const methodIcons = {
    contact_enrichment: <FileSearch className="w-4 h-4" />,
    policy_discovery: <FileSearch className="w-4 h-4" />,
    public_evidence: <FileSearch className="w-4 h-4" />,
    email_request: <Mail className="w-4 h-4" />,
    network: <Network className="w-4 h-4" />,
    phone_call: <Phone className="w-4 h-4" />
  };

  const getStatusColor = (status) => {
    const colors = {
      not_started: 'bg-zinc-700 text-zinc-300',
      queued: 'bg-blue-900/40 text-blue-300',
      in_progress: 'bg-yellow-900/40 text-yellow-300',
      action_required: 'bg-orange-900/40 text-orange-300',
      completed: 'bg-green-900/40 text-green-300',
      failed: 'bg-red-900/40 text-red-300'
    };
    return colors[status] || 'bg-zinc-700 text-zinc-300';
  };

  const getOutcomeColor = (outcome) => {
    const colors = {
      verified: 'bg-green-900/40 text-green-300',
      verified_public_evidence: 'bg-emerald-900/40 text-emerald-300',
      contact_identified: 'bg-cyan-900/40 text-cyan-300',
      policy_identified: 'bg-blue-900/40 text-blue-300',
      network_required: 'bg-purple-900/40 text-purple-300',
      unable_to_verify: 'bg-red-900/40 text-red-300'
    };
    return colors[outcome] || 'bg-zinc-700 text-zinc-300';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-zinc-900 rounded-xl border border-zinc-800 max-w-2xl w-full max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-zinc-800 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">
                {verification.employerName}
              </h2>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(verification.status)}>
                  {statusIcons[verification.status]}
                  <span className="ml-1">{verification.status.replace('_', ' ')}</span>
                </Badge>
                {verification.outcome && (
                  <Badge className={getOutcomeColor(verification.outcome)}>
                    {verification.outcome.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)] space-y-6">
            {/* Stage */}
            {verification.stage && (
              <div>
                <h3 className="text-white/60 text-sm font-medium mb-2">Current Stage</h3>
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="text-white font-medium">{verification.stage.replace('_', ' ')}</p>
                  {verification.stageHistory && verification.stageHistory.length > 1 && (
                    <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                      {verification.stageHistory.map((h, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-white/40">
                          <span>{h.stage.replace('_', ' ')}</span>
                          <span>{new Date(h.timestamp).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Method & Confidence */}
            <div className="space-y-4">
              <div>
                <h3 className="text-white/60 text-sm font-medium mb-2">Verification Method</h3>
                <div className="flex items-center gap-2 text-white">
                  {methodIcons[verification.method]}
                  <span className="font-medium">{verification.method?.replace('_', ' ')}</span>
                  {verification.method === 'phone_call' && (
                    <span className="text-white/40 text-xs">(coming soon)</span>
                  )}
                </div>
              </div>

              {verification.confidence !== undefined && (
                <div>
                  <h3 className="text-white/60 text-sm font-medium mb-2">Confidence Score</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
                        style={{ width: `${(verification.confidence || 0) * 100}%` }}
                      />
                    </div>
                    <span className="text-white font-mono text-sm">
                      {((verification.confidence || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  {verification.isVerified && (
                    <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      High-confidence verification complete
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Next Steps */}
            {verification.nextSteps && verification.nextSteps.length > 0 && (
              <div>
                <h3 className="text-white/60 text-sm font-medium mb-2">Recommended Next Steps</h3>
                <div className="space-y-2">
                  {verification.nextSteps
                    .sort((a, b) => (a.priority || 99) - (b.priority || 99))
                    .map((step, idx) => (
                      <div key={idx} className="bg-zinc-800/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white/40 text-xs">#{idx + 1}</span>
                            <span className="text-white text-sm">{step.label}</span>
                          </div>
                          <Badge variant={step.enabled ? "default" : "outline"} className="text-xs">
                            {step.enabled ? 'Available' : 'Coming soon'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Verified Fields */}
            {verification.verifiedFields && Object.keys(verification.verifiedFields).length > 0 && (
              <div>
                <h3 className="text-white/60 text-sm font-medium mb-2">Verified Information</h3>
                <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
                  {verification.verifiedFields.title && (
                    <div>
                      <span className="text-white/60 text-xs">Title:</span>
                      <p className="text-white">{verification.verifiedFields.title}</p>
                    </div>
                  )}
                  {verification.verifiedFields.dates && (
                    <div>
                      <span className="text-white/60 text-xs">Dates:</span>
                      <p className="text-white">{verification.verifiedFields.dates}</p>
                    </div>
                  )}
                  {verification.verifiedFields.rehireEligibility !== undefined && (
                    <div>
                      <span className="text-white/60 text-xs">Rehire Eligible:</span>
                      <p className="text-white">{verification.verifiedFields.rehireEligibility ? 'Yes' : 'No'}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Proof Artifacts / Evidence Trail */}
            {verification.proofArtifacts && verification.proofArtifacts.length > 0 && (
              <div>
                <h3 className="text-white/60 text-sm font-medium mb-2">Evidence & Audit Trail</h3>
                <div className="space-y-2">
                  {verification.proofArtifacts.map((artifact, idx) => (
                    <div key={idx} className="bg-zinc-800/50 rounded-lg p-3 border-l-2 border-blue-500/30">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <p className="text-white/80 text-sm font-medium">{artifact.label}</p>
                          {artifact.timestamp && (
                            <p className="text-white/30 text-xs mt-0.5">
                              {new Date(artifact.timestamp).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-300">
                          {artifact.type}
                        </Badge>
                      </div>
                      {artifact.value && (
                        <a 
                          href={artifact.value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-xs break-all font-mono bg-black/20 rounded p-2 block hover:bg-black/30 transition-colors"
                        >
                          {artifact.value}
                        </a>
                      )}
                      {artifact.snippet && (
                        <p className="text-white/50 text-xs italic mt-2 border-l-2 border-white/10 pl-2">
                          "{artifact.snippet}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div>
              <h3 className="text-white/60 text-sm font-medium mb-2">Timeline</h3>
              <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Created:</span>
                  <span className="text-white">{new Date(verification.created_date).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Last Updated:</span>
                  <span className="text-white">{new Date(verification.updated_date).toLocaleString()}</span>
                </div>
                {verification.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-white/60">Completed:</span>
                    <span className="text-white">{new Date(verification.completedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {verification.lastError && (
              <div>
                <h3 className="text-red-400 text-sm font-medium mb-2">Error Details</h3>
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-300 text-sm">{verification.lastError}</p>
                  {verification.retryCount > 0 && (
                    <p className="text-red-400/60 text-xs mt-2">Retry count: {verification.retryCount}</p>
                  )}
                </div>
              </div>
            )}

            {/* Debug Toggle - Admin Only */}
            {user?.role === 'admin' && (
              <div className="pt-4 border-t border-zinc-800">
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className="flex items-center gap-2 text-white/40 hover:text-white/60 text-sm transition-colors"
                >
                  <Bug className="w-4 h-4" />
                  <span>{showDebug ? 'Hide' : 'Show'} debug info</span>
                </button>

                {showDebug && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 bg-black/30 rounded-lg p-4 overflow-x-auto"
                  >
                    <pre className="text-white/60 text-xs font-mono">
                      {JSON.stringify(verification, null, 2)}
                    </pre>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-zinc-800">
            <Button
              onClick={onClose}
              className="w-full bg-white hover:bg-gray-100 text-black font-medium"
            >
              Close
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}