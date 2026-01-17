import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Play, RefreshCw, Eye, CheckCircle, XCircle, Phone, PhoneCall, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';

export default function EmploymentVerificationBox({ companyNames = [], candidateId, candidateName, uniqueCandidateId, userTier = 'free' }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [callingCompany, setCallingCompany] = useState(null);
  const [callResults, setCallResults] = useState({});

  const isLocked = userTier !== 'professional' && userTier !== 'enterprise';

  const handleCallCompany = async (company, phoneNumber, uniqueCandidateId) => {
    if (!phoneNumber) return;
    
    setCallingCompany(company);
    try {
      // Initiate the call
      const initResponse = await base44.functions.invoke('vapiEmploymentCall', {
        phoneNumber,
        companyName: company,
        candidateName,
        uniqueCandidateId
      });

      if (!initResponse.data?.success) {
        throw new Error(initResponse.data?.error || 'Failed to initiate call');
      }

      const callId = initResponse.data.callId;
      
      // Poll for call status
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max
      
      const pollStatus = async () => {
        attempts++;
        const statusResponse = await base44.functions.invoke('vapiCallStatus', { callId });
        
        if (statusResponse.data?.status === 'ended' || attempts >= maxAttempts) {
          setCallResults(prev => ({
            ...prev,
            [company]: {
              result: statusResponse.data?.verificationResult || 'INCONCLUSIVE',
              summary: statusResponse.data?.summary,
              transcript: statusResponse.data?.transcript,
              attestationCreated: statusResponse.data?.attestationCreated
            }
          }));
          setCallingCompany(null);
        } else {
          // Poll again in 5 seconds
          setTimeout(pollStatus, 5000);
        }
      };

      // Start polling after a short delay
      setTimeout(pollStatus, 3000);

    } catch (error) {
      console.error('Call error:', error);
      setCallResults(prev => ({
        ...prev,
        [company]: { result: 'ERROR', error: error.message }
      }));
      setCallingCompany(null);
    }
  };

  const getCallResultBadge = (result) => {
    const styles = {
      YES: 'bg-green-900/40 text-green-300',
      NO: 'bg-red-900/40 text-red-300',
      INCONCLUSIVE: 'bg-yellow-900/40 text-yellow-300',
      REFUSE_TO_DISCLOSE: 'bg-orange-900/40 text-orange-300',
      ERROR: 'bg-red-900/40 text-red-300'
    };
    return styles[result] || 'bg-zinc-700 text-white/70';
  };

  const handleRunVerification = async () => {
    if (isLocked) {
      alert('Employment Verification is available for Professional and Enterprise plans only. Please upgrade to access this feature.');
      return;
    }

    if (!candidateName || companyNames.length === 0) return;

    setIsRunning(true);
    try {
      const response = await base44.functions.invoke('employmentConfirmation', {
        candidateName,
        employers: companyNames.map(name => ({ name }))
      });

      if (response.data?.success) {
        setResults(response.data.results);
        console.log('✅ Verification complete:', response.data.summary);
      } else if (response.data?.limit_reached) {
        alert(response.data.error);
      } else {
        console.error('Verification failed:', response.data);
      }
    } catch (error) {
      if (error.response?.status === 429) {
        alert(error.response.data?.error || 'Monthly verification limit reached');
      } else {
        console.error('Verification error:', error);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status) => {
    return status === 'verified' 
      ? <CheckCircle className="w-4 h-4 text-green-400" />
      : <XCircle className="w-4 h-4 text-red-400" />;
  };

  const getStatusColor = (status) => {
    return status === 'verified'
      ? 'bg-green-900/40 text-green-300'
      : 'bg-red-900/40 text-red-300';
  };

  if (!companyNames || companyNames.length === 0) {
    return null;
  }

  const verifiedCount = results
    ? Object.values(results).filter(r => r.status === 'verified').length
    : 0;

  const hasEvidence = results
    ? Object.values(results).some(r => r.has_evidence)
    : false;

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
            <CheckCircle className="w-4 h-4 text-blue-400" />
          </div>
          <h3 className="text-blue-400 font-semibold">Employment Verification</h3>
          {results && (
            <>
              {verifiedCount > 0 && (
                <span className="text-xs bg-green-500/30 text-green-300 px-2 py-0.5 rounded-full font-medium ml-2">
                  {verifiedCount} verified
                </span>
              )}
              {!hasEvidence && (
                <span className="text-xs bg-red-500/30 text-red-300 px-2 py-0.5 rounded-full font-medium ml-2">
                  No evidence found
                </span>
              )}
            </>
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
          {/* Locked State for Free/Starter */}
          {isLocked && (
            <div className="pt-3 pb-2">
              <div className="bg-purple-900/40 border border-purple-500/30 rounded-lg p-4 text-center">
                <p className="text-purple-300 text-sm font-medium mb-2">
                  🔒 Employment Verification is a Professional+ feature
                </p>
                <p className="text-white/60 text-xs mb-3">
                  Verify employment history using web evidence and public records
                </p>
                <Button
                  size="sm"
                  className="bg-white hover:bg-gray-100 text-black font-medium"
                  onClick={() => window.location.href = '/Pricing'}
                >
                  Upgrade to Professional
                </Button>
              </div>
            </div>
          )}

          {/* Run Button */}
          {!isLocked && (
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
                  Fetching evidence...
                </>
              ) : results ? (
                <>
                  <Play className="w-3 h-3 mr-1" />
                  {hasEvidence ? 'Verification Complete' : 'Evidence Not Found'}
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 mr-1" />
                  Run Verification
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
            )}

            {!isLocked && !results && companyNames.length > 0 && (
            <p className="text-white/60 text-xs italic pt-3 border-t border-blue-500/20">
              Click "Run Verification" to fetch web evidence for employment history
            </p>
          )}

          {/* Results Table */}
          {!isLocked && results && (
            <div className="space-y-2">
              {companyNames.map((company, idx) => {
                const result = results[company] || {};
                const status = result.status || 'not_found';
                const hasEvidence = result.sources && result.sources.length > 0;
                const hasPhone = result.phone?.number;

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-zinc-800/50 rounded-lg p-3 space-y-2"
                  >
                    <div className="grid grid-cols-4 gap-2 items-center text-sm">
                      {/* Employer */}
                      <div className="text-white font-medium truncate">{company}</div>

                      {/* Status */}
                      <div className="flex items-center gap-1">
                        {getStatusIcon(status)}
                        <Badge className={`text-xs ${getStatusColor(status)}`}>
                          {status === 'verified' ? 'Verified' : 'Not found'}
                        </Badge>
                      </div>

                      {/* Evidence Count */}
                      <div className="text-white/70 text-xs">
                        {result.evidence_count || 0} source{(result.evidence_count || 0) !== 1 ? 's' : ''}
                      </div>

                      {/* Evidence Button */}
                      {hasEvidence && (
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
                    </div>

                    {/* HR Contact Info */}
                                              {(hasPhone || result.email?.address) && (
                                                <div className="pt-2 border-t border-zinc-700/50 space-y-2">
                                                  {/* Phone Number */}
                                                  {hasPhone && (
                                                    <div className="flex items-start justify-between gap-2">
                                                      <div className="flex items-start gap-2">
                                                        <Phone className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                                                        <div className="text-xs">
                                                          <p className="text-green-300 font-medium">{result.phone.number}</p>
                                                          <p className="text-white/60 text-[10px] mt-0.5">
                                                            {result.phone.notes || 'Employment verification contact'}
                                                          </p>
                                                        </div>
                                                      </div>

                                                      {/* Call Button & Result */}
                                                      <div className="flex items-center gap-2">
                                                        {callResults[company] ? (
                                                          <div className="flex items-center gap-2">
                                                              <Badge className={`text-xs ${getCallResultBadge(callResults[company].result)}`}>
                                                                {callResults[company].result.replace(/_/g, ' ')}
                                                              </Badge>
                                                              {callResults[company].attestationCreated && (
                                                                <Badge className="text-xs bg-purple-900/40 text-purple-300">
                                                                  On-Chain ✓
                                                                </Badge>
                                                              )}
                                                            </div>
                                                        ) : callingCompany === company ? (
                                                          <div className="flex items-center gap-1 text-xs text-blue-300">
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                            Calling...
                                                          </div>
                                                        ) : (
                                                          <Button
                                                                onClick={() => handleCallCompany(company, result.phone.number, uniqueCandidateId)}
                                                                size="sm"
                                                                className="h-7 px-3 text-xs bg-green-600 hover:bg-green-500 text-white"
                                                                disabled={!uniqueCandidateId}
                                                              >
                                                                <PhoneCall className="w-3 h-3 mr-1" />
                                                                Auto-Verify Call
                                                              </Button>
                                                        )}
                                                      </div>
                                                    </div>
                                                  )}

                                                  {/* Email Address */}
                                                  {result.email?.address && (
                                                    <div className="flex items-start justify-between gap-2">
                                                      <div className="flex items-start gap-2">
                                                        <Mail className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                                                        <div className="text-xs">
                                                          <a 
                                                            href={`mailto:${result.email.address}`}
                                                            className="text-blue-300 font-medium hover:text-blue-200 underline"
                                                          >
                                                            {result.email.address}
                                                          </a>
                                                          <p className="text-white/60 text-[10px] mt-0.5">
                                                            {result.email.notes || 'HR/Employment verification email'}
                                                          </p>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {!results && companyNames.length > 0 && (
            <p className="text-white/60 text-xs italic pt-2">
              Verifies employment using web evidence and public records
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
                {selectedEvidence.result.sources?.map((source, idx) => (
                  <div key={idx} className="bg-zinc-800/50 rounded-lg p-4 border-l-2 border-blue-500/30">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-white font-medium text-sm">{source.source}</p>
                      <Badge variant="outline" className="text-xs">
                        {source.type === 'rocketreach_summary' ? 'RocketReach' : 'Web'}
                      </Badge>
                    </div>

                    <p className="text-white/70 text-xs mb-2 italic">
                      "{source.text}"
                    </p>

                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-xs break-all"
                      >
                        {source.url}
                      </a>
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