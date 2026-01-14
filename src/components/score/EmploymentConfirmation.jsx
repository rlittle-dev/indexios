import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ChevronDown, AlertCircle, Bug, Play, RefreshCw, Eye, CheckCircle, Clock, XCircle, Activity, FileSearch, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import VerificationDetailsModal from '@/components/verification/VerificationDetailsModal';

      export default function EmploymentConfirmation({ phoneNumbers = {}, allCompanies = [], phoneDebug = {}, companies: companiesWithPhone = [], candidateId }) {
        const [isExpanded, setIsExpanded] = useState(false);
        const [showDebug, setShowDebug] = useState(false);
        const [verifications, setVerifications] = useState([]);
        const [isStartingVerification, setIsStartingVerification] = useState(false);
        const [isRefreshing, setIsRefreshing] = useState(false);
        const [selectedVerification, setSelectedVerification] = useState(null);
        const [verificationSummary, setVerificationSummary] = useState(null);

  // Fetch verification status on mount and when candidateId changes
  useEffect(() => {
    if (candidateId) {
      fetchVerificationStatus();
    }
  }, [candidateId]);

  const fetchVerificationStatus = async () => {
    if (!candidateId) return;
    
    try {
      const response = await base44.functions.invoke('getVerificationStatus', { candidateId });
      if (response.data.success) {
        setVerifications(response.data.verifications || []);
        setVerificationSummary(response.data.summary);
      }
    } catch (error) {
      console.error('Error fetching verification status:', error);
    }
  };

  const handleStartVerification = async () => {
    if (!candidateId || companies.length === 0) return;

    setIsStartingVerification(true);
    try {
      const employers = companies.map(c => ({
        name: c.name,
        phone: c.phone?.e164 || c.phone?.display || ''
      }));

      const response = await base44.functions.invoke('startVerification', {
        candidateId,
        employers
      });

      if (response.data.success) {
        setVerifications(response.data.verifications);
        console.log(`✅ Started verification for ${response.data.count} employers`);
      }
    } catch (error) {
      console.error('Error starting verification:', error);
    }
    setIsStartingVerification(false);
  };

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    await fetchVerificationStatus();
    setIsRefreshing(false);
  };

  const getVerificationForEmployer = (employerName) => {
    return verifications.find(v => v.employerName === employerName);
  };

  const getStatusBadge = (status) => {
    const configs = {
      not_started: { icon: <Clock className="w-3 h-3" />, label: 'Not started', color: 'bg-zinc-700 text-zinc-300' },
      queued: { icon: <Clock className="w-3 h-3" />, label: 'Queued', color: 'bg-blue-900/40 text-blue-300' },
      in_progress: { icon: <Clock className="w-3 h-3 animate-spin" />, label: 'In progress', color: 'bg-yellow-900/40 text-yellow-300' },
      action_required: { icon: <AlertCircle className="w-3 h-3" />, label: 'Action required', color: 'bg-orange-900/40 text-orange-300' },
      completed: { icon: <CheckCircle className="w-3 h-3" />, label: 'Completed', color: 'bg-green-900/40 text-green-300' },
      failed: { icon: <XCircle className="w-3 h-3" />, label: 'Failed', color: 'bg-red-900/40 text-red-300' }
    };
    const config = configs[status] || configs.not_started;
    return (
      <Badge className={`${config.color} text-xs flex items-center gap-1`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getOutcomeBadge = (outcome) => {
    if (!outcome) return null;
    const configs = {
      verified: { label: 'Verified', color: 'bg-green-900/40 text-green-300' },
      contact_identified: { label: 'Contact identified', color: 'bg-cyan-900/40 text-cyan-300' },
      policy_identified: { label: 'Policy identified', color: 'bg-blue-900/40 text-blue-300' },
      network_required: { label: 'Network required', color: 'bg-purple-900/40 text-purple-300' },
      unable_to_verify: { label: 'Unable to verify', color: 'bg-red-900/40 text-red-300' }
    };
    const config = configs[outcome];
    if (!config) return null;
    return (
      <Badge className={`${config.color} text-xs`}>
        {config.label}
      </Badge>
    );
  };

  // NEW: Use standardized company objects with phone data
  let companies = [];
  let totalCount = 0;

  if (companiesWithPhone && companiesWithPhone.length > 0) {
    // NEW format: array of {name, phone, phone_debug}
    companies = companiesWithPhone;
    // Count companies that have a valid phone (either e164 or display)
    totalCount = companies.filter(c => c.phone && (c.phone.e164 || c.phone.display)).length;
  } else if (allCompanies && allCompanies.length > 0) {
    // Fallback: Use allCompanies array (company names without phone data yet)
    companies = allCompanies.map(name => ({
      name,
      phone: null,
      phone_debug: phoneDebug?.[name],
    }));
    totalCount = 0;
  } else if (phoneNumbers && typeof phoneNumbers === 'object' && !Array.isArray(phoneNumbers)) {
    // LEGACY format: map of company -> phone string
    const companiesMap = phoneNumbers;
    companies = Object.keys(companiesMap).map(name => ({
      name,
      phone: companiesMap[name] ? { display: companiesMap[name] } : null,
      phone_debug: phoneDebug[name],
    }));
    totalCount = Object.keys(companiesMap).length;
  } else {
    companies = [];
    totalCount = 0;
  }

  console.log('EmploymentConfirmation props:', { 
    companiesWithPhone, 
    allCompanies, 
    phoneNumbers,
    companies,
    companiesLength: companies.length 
  });

  return (
    <>
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
            {verificationSummary && (
              <div className="flex items-center gap-2 ml-2">
                {verificationSummary.verified > 0 && (
                  <span className="text-xs bg-green-500/30 text-green-300 px-2 py-0.5 rounded-full font-medium">
                    {verificationSummary.verified} verified
                  </span>
                )}
                {verificationSummary.action_required > 0 && (
                  <span className="text-xs bg-orange-500/30 text-orange-300 px-2 py-0.5 rounded-full font-medium">
                    {verificationSummary.action_required} action required
                  </span>
                )}
                {verificationSummary.in_progress > 0 && (
                  <span className="text-xs bg-yellow-500/30 text-yellow-300 px-2 py-0.5 rounded-full font-medium">
                    {verificationSummary.in_progress} in progress
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
          {/* Verification Controls */}
          {companies && companies.length > 0 && (
            <div className="flex items-center gap-2 pt-3">
              <Button
                onClick={handleStartVerification}
                disabled={isStartingVerification || verifications.length > 0}
                className="bg-blue-500 hover:bg-blue-400 text-white text-sm"
                size="sm"
              >
                {isStartingVerification ? (
                  <>
                    <Clock className="w-3 h-3 mr-1 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 mr-1" />
                    {verifications.length > 0 ? 'Verification Started' : 'Start Verification'}
                  </>
                )}
              </Button>
              {verifications.length > 0 && (
                <Button
                  onClick={handleRefreshStatus}
                  disabled={isRefreshing}
                  variant="outline"
                  className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10 text-sm"
                  size="sm"
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              )}
            </div>
          )}

          {companies && companies.length > 0 ? (
            <>
              {companies.map((company, index) => {
                // Handle both new {name, phone} and legacy string formats
                const companyName = typeof company === 'string' ? company : (company.name || '');
                const phoneObj = typeof company === 'object' ? company.phone : null;
                const debug = typeof company === 'object' ? company.phone_debug : phoneDebug[companyName];
                const hasPhone = phoneObj && (phoneObj.e164 || phoneObj.display);
                const verification = getVerificationForEmployer(companyName);

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-zinc-800/50 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-white font-medium text-sm">{companyName}</span>
                          {debug && (
                            <button
                              onClick={() => setShowDebug(showDebug === companyName ? false : companyName)}
                              className="text-xs text-white/40 hover:text-white/70 transition-colors"
                            >
                              <Bug className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        
                        {/* Stage & Status */}
                        {verification ? (
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              {verification.stage && (
                                <Badge variant="outline" className="text-xs border-white/20 text-white/60">
                                  <Activity className="w-3 h-3 mr-1" />
                                  {verification.stage.replace('_', ' ')}
                                </Badge>
                              )}
                              {getStatusBadge(verification.status)}
                              {getOutcomeBadge(verification.outcome)}
                            </div>
                            {verification.confidence !== undefined && (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-zinc-700/50 rounded-full h-1.5 max-w-[100px]">
                                  <div 
                                    className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all"
                                    style={{ width: `${verification.confidence * 100}%` }}
                                  />
                                </div>
                                <span className="text-white/40 text-xs">
                                  {(verification.confidence * 100).toFixed(0)}% confidence
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {hasPhone ? (
                              <span className="text-white/40 text-xs">Ready to verify</span>
                            ) : (
                              <div className="flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-yellow-400" />
                                <span className="text-yellow-400/80 text-xs">No contact info</span>
                              </div>
                            )}
                          </div>
                        )}

                        {verification && verification.updated_date && (
                          <p className="text-white/30 text-xs mt-1">
                            Updated {new Date(verification.updated_date).toLocaleString()}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-2">
                        {verification && (
                          <Button
                            onClick={() => setSelectedVerification(verification)}
                            variant="outline"
                            size="sm"
                            className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10 text-xs"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Details
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Next Steps - show if action required */}
                    {verification && verification.status === 'action_required' && verification.nextSteps && verification.nextSteps.length > 0 && (
                      <AnimatePresence>
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 pt-3 border-t border-white/10"
                        >
                          <p className="text-white/60 text-xs font-medium mb-2 flex items-center gap-1">
                            <Send className="w-3 h-3" />
                            Recommended Next Steps:
                          </p>
                          <div className="space-y-2">
                            {verification.nextSteps
                              .sort((a, b) => (a.priority || 99) - (b.priority || 99))
                              .map((step, idx) => (
                                <Button
                                  key={idx}
                                  size="sm"
                                  disabled={!step.enabled}
                                  className={step.enabled 
                                    ? "w-full justify-start bg-blue-600 hover:bg-blue-700 text-white text-xs"
                                    : "w-full justify-start bg-zinc-700/50 text-zinc-400 cursor-not-allowed text-xs"
                                  }
                                >
                                  <span className="mr-2 text-white/40">#{idx + 1}</span>
                                  {step.label}
                                  {!step.enabled && <span className="ml-auto text-[10px]">(Coming soon)</span>}
                                </Button>
                              ))}
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    )}

                    {showDebug === companyName && debug && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 border-t border-white/10 bg-black/30 rounded p-2"
                      >
                        <p className="text-white/80 text-xs font-mono whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                          {JSON.stringify(debug, null, 2)}
                        </p>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
              {verifications.length === 0 && (
                <p className="text-white/60 text-xs italic pt-2">
                  Click "Start Verification" to begin automated employment verification
                </p>
              )}
            </>
          ) : (
            <p className="text-white/60 text-sm py-2">
              No companies found in work experience. Add employment history to extract contact information.
            </p>
          )}
        </div>
      </motion.div>
      </motion.div>

      {/* Verification Details Modal */}
      {selectedVerification && (
        <VerificationDetailsModal
          verification={selectedVerification}
          onClose={() => setSelectedVerification(null)}
        />
      )}
    </>
  );
}