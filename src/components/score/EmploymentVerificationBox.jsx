import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Play, RefreshCw, Eye, CheckCircle, XCircle, Phone, PhoneCall, Loader2, Mail, Link2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';

export default function EmploymentVerificationBox({ companyNames = [], candidateId, candidateName, uniqueCandidateId, userTier = 'free' }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [callingCompanies, setCallingCompanies] = useState({}); // company -> callId
  const [emailingCompany, setEmailingCompany] = useState(null);
  const [callResults, setCallResults] = useState({});
  const [emailResults, setEmailResults] = useState({});
  const [existingAttestations, setExistingAttestations] = useState({}); // company -> attestation data
  const [existingEmailStatus, setExistingEmailStatus] = useState({}); // company -> email status

  const isLocked = userTier !== 'professional' && userTier !== 'enterprise';

  // Check for existing attestations and email status - with live polling
  const checkExistingVerifications = async () => {
    if (!uniqueCandidateId || companyNames.length === 0) return;

    try {
      const candidates = await base44.entities.UniqueCandidate.filter({ id: uniqueCandidateId });
      if (candidates && candidates.length > 0) {
        const candidate = candidates[0];
        const attestations = {};
        const emailStatuses = {};

        if (candidate.employers && Array.isArray(candidate.employers)) {
          for (const employer of candidate.employers) {
            const employerNorm = employer.employer_name?.toLowerCase().trim();

            for (const companyName of companyNames) {
              const companyNorm = companyName.toLowerCase().trim();

              if (employerNorm === companyNorm || employerNorm?.includes(companyNorm) || companyNorm?.includes(employerNorm)) {
                // Check call verification status
                if (employer.call_verification_status && 
                    employer.call_verification_status !== 'not_called' && 
                    employer.call_verification_status !== 'pending') {
                  const attestationUID = employer.attestation_uid || candidate.attestation_uid;
                  attestations[companyName] = {
                    result: employer.call_verification_status.toUpperCase(),
                    verifiedDate: employer.call_verified_date,
                    attestationUID: attestationUID,
                    attestationDate: candidate.attestation_date,
                    hasAttestation: !!attestationUID,
                    type: 'call'
                  };
                }
                
                // Check email verification status
                if (employer.email_verification_status) {
                  emailStatuses[companyName] = {
                    status: employer.email_verification_status,
                    sentDate: employer.email_sent_date,
                    sentTo: employer.email_sent_to,
                    verifiedDate: employer.email_verified_date,
                    responseFrom: employer.email_response_from,
                    hasAttestation: !!(employer.attestation_uid || candidate.attestation_uid)
                  };
                  
                  // If email verification is complete and no call attestation, use email result
                  if (employer.email_verification_status !== 'pending' && 
                      employer.email_verification_status !== 'not_sent' &&
                      !attestations[companyName]) {
                    const attestationUID = employer.attestation_uid || candidate.attestation_uid;
                    attestations[companyName] = {
                      result: employer.email_verification_status.toUpperCase(),
                      verifiedDate: employer.email_verified_date,
                      attestationUID: attestationUID,
                      attestationDate: candidate.attestation_date,
                      hasAttestation: !!attestationUID,
                      type: 'email'
                    };
                  }
                }
              }
            }
          }
        }

        setExistingAttestations(attestations);
        setExistingEmailStatus(emailStatuses);
      }
    } catch (error) {
      console.error('[EmploymentVerification] Error checking verifications:', error);
    }
  };

  // Initial fetch
  useEffect(() => {
    checkExistingVerifications();
  }, [uniqueCandidateId, companyNames]);

  // Live polling every 10 seconds when there are pending verifications
  useEffect(() => {
    const hasPendingEmail = Object.values(existingEmailStatus).some(s => s.status === 'pending') ||
                           Object.values(emailResults).some(r => r.status === 'pending');
    const hasPendingCalls = Object.keys(callingCompanies).length > 0;
    
    if (!hasPendingEmail && !hasPendingCalls) return;

    const pollInterval = setInterval(() => {
      console.log('[EmploymentVerification] Polling for updates...');
      checkExistingVerifications();
      
      // Poll each active call
      Object.entries(callingCompanies).forEach(([company, callId]) => {
        pollCallStatus(company, callId);
      });
    }, 5000); // Poll every 5 seconds for calls

    return () => clearInterval(pollInterval);
  }, [existingEmailStatus, emailResults, callingCompanies, uniqueCandidateId, companyNames]);

  const pollCallStatus = async (company, callId) => {
    try {
      const statusResponse = await base44.functions.invoke('vapiCallStatus', { callId });
      
      if (statusResponse.data?.status === 'ended') {
        setCallResults(prev => ({
          ...prev,
          [company]: {
            result: statusResponse.data?.verificationResult || 'INCONCLUSIVE',
            summary: statusResponse.data?.summary,
            transcript: statusResponse.data?.transcript,
            attestationCreated: statusResponse.data?.attestationCreated
          }
        }));
        // Remove from active calls
        setCallingCompanies(prev => {
          const updated = { ...prev };
          delete updated[company];
          return updated;
        });
        // Refresh verifications to get updated attestation info
        checkExistingVerifications();
      }
    } catch (error) {
      console.error(`[EmploymentVerification] Poll error for ${company}:`, error);
    }
  };

  const handleCallCompany = async (company, phoneNumber, uniqueCandidateId) => {
    // Phone number is optional - backend will fetch from UniqueCandidate if not provided
    setCallingCompanies(prev => ({ ...prev, [company]: null })); // Mark as initiating
    try {
      // Initiate the call - pass phone if available, otherwise backend fetches from UniqueCandidate
      const initResponse = await base44.functions.invoke('vapiEmploymentCall', {
        phoneNumber: phoneNumber || null,
        companyName: company,
        candidateName,
        uniqueCandidateId
      });

      if (!initResponse.data?.success) {
        throw new Error(initResponse.data?.error || 'Failed to initiate call');
      }

      const callId = initResponse.data.callId;
      
      // Store callId for polling
      setCallingCompanies(prev => ({ ...prev, [company]: callId }));

    } catch (error) {
      console.error('Call error:', error);
      setCallResults(prev => ({
        ...prev,
        [company]: { result: 'ERROR', error: error.message }
      }));
      // Remove from active calls
      setCallingCompanies(prev => {
        const updated = { ...prev };
        delete updated[company];
        return updated;
      });
    }
  };

  const handleEmailCompany = async (company, hrEmail, uniqueCandidateId) => {
    if (!hrEmail) {
      alert('No HR email available for this company');
      return;
    }
    setEmailingCompany(company);
    try {
      const response = await base44.functions.invoke('sendVerificationEmail', {
        hrEmail,
        companyName: company,
        candidateName,
        uniqueCandidateId
      });

      if (response.data?.success) {
        setEmailResults(prev => ({
          ...prev,
          [company]: {
            status: 'pending',
            sentTo: hrEmail,
            sentDate: new Date().toISOString()
          }
        }));
      } else {
        throw new Error(response.data?.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Email error:', error);
      setEmailResults(prev => ({
        ...prev,
        [company]: { status: 'error', error: error.message }
      }));
    } finally {
      setEmailingCompany(null);
    }
  };

  const getCallResultBadge = (result) => {
    const styles = {
      YES: 'bg-green-900/40 text-green-300',
      NO: 'bg-red-900/40 text-red-300',
      INCONCLUSIVE: 'bg-yellow-900/40 text-yellow-300',
      REFUSE_TO_DISCLOSE: 'bg-orange-900/40 text-orange-300',
      REFUSED_TO_DISCLOSE: 'bg-orange-900/40 text-orange-300',
      PENDING: 'bg-blue-900/40 text-blue-300',
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
        employers: companyNames.map(name => ({ name })),
        uniqueCandidateId // Pass the ID so backend can update it
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

                    {/* HR Contact Info - Only show if we have contact info */}
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
                                                      <div className="flex flex-col gap-2">
                                                        {/* Check for existing attestation first */}
                                                        {existingAttestations[company] ? (
                                                          <div className="flex flex-col gap-2">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                              {existingAttestations[company].result === 'NO' ? (
                                                                <Badge className="text-xs bg-red-950 text-red-200 border border-red-700">
                                                                  ⚠️ Company Denies Employment
                                                                </Badge>
                                                              ) : existingAttestations[company].result === 'REFUSE_TO_DISCLOSE' || existingAttestations[company].result === 'REFUSED_TO_DISCLOSE' ? (
                                                                <Badge className="text-xs bg-orange-900/60 text-orange-200 border border-orange-700">
                                                                  Company Refuses to Verify or Deny
                                                                </Badge>
                                                              ) : existingAttestations[company].result === 'INCONCLUSIVE' ? (
                                                                <Badge className="text-xs bg-zinc-700 text-zinc-300">
                                                                  Inconclusive Call Result
                                                                </Badge>
                                                              ) : (
                                                                <Badge className={`text-xs ${getCallResultBadge(existingAttestations[company].result)}`}>
                                                                  Call: {existingAttestations[company].result.replace(/_/g, ' ')}
                                                                </Badge>
                                                              )}
                                                              {existingAttestations[company].hasAttestation && (
                                                                <Badge className="text-xs bg-purple-900/40 text-purple-300 flex items-center gap-1">
                                                                  <Link2 className="w-3 h-3" />
                                                                  On-Chain ✓
                                                                </Badge>
                                                              )}
                                                              {existingAttestations[company].result === 'INCONCLUSIVE' && (
                                                                <Button
                                                                  onClick={() => handleCallCompany(company, result.phone.number, uniqueCandidateId)}
                                                                  size="sm"
                                                                  className="h-7 px-3 text-xs bg-green-600 hover:bg-green-500 text-white"
                                                                  disabled={!uniqueCandidateId}
                                                                >
                                                                  <PhoneCall className="w-3 h-3 mr-1" />
                                                                  Retry
                                                                </Button>
                                                              )}
                                                            </div>
                                                            {existingAttestations[company].result === 'NO' && (
                                                              <p className="text-red-400 text-[10px] font-medium">
                                                                Verified fraud: Employer confirmed candidate never worked there
                                                              </p>
                                                            )}
                                                          </div>
                                                        ) : callResults[company] ? (
                                                          <div className="flex flex-col gap-2">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                              {callResults[company].result === 'NO' ? (
                                                                <Badge className="text-xs bg-red-950 text-red-200 border border-red-700">
                                                                  ⚠️ Company Denies Employment
                                                                </Badge>
                                                              ) : callResults[company].result === 'REFUSE_TO_DISCLOSE' ? (
                                                                <Badge className="text-xs bg-orange-900/60 text-orange-200 border border-orange-700">
                                                                  Company Refuses to Verify or Deny
                                                                </Badge>
                                                              ) : callResults[company].result === 'INCONCLUSIVE' ? (
                                                                <Badge className="text-xs bg-zinc-700 text-zinc-300">
                                                                  Inconclusive Call Result
                                                                </Badge>
                                                              ) : (
                                                                <Badge className={`text-xs ${getCallResultBadge(callResults[company].result)}`}>
                                                                  {callResults[company].result.replace(/_/g, ' ')}
                                                                </Badge>
                                                              )}
                                                              {callResults[company].attestationCreated && (
                                                                <Badge className="text-xs bg-purple-900/40 text-purple-300">
                                                                  On-Chain ✓
                                                                </Badge>
                                                              )}
                                                              {callResults[company].result === 'INCONCLUSIVE' && (
                                                                <Button
                                                                  onClick={() => handleCallCompany(company, result.phone.number, uniqueCandidateId)}
                                                                  size="sm"
                                                                  className="h-7 px-3 text-xs bg-green-600 hover:bg-green-500 text-white"
                                                                  disabled={!uniqueCandidateId}
                                                                >
                                                                  <PhoneCall className="w-3 h-3 mr-1" />
                                                                  Retry
                                                                </Button>
                                                              )}
                                                            </div>
                                                            {callResults[company].result === 'NO' && (
                                                              <p className="text-red-400 text-[10px] font-medium">
                                                                Verified fraud: Employer confirmed candidate never worked there
                                                              </p>
                                                            )}
                                                          </div>
                                                        ) : callingCompany === company ? (
                                                          <div className="flex items-center gap-1 text-xs text-blue-300">
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                            Calling...
                                                          </div>
                                                        ) : hasPhone ? (
                                                          <Button
                                                                onClick={() => handleCallCompany(company, result.phone.number, uniqueCandidateId)}
                                                                size="sm"
                                                                className="h-7 px-3 text-xs bg-green-600 hover:bg-green-500 text-white"
                                                                disabled={!uniqueCandidateId}
                                                              >
                                                                <PhoneCall className="w-3 h-3 mr-1" />
                                                                Auto-Verify
                                                              </Button>
                                                        ) : null}
                                                      </div>
                                                    </div>
                                                  )}

                                                  {/* Email Address */}
                                                  {result.email?.address && (
                                                    <div className="flex items-start justify-between gap-2">
                                                      <div className="flex items-start gap-2">
                                                        <Mail className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                                                        <div className="text-xs">
                                                          <p className="text-blue-300 font-medium">
                                                            {result.email.address}
                                                          </p>
                                                          <p className="text-white/60 text-[10px] mt-0.5">
                                                            {result.email.notes || 'HR/Employment verification email'}
                                                          </p>
                                                        </div>
                                                      </div>
                                                      
                                                      {/* Email Verification Button & Status */}
                                                      <div className="flex flex-col gap-2">
                                                        {existingEmailStatus[company]?.status === 'pending' || emailResults[company]?.status === 'pending' ? (
                                                          <Badge className="text-xs bg-blue-900/40 text-blue-300">
                                                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                            Awaiting Response
                                                          </Badge>
                                                        ) : existingEmailStatus[company]?.status && existingEmailStatus[company]?.status !== 'not_sent' ? (
                                                          <div className="flex items-center gap-2 flex-wrap">
                                                            <Badge className={`text-xs ${getCallResultBadge(existingEmailStatus[company].status.toUpperCase())}`}>
                                                              Email: {existingEmailStatus[company].status.replace(/_/g, ' ').toUpperCase()}
                                                            </Badge>
                                                            {existingEmailStatus[company].hasAttestation && (
                                                              <Badge className="text-xs bg-purple-900/40 text-purple-300 flex items-center gap-1">
                                                                <Link2 className="w-3 h-3" />
                                                                On-Chain ✓
                                                              </Badge>
                                                            )}
                                                          </div>
                                                        ) : emailingCompany === company ? (
                                                          <div className="flex items-center gap-1 text-xs text-blue-300">
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                            Sending...
                                                          </div>
                                                        ) : !existingAttestations[company] ? (
                                                          <Button
                                                            onClick={() => handleEmailCompany(company, result.email.address, uniqueCandidateId)}
                                                            size="sm"
                                                            className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-500 text-white"
                                                            disabled={!uniqueCandidateId}
                                                          >
                                                            <Send className="w-3 h-3 mr-1" />
                                                            Email Verify
                                                          </Button>
                                                        ) : null}
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