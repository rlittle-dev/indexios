import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Lock, Building2, Search, Mail, CheckCircle, Loader2, Shield, ExternalLink, UserPlus, Clock, XCircle, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AddEmployeeModal from '@/components/attestation/AddEmployeeModal';

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
    
    try {
      // Use LLM to find common email extensions for the company
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Find the most likely corporate email domain extensions for the company "${companySearch}". 
        
        Return common patterns like:
        - @companyname.com
        - @company.com
        - Any known official domain
        
        Be accurate - only include domains that are likely real for this specific company.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            company_name: { type: "string" },
            email_domains: { 
              type: "array", 
              items: { type: "string" },
              description: "List of email domain extensions (e.g., @google.com)"
            },
            primary_domain: { type: "string" }
          }
        }
      });

      if (result.email_domains && result.email_domains.length > 0) {
        setEmailOptions(result.email_domains.map(domain => ({
          domain,
          company: result.company_name || companySearch
        })));
      } else {
        // Fallback to generated options
        const normalized = companySearch.toLowerCase().replace(/[^a-z0-9]/g, '');
        setEmailOptions([
          { domain: `@${normalized}.com`, company: companySearch },
          { domain: `@${normalized}.co`, company: companySearch },
          { domain: `@${normalized}.io`, company: companySearch }
        ]);
      }
    } catch (error) {
      console.error('Search error:', error);
      // Fallback
      const normalized = companySearch.toLowerCase().replace(/[^a-z0-9]/g, '');
      setEmailOptions([
        { domain: `@${normalized}.com`, company: companySearch },
        { domain: `@${normalized}.co`, company: companySearch }
      ]);
    }
    
    setSearching(false);
  };

  const handleVerifyWorkplace = async () => {
    if (!selectedEmail) return;
    
    setSendingVerification(true);
    try {
      const response = await base44.functions.invoke('sendWorkplaceVerificationEmail', {
        companyName: selectedEmail.company,
        companyDomain: selectedEmail.domain
      });

      if (response.data?.success) {
        setPendingVerification({
          company: selectedEmail.company,
          domain: selectedEmail.domain,
          company_email: response.data.sentTo,
          requested_date: new Date().toISOString(),
          status: 'pending'
        });
        setEmailOptions([]);
        setSelectedEmail(null);
        setCompanySearch('');
      } else {
        alert(response.data?.error || 'Failed to send verification email');
      }
    } catch (error) {
      console.error('Verification error:', error);
      alert('Failed to send verification email');
    }
    setSendingVerification(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Lockout for non-enterprise users
  if (!user || user.subscription_tier !== 'enterprise') {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 pointer-events-none" />
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 md:p-12 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex p-4 rounded-full bg-purple-500/20 mb-6"
            >
              <Lock className="w-8 h-8 text-purple-400" />
            </motion.div>
            
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Enterprise Feature
            </h1>
            
            <p className="text-white/70 text-lg mb-6">
              The Attestation Portal is exclusively available for Enterprise plan subscribers. 
              Manage on-chain employment verifications and build your verified workforce.
            </p>
            
            <div className="bg-zinc-800/50 rounded-xl p-6 mb-8 text-left">
              <h3 className="text-white font-semibold mb-3">What you get with Enterprise:</h3>
              <ul className="space-y-2 text-white/70 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  Workplace verification portal
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  On-chain attestation management
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  Unlimited employment verifications
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  Team collaboration (up to 5 members)
                </li>
              </ul>
            </div>
            
            <Link to={createPageUrl('Pricing')}>
              <Button size="lg" className="bg-white hover:bg-gray-100 text-black font-semibold">
                Upgrade to Enterprise
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex p-3 rounded-full bg-blue-500/20 mb-4">
            <Shield className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Attestation Portal
          </h1>
          <p className="text-white/60 max-w-xl mx-auto">
            Verify your workplace and manage on-chain employment attestations
          </p>
        </motion.div>

        {/* Workplace Verification Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 md:p-8 mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Find My Workplace</h2>
            {verified && (
              <Badge className="bg-green-500/20 text-green-300 ml-auto">
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
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (confirm('Cancel your pending verification request?')) {
                    await base44.auth.updateMe({ pending_workplace_verification: null });
                    setPendingVerification(null);
                  }
                }}
                className="border-zinc-600 text-white/70 hover:bg-zinc-800"
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

              {emailOptions.length > 0 && (
                <div className="space-y-4">
                  <p className="text-white/70 text-sm">Select your company email domain:</p>
                  <div className="grid gap-2">
                    {emailOptions.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedEmail(option)}
                        className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                          selectedEmail?.domain === option.domain
                            ? 'bg-blue-500/20 border-blue-500/50'
                            : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                        }`}
                      >
                        <Mail className={`w-5 h-5 ${selectedEmail?.domain === option.domain ? 'text-blue-400' : 'text-white/40'}`} />
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

                  {selectedEmail && (
                    <div className="mt-4 space-y-3">
                      <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                        <p className="text-white/70 text-sm mb-2">
                          A verification email will be sent to:
                        </p>
                        <p className="text-blue-300 font-medium">
                          hr{selectedEmail.domain}
                        </p>
                        <p className="text-white/50 text-xs mt-2">
                          This email explains that you're requesting authorization to create employment attestations for {selectedEmail.company}.
                        </p>
                      </div>
                      <Button
                        onClick={handleVerifyWorkplace}
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
                    </div>
                  )}
                </div>
              )}

              {!emailOptions.length && !searching && (
                <p className="text-white/50 text-sm text-center py-4">
                  Search for your company to find available email domains for verification
                </p>
              )}
            </>
          )}
        </motion.div>

        {/* Add Employee & My Attestations - Only show when verified */}
        {verified && (
          <>
            {/* Add Employee Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 md:p-8 mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <UserPlus className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Add Employee</h2>
                    <p className="text-white/60 text-sm">Attest employment for your team members</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowAddEmployee(true)}
                  className="bg-green-600 hover:bg-green-500 text-white"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Employee
                </Button>
              </div>

              {/* Attested Employees List */}
              {attestedEmployees.length > 0 && (
                <div className="border-t border-zinc-800 pt-4 mt-4">
                  <p className="text-white/70 text-sm mb-3">
                    Employees attested by {verifiedWorkplace?.company} ({attestedEmployees.length})
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {attestedEmployees.map((candidate, idx) => {
                      const employer = candidate.employers?.find(emp => 
                        emp.manual_employer_attestation?.attested_by_company?.toLowerCase().includes(verifiedWorkplace?.company?.toLowerCase())
                      );
                      const ma = employer?.manual_employer_attestation;
                      return (
                        <div key={candidate.id || idx} className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-3">
                          <div>
                            <p className="text-white font-medium">{candidate.name}</p>
                            <p className="text-white/50 text-xs">
                              {ma?.job_title && `${ma.job_title} • `}
                              Attested {new Date(ma?.attested_date).toLocaleDateString()}
                            </p>
                          </div>
                          {ma?.attestation_uid && (
                            <Badge className="bg-green-500/20 text-green-300 text-xs">
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
            </motion.div>

            {/* My Attestations Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-2xl p-6 md:p-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">My Attestations</h3>
                  <p className="text-white/60 text-sm">
                    View all on-chain employment attestations you've created
                  </p>
                </div>
                <Link to={createPageUrl('MyAttestations')}>
                  <Button className="bg-white hover:bg-gray-100 text-black font-medium">
                    View Attestations
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </>
        )}

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
        >
          <h3 className="text-white font-semibold mb-4">About On-Chain Attestations</h3>
          <div className="space-y-3 text-white/70 text-sm">
            <p>
              On-chain attestations are permanent, tamper-proof records of employment verification 
              stored on the Base blockchain using the Ethereum Attestation Service (EAS).
            </p>
            <p>
              When you verify a candidate's employment, an attestation is created that:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Cannot be altered or deleted</li>
              <li>Is publicly verifiable by anyone</li>
              <li>Provides cryptographic proof of verification</li>
              <li>Links to the verifying organization</li>
            </ul>
          </div>
        </motion.div>
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
    </div>
  );
}