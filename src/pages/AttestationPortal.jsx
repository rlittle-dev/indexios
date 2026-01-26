import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Lock, Building2, Search, Mail, CheckCircle, Loader2, Shield, ExternalLink, UserPlus, Clock, XCircle, Send, Upload, FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AddEmployeeModal from '@/components/attestation/AddEmployeeModal';
import GradientBackground from '@/components/ui/GradientBackground';
import GlassCard from '@/components/ui/GlassCard';
import SectionHeader from '@/components/ui/SectionHeader';

export default function AttestationPortal() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companySearch, setCompanySearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [emailOptions, setEmailOptions] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [verified, setVerified] = useState(false);
  const [verifiedWorkplace, setVerifiedWorkplace] = useState(null);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [attestedEmployees, setAttestedEmployees] = useState([]);
  const [pendingVerification, setPendingVerification] = useState(null);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationProcessing, setVerificationProcessing] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [discoveredHREmail, setDiscoveredHREmail] = useState(null);
  const [showAltVerification, setShowAltVerification] = useState(false);
  const [altVerificationMethod, setAltVerificationMethod] = useState(null);
  const [workEmail, setWorkEmail] = useState('');
  const [uploadedDoc, setUploadedDoc] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [hrSearchFailed, setHrSearchFailed] = useState(false);
  const [companyOptions, setCompanyOptions] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          const currentUser = await base44.auth.me();
          setUser(currentUser);
          // Check if user already has a verified workplace
          if (currentUser.verified_workplace) {
            setVerified(true);
            setVerifiedWorkplace(currentUser.verified_workplace);
            // Fetch employees attested by this company
            fetchAttestedEmployees(currentUser.verified_workplace.company);
          } else if (currentUser.pending_workplace_verification?.status === 'pending') {
            setPendingVerification(currentUser.pending_workplace_verification);
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
      setLoading(false);
    };
    fetchUser();

    // Check for verification token in URL (from email link)
    const urlParams = new URLSearchParams(window.location.search);
    const verifyToken = urlParams.get('verify_token');
    const action = urlParams.get('action');
    
    if (verifyToken && action) {
      processVerificationFromUrl(verifyToken, action);
    }
  }, []);

  const processVerificationFromUrl = async (token, action) => {
    setVerificationProcessing(true);
    try {
      const response = await base44.functions.invoke('processWorkplaceVerification', { token, action });
      
      if (response.data?.success) {
        setVerificationResult({
          success: true,
          action: response.data.action,
          company: response.data.company,
          userName: response.data.userName
        });
        
        // If approved and this is the user's own verification, refresh their data
        if (response.data.action === 'approved') {
          const currentUser = await base44.auth.me();
          if (currentUser.verified_workplace) {
            setVerified(true);
            setVerifiedWorkplace(currentUser.verified_workplace);
            setPendingVerification(null);
            fetchAttestedEmployees(currentUser.verified_workplace.company);
          }
        }
      } else {
        setVerificationResult({
          success: false,
          error: response.data?.error || 'Verification failed'
        });
      }
    } catch (error) {
      setVerificationResult({
        success: false,
        error: error.message || 'Verification failed'
      });
    }
    setVerificationProcessing(false);
    
    // Clear URL params
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const fetchAttestedEmployees = async (companyName) => {
    try {
      const candidates = await base44.entities.UniqueCandidate.filter({});
      const attested = candidates.filter(c => {
        if (!c.employers) return false;
        return c.employers.some(emp => {
          const ma = emp.manual_employer_attestation;
          if (!ma || ma.status !== 'verified') return false;
          const empCompany = ma.attested_by_company?.toLowerCase().trim();
          const searchCompany = companyName?.toLowerCase().trim();
          return empCompany === searchCompany || empCompany?.includes(searchCompany) || searchCompany?.includes(empCompany);
        });
      });
      setAttestedEmployees(attested);
    } catch (error) {
      console.error('Error fetching attested employees:', error);
    }
  };

  const handleSearchCompany = async () => {
    if (!companySearch.trim()) return;
    
    setSearching(true);
    setEmailOptions([]);
    setSelectedEmail(null);
    setCompanyOptions([]);
    setHrSearchFailed(false);
    
    try {
      // Use LLM to find matching companies and their email domains
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Search for companies matching "${companySearch}". Return the top 2-3 most likely matches with their official corporate email domains.

For example, if someone searches "Google", return:
- Google LLC with @google.com
- Alphabet Inc with @alphabet.com (if relevant)

Be accurate - only include real companies and their verified domains.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            companies: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  name: { type: "string", description: "Official company name" },
                  domain: { type: "string", description: "Primary email domain (e.g., @google.com)" }
                }
              },
              description: "List of 2-3 matching companies with their email domains"
            }
          }
        }
      });

      if (result.companies && result.companies.length > 0) {
        setCompanyOptions(result.companies.map(c => ({
          company: c.name,
          domain: c.domain.startsWith('@') ? c.domain : `@${c.domain}`
        })));
      } else {
        // Fallback to generated option
        const normalized = companySearch.toLowerCase().replace(/[^a-z0-9]/g, '');
        setCompanyOptions([
          { company: companySearch, domain: `@${normalized}.com` }
        ]);
      }
    } catch (error) {
      console.error('Search error:', error);
      // Fallback
      const normalized = companySearch.toLowerCase().replace(/[^a-z0-9]/g, '');
      setCompanyOptions([
        { company: companySearch, domain: `@${normalized}.com` }
      ]);
    }
    
    setSearching(false);
  };

  const handleDiscoverHREmail = async () => {
    if (!selectedEmail) return;
    
    setSendingVerification(true);
    setHrSearchFailed(false);
    try {
      const response = await base44.functions.invoke('discoverCompanyHREmail', {
        companyName: selectedEmail.company,
        companyDomain: selectedEmail.domain
      });

      if (response.data?.email) {
        setDiscoveredHREmail({
          email: response.data.email,
          source: response.data.source,
          confidence: response.data.confidence
        });
      } else {
        // If no email found, show failure message and alternative methods
        setHrSearchFailed(true);
        setShowAltVerification(true);
      }
    } catch (error) {
      console.error('HR email discovery error:', error);
      setHrSearchFailed(true);
      setShowAltVerification(true);
    }
    setSendingVerification(false);
  };

  const handleSendToDiscoveredEmail = async () => {
    if (!discoveredHREmail || !selectedEmail) return;
    
    setSendingVerification(true);
    try {
      const response = await base44.functions.invoke('sendWorkplaceVerificationEmail', {
        companyName: selectedEmail.company,
        companyDomain: selectedEmail.domain,
        hrEmail: discoveredHREmail.email
      });

      if (response.data?.success) {
        setPendingVerification({
          company: selectedEmail.company,
          domain: selectedEmail.domain,
          company_email: response.data.sentTo,
          requested_date: new Date().toISOString(),
          status: 'pending'
        });
        resetVerificationState();
      } else {
        alert(response.data?.error || 'Failed to send verification email');
      }
    } catch (error) {
      console.error('Verification error:', error);
      alert('Failed to send verification email');
    }
    setSendingVerification(false);
  };

  const handleWorkEmailVerification = async () => {
    if (!workEmail || !selectedEmail) return;
    
    // Validate email matches company domain
    const emailDomain = '@' + workEmail.split('@')[1];
    if (emailDomain.toLowerCase() !== selectedEmail.domain.toLowerCase()) {
      alert(`Email must be from ${selectedEmail.domain}`);
      return;
    }
    
    setSendingVerification(true);
    try {
      const response = await base44.functions.invoke('sendWorkEmailVerification', {
        companyName: selectedEmail.company,
        companyDomain: selectedEmail.domain,
        workEmail: workEmail.trim()
      });

      if (response.data?.success) {
        setPendingVerification({
          company: selectedEmail.company,
          domain: selectedEmail.domain,
          company_email: workEmail,
          requested_date: new Date().toISOString(),
          status: 'pending',
          method: 'work_email'
        });
        resetVerificationState();
      } else {
        alert(response.data?.error || 'Failed to send verification email');
      }
    } catch (error) {
      console.error('Work email verification error:', error);
      alert('Failed to send verification email');
    }
    setSendingVerification(false);
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingDoc(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedDoc({ url: file_url, name: file.name });
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload document');
    }
    setUploadingDoc(false);
  };

  const handleDocumentVerification = async () => {
    if (!uploadedDoc || !selectedEmail) return;
    
    setSendingVerification(true);
    try {
      const response = await base44.functions.invoke('submitDocumentVerification', {
        companyName: selectedEmail.company,
        companyDomain: selectedEmail.domain,
        documentUrl: uploadedDoc.url,
        documentName: uploadedDoc.name
      });

      if (response.data?.success) {
        setPendingVerification({
          company: selectedEmail.company,
          domain: selectedEmail.domain,
          requested_date: new Date().toISOString(),
          status: 'pending',
          method: 'document_review'
        });
        resetVerificationState();
      } else {
        alert(response.data?.error || 'Failed to submit for review');
      }
    } catch (error) {
      console.error('Document verification error:', error);
      alert('Failed to submit for review');
    }
    setSendingVerification(false);
  };

  const resetVerificationState = () => {
    setEmailOptions([]);
    setSelectedEmail(null);
    setCompanySearch('');
    setDiscoveredHREmail(null);
    setShowAltVerification(false);
    setAltVerificationMethod(null);
    setWorkEmail('');
    setUploadedDoc(null);
    setHrSearchFailed(false);
    setCompanyOptions([]);
  };

  if (loading) {
    return (
      <GradientBackground>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </GradientBackground>
    );
  }

  // Lockout for non-corporate/enterprise users
  if (!user || (user.subscription_tier !== 'corporate' && user.subscription_tier !== 'enterprise')) {
    return (
      <GradientBackground>
        <div className="max-w-2xl mx-auto px-4 py-16">
          <GlassCard className="p-8 md:p-12 text-center" gradient>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 mb-6"
            >
              <Lock className="w-8 h-8 text-purple-400" />
            </motion.div>
            
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight">
              Corporate / Enterprise Feature
            </h1>

            <p className="text-white/50 text-lg mb-6">
              The Attestation Portal is available for Corporate and Enterprise subscribers.
            </p>
            
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 mb-8 text-left">
              <h3 className="text-white font-medium mb-3 text-sm">What you get with Enterprise:</h3>
              <ul className="space-y-2 text-white/50 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Workplace verification portal
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  On-chain attestation management
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Unlimited employment verifications
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Team collaboration (up to 5 members)
                </li>
              </ul>
            </div>
            
            <Link to={createPageUrl('Pricing')}>
              <Button size="lg" className="bg-white hover:bg-white/90 text-black font-semibold rounded-xl">
                Upgrade Now
              </Button>
            </Link>
          </GlassCard>
        </div>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <SectionHeader
          badge="Enterprise"
          title="Attestation Portal"
          subtitle="Verify your workplace and manage on-chain employment attestations"
          className="mb-12"
        />

        {/* Workplace Verification Box */}
        <GlassCard className="p-6 md:p-8 mb-8" delay={0.1}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white tracking-tight">Find My Workplace</h2>
            {verified && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-0 ml-auto">
                <CheckCircle className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>

          {/* Verification Result Banner */}
          {verificationResult && (
            <div className={`mb-6 p-4 rounded-xl border ${
              verificationResult.success 
                ? verificationResult.action === 'approved'
                  ? 'bg-green-900/20 border-green-500/30'
                  : 'bg-orange-900/20 border-orange-500/30'
                : 'bg-red-900/20 border-red-500/30'
            }`}>
              {verificationResult.success ? (
                verificationResult.action === 'approved' ? (
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <p className="text-green-300">
                      <strong>{verificationResult.userName}</strong> has been authorized to represent <strong>{verificationResult.company}</strong>
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-orange-400" />
                    <p className="text-orange-300">
                      Authorization request for <strong>{verificationResult.company}</strong> was denied
                    </p>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <p className="text-red-300">{verificationResult.error}</p>
                </div>
              )}
            </div>
          )}

          {verificationProcessing && (
            <div className="mb-6 p-6 rounded-xl bg-zinc-800/50 border border-zinc-700 text-center">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
              <p className="text-white">Processing verification...</p>
            </div>
          )}

          {verified && verifiedWorkplace ? (
            <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <div>
                    <p className="text-white font-medium">{verifiedWorkplace.company}</p>
                    <p className="text-white/60 text-sm">{verifiedWorkplace.domain}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (confirm('Are you sure you want to unlink your workplace?')) {
                      await base44.auth.updateMe({ verified_workplace: null });
                      setVerified(false);
                      setVerifiedWorkplace(null);
                    }
                  }}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  Unlink
                </Button>
              </div>
              <p className="text-green-300/80 text-sm">
                Your workplace has been verified. You can now create and manage attestations.
              </p>
            </div>
          ) : pendingVerification ? (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-6 h-6 text-blue-400" />
                <div>
                  <p className="text-white font-medium">Awaiting Company Verification</p>
                  <p className="text-white/60 text-sm">{pendingVerification.company}</p>
                </div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-4 mb-4">
                <p className="text-white/70 text-sm mb-2">
                  A verification email has been sent to:
                </p>
                <p className="text-blue-300 font-medium">{pendingVerification.company_email}</p>
              </div>
              <p className="text-blue-300/80 text-sm mb-4">
                Once someone at {pendingVerification.company} approves your request, you'll be able to create attestations. 
                This typically takes 1-2 business days.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (confirm('Cancel your pending verification request?')) {
                    await base44.auth.updateMe({ pending_workplace_verification: null });
                    setPendingVerification(null);
                  }
                }}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                Cancel Request
              </Button>
            </div>
          ) : (
            <>
              <div className="flex gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    placeholder="Enter company name (e.g., Google, Microsoft)"
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchCompany()}
                    className="pl-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-white/40"
                  />
                </div>
                <Button
                  onClick={handleSearchCompany}
                  disabled={searching || !companySearch.trim()}
                  className="bg-blue-600 hover:bg-blue-500 text-white"
                >
                  {searching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Search'
                  )}
                </Button>
              </div>

              {companyOptions.length > 0 && (
                <div className="space-y-4">
                  <p className="text-white/70 text-sm">Select your company:</p>
                  <div className="grid gap-2">
                    {companyOptions.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedEmail(option)}
                        className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                          selectedEmail?.domain === option.domain
                            ? 'bg-blue-500/20 border-blue-500/50'
                            : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                        }`}
                      >
                        <Building2 className={`w-5 h-5 ${selectedEmail?.domain === option.domain ? 'text-blue-400' : 'text-white/40'}`} />
                        <div className="text-left">
                          <p className="text-white font-medium">{option.company}</p>
                          <p className="text-white/60 text-sm">{option.domain}</p>
                        </div>
                        {selectedEmail?.domain === option.domain && (
                          <CheckCircle className="w-5 h-5 text-blue-400 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>

                  {selectedEmail && !discoveredHREmail && !showAltVerification && (
                    <div className="mt-4">
                      <Button
                        onClick={handleDiscoverHREmail}
                        disabled={sendingVerification}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                      >
                        {sendingVerification ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Finding HR Contact...
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4 mr-2" />
                            Find {selectedEmail.company}'s HR Contact
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Discovered HR Email */}
                  {selectedEmail && discoveredHREmail && !showAltVerification && (
                    <div className="mt-4 space-y-4">
                      <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                        <p className="text-white/70 text-sm mb-2">We found this HR contact:</p>
                        <div className="flex items-center gap-3 bg-zinc-900 rounded-lg p-3">
                          <Mail className="w-5 h-5 text-blue-400" />
                          <div className="flex-1">
                            <p className="text-white font-medium">{discoveredHREmail.email}</p>
                            <p className="text-white/50 text-xs">{discoveredHREmail.source}</p>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        onClick={handleSendToDiscoveredEmail}
                        disabled={sendingVerification}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                      >
                        {sendingVerification ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending Verification...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Send Verification Request
                          </>
                        )}
                      </Button>
                      
                      <button
                        onClick={() => {
                          setDiscoveredHREmail(null);
                          setShowAltVerification(true);
                        }}
                        className="w-full text-center text-white/50 hover:text-white/70 text-sm py-2"
                      >
                        Not your company's email? Try alternative verification →
                      </button>
                    </div>
                  )}

                  {/* Alternative Verification Methods */}
                  {selectedEmail && showAltVerification && (
                    <div className="mt-4 space-y-4">
                      {hrSearchFailed && (
                        <div className="bg-orange-900/20 border border-orange-500/30 rounded-xl p-4 mb-2">
                          <div className="flex items-center gap-2 text-orange-300">
                            <XCircle className="w-4 h-4" />
                            <p className="text-sm font-medium">Couldn't find HR contact for {selectedEmail.company}</p>
                          </div>
                          <p className="text-orange-300/70 text-xs mt-1">
                            Please use one of the alternative verification methods below.
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={() => {
                            setShowAltVerification(false);
                            setAltVerificationMethod(null);
                            setWorkEmail('');
                            setUploadedDoc(null);
                            setHrSearchFailed(false);
                          }}
                          className="text-white/50 hover:text-white"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                        <p className="text-white font-medium">Alternative Verification</p>
                      </div>

                      {!altVerificationMethod && (
                        <div className="space-y-3">
                          <button
                            onClick={() => setAltVerificationMethod('work_email')}
                            className="w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600 text-left"
                          >
                            <div className="p-2 rounded-lg bg-blue-500/20">
                              <Mail className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                              <p className="text-white font-medium">Work Email Verification</p>
                              <p className="text-white/50 text-sm">Verify using your {selectedEmail.domain} email address</p>
                            </div>
                          </button>
                          
                          <button
                            onClick={() => setAltVerificationMethod('document')}
                            className="w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600 text-left"
                          >
                            <div className="p-2 rounded-lg bg-purple-500/20">
                              <FileText className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                              <p className="text-white font-medium">Document Verification</p>
                              <p className="text-white/50 text-sm">Upload business documents for manual review</p>
                            </div>
                          </button>
                        </div>
                      )}

                      {/* Work Email Method */}
                      {altVerificationMethod === 'work_email' && (
                        <div className="space-y-4">
                          <button
                            onClick={() => setAltVerificationMethod(null)}
                            className="text-white/50 hover:text-white text-sm flex items-center gap-1"
                          >
                            <ArrowLeft className="w-3 h-3" /> Back to options
                          </button>
                          
                          <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                            <p className="text-white/70 text-sm mb-3">
                              Enter your work email at <span className="text-white font-medium">{selectedEmail.company}</span>:
                            </p>
                            <Input
                              type="email"
                              placeholder={`you${selectedEmail.domain}`}
                              value={workEmail}
                              onChange={(e) => setWorkEmail(e.target.value)}
                              className="bg-zinc-900 border-zinc-600 text-white placeholder:text-zinc-500"
                            />
                            <p className="text-white/50 text-xs mt-2">
                              We'll send a verification link to confirm you have access to this email.
                            </p>
                          </div>
                          
                          <Button
                            onClick={handleWorkEmailVerification}
                            disabled={sendingVerification || !workEmail.includes('@')}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                          >
                            {sendingVerification ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                Send Verification Link
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {/* Document Method */}
                      {altVerificationMethod === 'document' && (
                        <div className="space-y-4">
                          <button
                            onClick={() => setAltVerificationMethod(null)}
                            className="text-white/50 hover:text-white text-sm flex items-center gap-1"
                          >
                            <ArrowLeft className="w-3 h-3" /> Back to options
                          </button>
                          
                          <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                            <p className="text-white/70 text-sm mb-3">
                              Upload official business documentation:
                            </p>
                            <ul className="text-white/50 text-xs mb-4 space-y-1">
                              <li>• Business license or incorporation papers</li>
                              <li>• Official company letterhead with your name</li>
                              <li>• Employment verification letter</li>
                            </ul>
                            
                            {!uploadedDoc ? (
                              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-600 rounded-xl cursor-pointer hover:border-zinc-500 bg-zinc-900/50">
                                <input
                                  type="file"
                                  accept=".pdf,.png,.jpg,.jpeg"
                                  onChange={handleDocumentUpload}
                                  className="hidden"
                                />
                                {uploadingDoc ? (
                                  <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
                                ) : (
                                  <>
                                    <Upload className="w-6 h-6 text-white/40 mb-2" />
                                    <p className="text-white/50 text-sm">Click to upload document</p>
                                    <p className="text-white/30 text-xs">PDF, PNG, JPG up to 10MB</p>
                                  </>
                                )}
                              </label>
                            ) : (
                              <div className="flex items-center gap-3 bg-zinc-900 rounded-lg p-3">
                                <FileText className="w-5 h-5 text-green-400" />
                                <p className="text-white text-sm flex-1 truncate">{uploadedDoc.name}</p>
                                <button
                                  onClick={() => setUploadedDoc(null)}
                                  className="text-white/50 hover:text-white"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                            
                            <p className="text-white/50 text-xs mt-3">
                              Documents will be manually reviewed by our team (1-3 business days).
                            </p>
                          </div>
                          
                          <Button
                            onClick={handleDocumentVerification}
                            disabled={sendingVerification || !uploadedDoc}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white"
                          >
                            {sendingVerification ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              <>
                                <FileText className="w-4 h-4 mr-2" />
                                Submit for Review
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!companyOptions.length && !searching && (
                <p className="text-white/30 text-sm text-center py-4">
                  Search for your company to begin verification
                </p>
              )}
            </>
          )}
        </GlassCard>

        {/* Add Employee & My Attestations - Only show when verified */}
        {verified && (
          <>
            {/* Add Employee Section */}
            <GlassCard className="p-6 md:p-8 mb-8" delay={0.2}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10">
                    <UserPlus className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white tracking-tight">Add Employee</h2>
                    <p className="text-white/40 text-sm">Attest employment for your team</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowAddEmployee(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Employee
                </Button>
              </div>

              {/* Attested Employees List */}
              {attestedEmployees.length > 0 && (
                <div className="border-t border-white/[0.06] pt-4 mt-4">
                  <p className="text-white/50 text-sm mb-3">
                    Attested by {verifiedWorkplace?.company} ({attestedEmployees.length})
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {attestedEmployees.map((candidate, idx) => {
                      const employer = candidate.employers?.find(emp => 
                        emp.manual_employer_attestation?.attested_by_company?.toLowerCase().includes(verifiedWorkplace?.company?.toLowerCase())
                      );
                      const ma = employer?.manual_employer_attestation;
                      return (
                        <div key={candidate.id || idx} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                          <div>
                            <p className="text-white font-medium text-sm">{candidate.name}</p>
                            <p className="text-white/40 text-xs">
                              {ma?.job_title && `${ma.job_title} • `}
                              {new Date(ma?.attested_date).toLocaleDateString()}
                            </p>
                          </div>
                          {ma?.attestation_uid && (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              On-chain
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </GlassCard>

            {/* My Attestations Button */}
            <GlassCard className="p-6 md:p-8" gradient delay={0.3}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1 tracking-tight">My Attestations</h3>
                  <p className="text-white/40 text-sm">
                    View all on-chain attestations you've created
                  </p>
                </div>
                <Link to={createPageUrl('MyAttestations')}>
                  <Button className="bg-white hover:bg-white/90 text-black font-medium rounded-xl">
                    View Attestations
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </GlassCard>
          </>
        )}

        {/* Info Section */}
        <GlassCard className="mt-8 p-6" delay={0.4}>
          <h3 className="text-white font-medium mb-4 text-sm tracking-tight">About On-Chain Attestations</h3>
          <div className="space-y-3 text-white/40 text-sm">
            <p>
              On-chain attestations are permanent, tamper-proof records stored on Base blockchain using EAS.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Cannot be altered or deleted</li>
              <li>Publicly verifiable by anyone</li>
              <li>Cryptographic proof of verification</li>
            </ul>
          </div>
        </GlassCard>
      </div>

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={showAddEmployee}
        onClose={() => setShowAddEmployee(false)}
        verifiedWorkplace={verifiedWorkplace}
        onSuccess={() => {
          if (verifiedWorkplace?.company) {
            fetchAttestedEmployees(verifiedWorkplace.company);
          }
        }}
      />
    </GradientBackground>
  );
}