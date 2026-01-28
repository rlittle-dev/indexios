import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, CheckCircle, AlertTriangle, Upload, FileText, Building2, Loader2, ArrowLeft, ExternalLink, Clock, Search, PhoneCall, Play, Eye, Phone, Mail, Send, ChevronDown, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import OnChainBadge from '@/components/score/OnChainBadge';
import { toast } from 'sonner';

export default function Scan() {
  const [currentView, setCurrentView] = useState('upload');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Verification state
  const [isRunningVerification, setIsRunningVerification] = useState(false);
  const [verificationResults, setVerificationResults] = useState(null);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [callingCompanies, setCallingCompanies] = useState({});
  const [callResults, setCallResults] = useState({});
  const [emailingCompany, setEmailingCompany] = useState(null);
  const [emailResults, setEmailResults] = useState({});
  const [existingAttestations, setExistingAttestations] = useState({});
  const [existingEmailStatus, setExistingEmailStatus] = useState({});
  const [manualAttestations, setManualAttestations] = useState({});

  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      setIsAuthenticated(authenticated);
      if (authenticated) {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } else {
        setUser({ subscription_tier: 'free' });
      }
      setAuthLoading(false);
    };
    checkAuth();
  }, []);

  // Check for existing verifications
  const checkExistingVerifications = async () => {
    if (!selectedCandidate?.unique_candidate_id || !selectedCandidate?.analysis?.company_names?.length) return;

    try {
      const candidates = await base44.entities.UniqueCandidate.filter({ id: selectedCandidate.unique_candidate_id });
      if (candidates?.[0]) {
        const candidate = candidates[0];
        const attestations = {};
        const emailStatuses = {};
        const manualAtts = {};

        if (candidate.employers) {
          for (const employer of candidate.employers) {
            const employerNorm = employer.employer_name?.toLowerCase().trim();
            for (const companyName of selectedCandidate.analysis.company_names) {
              const companyNorm = companyName.toLowerCase().trim();
              if (employerNorm === companyNorm || employerNorm?.includes(companyNorm) || companyNorm?.includes(employerNorm)) {
                if (employer.manual_employer_attestation?.status === 'verified') {
                  manualAtts[companyName] = employer.manual_employer_attestation;
                }
                if (employer.call_verification_status && employer.call_verification_status !== 'not_called' && employer.call_verification_status !== 'pending') {
                  attestations[companyName] = {
                    result: employer.call_verification_status.toUpperCase(),
                    verifiedDate: employer.call_verified_date,
                    attestationUID: employer.phone_attestation_uid || employer.attestation_uid,
                    hasAttestation: !!(employer.phone_attestation_uid || employer.attestation_uid),
                  };
                }
                if (employer.email_verification_status) {
                  emailStatuses[companyName] = {
                    status: employer.email_verification_status,
                    sentDate: employer.email_sent_date,
                    verifiedDate: employer.email_verified_date,
                    attestationUID: employer.email_attestation_uid,
                    hasAttestation: !!employer.email_attestation_uid,
                  };
                }
              }
            }
          }
        }
        setExistingAttestations(attestations);
        setExistingEmailStatus(emailStatuses);
        setManualAttestations(manualAtts);
      }
    } catch (error) {
      console.error('Error checking verifications:', error);
    }
  };

  useEffect(() => {
    if (selectedCandidate?.unique_candidate_id) {
      checkExistingVerifications();
    }
  }, [selectedCandidate?.unique_candidate_id]);

  // Polling for pending verifications
  useEffect(() => {
    const hasPending = Object.values(existingEmailStatus).some(s => s.status === 'pending') || Object.keys(callingCompanies).length > 0;
    if (!hasPending) return;

    const interval = setInterval(() => {
      checkExistingVerifications();
      Object.entries(callingCompanies).forEach(([company, callId]) => {
        if (callId) pollCallStatus(company, callId);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [existingEmailStatus, callingCompanies, selectedCandidate]);

  const pollCallStatus = async (company, callId) => {
    try {
      const response = await base44.functions.invoke('vapiCallStatus', { callId });
      if (response.data?.status === 'ended') {
        setCallResults(prev => ({
          ...prev,
          [company]: {
            result: response.data?.verificationResult || 'INCONCLUSIVE',
            attestationCreated: response.data?.attestationCreated
          }
        }));
        setCallingCompanies(prev => {
          const updated = { ...prev };
          delete updated[company];
          return updated;
        });
        checkExistingVerifications();
      }
    } catch (error) {
      console.error('Poll error:', error);
    }
  };

  const analyzeResume = async (file) => {
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract the following from this resume:
1. Candidate's full name
2. Candidate's email (if present)
3. All company/organization names from work experience
4. Check for any employment timeline overlaps (working at multiple companies during the same dates)

CURRENT DATE: ${new Date().toISOString().split('T')[0]}

Be thorough in extracting ALL employers listed.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            candidate_name: { type: "string" },
            candidate_email: { type: "string" },
            company_names: { type: "array", items: { type: "string" } },
            timeline_overlaps: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  companies: { type: "array", items: { type: "string" } },
                  overlap_period: { type: "string" },
                  severity: { type: "string", enum: ["minor", "significant"] }
                }
              }
            }
          },
          required: ["candidate_name", "company_names", "timeline_overlaps"]
        }
      });

      let candidate;
      if (isAuthenticated) {
        candidate = await base44.entities.Candidate.create({
          name: analysis.candidate_name || 'Unknown',
          email: analysis.candidate_email || '',
          resume_url: file_url,
          status: 'analyzed',
          analysis: {
            company_names: analysis.company_names || [],
            timeline_overlaps: analysis.timeline_overlaps || []
          }
        });
        
        // Link to UniqueCandidate
        try {
          const res = await base44.functions.invoke('linkCandidateScan', { candidateId: candidate.id });
          if (res.data?.uniqueCandidateId) {
            candidate.unique_candidate_id = res.data.uniqueCandidateId;
          }
        } catch (e) {}
      } else {
        candidate = {
          id: 'temp-' + Date.now(),
          name: analysis.candidate_name || 'Unknown',
          email: analysis.candidate_email || '',
          resume_url: file_url,
          status: 'analyzed',
          analysis: {
            company_names: analysis.company_names || [],
            timeline_overlaps: analysis.timeline_overlaps || []
          }
        };
      }

      setIsUploading(false);
      setSelectedCandidate(candidate);
      setCurrentView('result');
      toast.success('Resume processed!', { description: `Found ${analysis.company_names?.length || 0} employers` });

    } catch (error) {
      setIsUploading(false);
      toast.error('Processing failed', { description: 'Please try again' });
    }
  };

  const handleRunVerification = async () => {
    if (!selectedCandidate?.name || !selectedCandidate?.analysis?.company_names?.length) return;

    setIsRunningVerification(true);
    try {
      const response = await base44.functions.invoke('employmentConfirmation', {
        candidateName: selectedCandidate.name,
        employers: selectedCandidate.analysis.company_names.map(name => ({ name })),
        uniqueCandidateId: selectedCandidate.unique_candidate_id
      });

      if (response.data?.success) {
        setVerificationResults(response.data.results);
      }
    } catch (error) {
      toast.error('Verification failed');
    } finally {
      setIsRunningVerification(false);
    }
  };

  const handleCallCompany = async (company, phoneNumber) => {
    setCallingCompanies(prev => ({ ...prev, [company]: null }));
    try {
      const response = await base44.functions.invoke('vapiEmploymentCall', {
        phoneNumber,
        companyName: company,
        candidateName: selectedCandidate.name,
        uniqueCandidateId: selectedCandidate.unique_candidate_id
      });
      if (response.data?.success) {
        setCallingCompanies(prev => ({ ...prev, [company]: response.data.callId }));
      }
    } catch (error) {
      setCallingCompanies(prev => {
        const updated = { ...prev };
        delete updated[company];
        return updated;
      });
    }
  };

  const handleEmailCompany = async (company, hrEmail) => {
    setEmailingCompany(company);
    try {
      const response = await base44.functions.invoke('sendVerificationEmailSG', {
        hrEmail,
        companyName: company,
        candidateName: selectedCandidate.name,
        uniqueCandidateId: selectedCandidate.unique_candidate_id
      });
      if (response.data?.success) {
        setEmailResults(prev => ({ ...prev, [company]: { status: 'pending' } }));
        checkExistingVerifications();
      }
    } catch (error) {
      toast.error('Failed to send email');
    } finally {
      setEmailingCompany(null);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) analyzeResume(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) analyzeResume(e.target.files[0]);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Verify Employment - Indexios</title>
        <meta name="description" content="Upload a resume and verify employment history" />
      </Helmet>

      <section className="relative min-h-screen bg-[#0a0a0a] overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop")', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.15 }}>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/80 via-[#0a0a0a]/70 to-[#0a0a0a]" />
        </div>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-purple-500/[0.04] rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/[0.03] rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 md:py-20">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 mb-6">
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">Employment Verification</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-light tracking-tight leading-[1.1] mb-4">
              <span className="text-white/60">Verify</span>
              <span className="text-white font-medium"> Employment</span>
            </h1>
            <p className="text-lg text-white/50 max-w-xl mx-auto">Upload a resume to verify employment history</p>
          </motion.div>

          <AnimatePresence mode="wait">
            {/* Upload View */}
            {currentView === 'upload' && (
              <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`rounded-2xl border-2 border-dashed transition-all duration-300 ${
                    dragActive ? 'border-purple-400 bg-purple-500/10' : 'border-white/10 bg-black/40 hover:border-white/20'
                  }`}
                >
                  <div className="p-12 text-center">
                    {isUploading ? (
                      <div className="space-y-4">
                        <div className="inline-flex p-4 rounded-2xl bg-purple-500/10">
                          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                        </div>
                        <p className="text-white/70">Processing resume...</p>
                      </div>
                    ) : (
                      <>
                        <div className="inline-flex p-4 rounded-2xl bg-white/5 mb-6">
                          <Upload className="w-8 h-8 text-white/40" />
                        </div>
                        <p className="text-white/70 mb-2">Drag and drop your resume here</p>
                        <p className="text-white/40 text-sm mb-6">or</p>
                        <label htmlFor="resume-upload" className="cursor-pointer">
                          <input 
                            type="file" 
                            id="resume-upload"
                            accept=".pdf" 
                            onChange={handleFileChange} 
                            className="sr-only" 
                          />
                          <span className="inline-flex items-center gap-2 bg-white hover:bg-white/90 text-black font-medium rounded-full px-8 py-2.5 cursor-pointer transition-colors">
                            <FileText className="w-4 h-4" />
                            Select PDF
                          </span>
                        </label>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Result View */}
            {currentView === 'result' && selectedCandidate && (
              <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                <Button variant="ghost" onClick={() => { setCurrentView('upload'); setSelectedCandidate(null); setVerificationResults(null); }} className="text-white/60 hover:text-white hover:bg-white/5 rounded-full">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>

                {/* Candidate Header Card - Styled like Home page */}
                <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Resume Processed</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-white/60" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-medium text-white">{selectedCandidate.name}</h2>
                        {selectedCandidate.email && <p className="text-white/40 text-sm">{selectedCandidate.email}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className="bg-blue-500/20 text-blue-300 border-0">
                            <Building2 className="w-3 h-3 mr-1" />
                            {selectedCandidate.analysis?.company_names?.length || 0} Employers Found
                          </Badge>
                          {selectedCandidate.resume_url && (
                            <a href={selectedCandidate.resume_url} target="_blank" rel="noopener noreferrer" className="text-purple-400/80 hover:text-purple-400 text-xs flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" /> View Resume
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Red Flags Box - Timeline Overlaps */}
                {selectedCandidate.analysis?.timeline_overlaps?.length > 0 && (
                  <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-red-500/30 overflow-hidden">
                    <div className="px-5 py-3 border-b border-red-500/20 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <span className="text-[10px] font-mono text-red-400/80 uppercase tracking-wider">Timeline Issues</span>
                    </div>
                    <div className="p-6 space-y-3">
                      {selectedCandidate.analysis.timeline_overlaps.map((overlap, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10">
                          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-red-300 text-sm font-medium">Employment Overlap</p>
                            <p className="text-white/60 text-xs mt-1">
                              {overlap.companies?.join(' & ')} — {overlap.overlap_period}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Employment Verification Box - Main Feature */}
                <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-purple-500/30 overflow-hidden">
                  <div className="px-5 py-3 border-b border-purple-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                      <span className="text-[10px] font-mono text-purple-400/80 uppercase tracking-wider">Employment Verification</span>
                    </div>
                    <Button
                      onClick={handleRunVerification}
                      disabled={isRunningVerification}
                      size="sm"
                      className="bg-purple-500 hover:bg-purple-400 text-white rounded-full"
                    >
                      {isRunningVerification ? (
                        <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Verifying...</>
                      ) : verificationResults ? (
                        <><CheckCircle className="w-3 h-3 mr-1" /> Complete</>
                      ) : (
                        <><Play className="w-3 h-3 mr-1" /> Run Verification</>
                      )}
                    </Button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    {!verificationResults && (
                      <p className="text-white/50 text-sm">Click "Run Verification" to search for web evidence of employment history</p>
                    )}

                    {selectedCandidate.analysis?.company_names?.map((company, idx) => {
                      const result = verificationResults?.[company];
                      const hasEvidence = result?.sources?.length > 0;
                      const hasPhone = result?.phone?.number;
                      const hasEmail = result?.email?.address;
                      const attestation = existingAttestations[company];
                      const emailStatus = existingEmailStatus[company];
                      const manual = manualAttestations[company];
                      const callResult = callResults[company];
                      const isCalling = callingCompanies[company] !== undefined;

                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className={`p-4 rounded-xl ${
                            manual || attestation?.result === 'YES' || emailStatus?.status === 'yes'
                              ? 'bg-emerald-500/10 border border-emerald-500/20'
                              : result
                                ? hasEvidence ? 'bg-white/[0.02]' : 'bg-white/[0.01] opacity-60'
                                : 'bg-white/[0.02]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                manual || attestation?.result === 'YES' || emailStatus?.status === 'yes'
                                  ? 'bg-emerald-500/20'
                                  : 'bg-white/5'
                              }`}>
                                {manual || attestation?.result === 'YES' || emailStatus?.status === 'yes' ? (
                                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Building2 className="w-4 h-4 text-white/40" />
                                )}
                              </div>
                              <span className="text-white font-medium">{company}</span>
                            </div>

                            {result && (
                              <Badge className={hasEvidence ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-white/40'}>
                                <Search className="w-3 h-3 mr-1" />
                                {result.evidence_count || 0} sources
                              </Badge>
                            )}
                          </div>

                          {/* Verification Status Badges */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {manual && (
                              <Badge className="bg-emerald-900/60 text-emerald-200 border border-emerald-700">
                                <CheckCircle className="w-3 h-3 mr-1" /> Employer Verified
                                {manual.attestation_uid && <OnChainBadge attestationUID={manual.attestation_uid} status="YES" />}
                              </Badge>
                            )}
                            {attestation && (
                              <Badge className={
                                attestation.result === 'YES' ? 'bg-green-900/40 text-green-300' :
                                attestation.result === 'NO' ? 'bg-red-900/40 text-red-300' :
                                'bg-yellow-900/40 text-yellow-300'
                              }>
                                <Phone className="w-3 h-3 mr-1" /> Call: {attestation.result}
                                {attestation.hasAttestation && <OnChainBadge attestationUID={attestation.attestationUID} status={attestation.result} />}
                              </Badge>
                            )}
                            {callResult && !attestation && (
                              <Badge className={
                                callResult.result === 'YES' ? 'bg-green-900/40 text-green-300' :
                                callResult.result === 'NO' ? 'bg-red-900/40 text-red-300' :
                                'bg-yellow-900/40 text-yellow-300'
                              }>
                                <Phone className="w-3 h-3 mr-1" /> {callResult.result}
                              </Badge>
                            )}
                            {emailStatus && emailStatus.status !== 'not_sent' && (
                              <Badge className={
                                emailStatus.status === 'yes' ? 'bg-green-900/40 text-green-300' :
                                emailStatus.status === 'pending' ? 'bg-blue-900/40 text-blue-300' :
                                'bg-yellow-900/40 text-yellow-300'
                              }>
                                <Mail className="w-3 h-3 mr-1" /> {emailStatus.status === 'pending' ? 'Awaiting Response' : `Email: ${emailStatus.status}`}
                                {emailStatus.hasAttestation && <OnChainBadge attestationUID={emailStatus.attestationUID} status={emailStatus.status.toUpperCase()} />}
                              </Badge>
                            )}
                          </div>

                          {/* Evidence View Button */}
                          {hasEvidence && (
                            <Button
                              onClick={() => setSelectedEvidence({ company, result })}
                              variant="ghost"
                              size="sm"
                              className="text-blue-300 hover:text-blue-200 hover:bg-blue-500/10 text-xs mb-3"
                            >
                              <Eye className="w-3 h-3 mr-1" /> View Evidence
                            </Button>
                          )}

                          {/* Action Buttons - Only if no manual attestation */}
                          {!manual && result && (hasPhone || hasEmail) && (
                            <div className="flex flex-wrap gap-2 pt-3 border-t border-white/[0.06]">
                              {hasPhone && !attestation && !callResult && (
                                <Button
                                  onClick={() => handleCallCompany(company, result.phone.number)}
                                  disabled={isCalling || !selectedCandidate.unique_candidate_id}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-500 text-white text-xs rounded-full"
                                >
                                  {isCalling ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Calling...</> : <><PhoneCall className="w-3 h-3 mr-1" /> Call HR</>}
                                </Button>
                              )}
                              {hasEmail && !emailStatus && (
                                <Button
                                  onClick={() => handleEmailCompany(company, result.email.address)}
                                  disabled={emailingCompany === company || !selectedCandidate.unique_candidate_id}
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-full"
                                >
                                  {emailingCompany === company ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Sending...</> : <><Send className="w-3 h-3 mr-1" /> Email HR</>}
                                </Button>
                              )}
                              {hasPhone && (
                                <span className="text-white/40 text-xs flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {result.phone.number}
                                </span>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Sign up prompt for anonymous users */}
                {!isAuthenticated && (
                  <div className="rounded-2xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 p-6 text-center">
                    <p className="text-white/60 text-sm mb-4">Sign up to save your verification history and access more features</p>
                    <Button onClick={() => base44.auth.redirectToLogin(createPageUrl('Scan'))} className="bg-white hover:bg-white/90 text-black font-medium rounded-full">
                      Sign Up Free
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

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
              <h2 className="text-lg font-bold text-white mb-4">{selectedEvidence.company} Evidence</h2>
              <div className="space-y-4">
                {selectedEvidence.result.sources?.map((source, idx) => (
                  <div key={idx} className="bg-zinc-800/50 rounded-lg p-4 border-l-2 border-blue-500/30">
                    <p className="text-white font-medium text-sm mb-2">{source.source}</p>
                    <p className="text-white/70 text-xs mb-2 italic">"{source.text}"</p>
                    {source.url && (
                      <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs break-all">
                        {source.url}
                      </a>
                    )}
                  </div>
                ))}
              </div>
              <Button onClick={() => setSelectedEvidence(null)} className="w-full mt-6 bg-white hover:bg-gray-100 text-black font-medium">
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}