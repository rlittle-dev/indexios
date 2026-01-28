import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Lock, Building2, Search, Mail, CheckCircle, Loader2, Shield, ExternalLink, UserPlus, Clock, XCircle, Send, Upload, FileText, ArrowLeft, Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AddEmployeeModal from '@/components/attestation/AddEmployeeModal';

export default function AttestationPortal() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companySearch, setCompanySearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [verified, setVerified] = useState(false);
  const [verifiedWorkplace, setVerifiedWorkplace] = useState(null);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [attestedEmployees, setAttestedEmployees] = useState([]);
  const [pendingVerification, setPendingVerification] = useState(null);
  const [sendingVerification, setSendingVerification] = useState(false);
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
          if (currentUser.verified_workplace) {
            setVerified(true);
            setVerifiedWorkplace(currentUser.verified_workplace);
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

    const urlParams = new URLSearchParams(window.location.search);
    const verifyToken = urlParams.get('verify_token');
    const action = urlParams.get('action');
    if (verifyToken && action) processVerificationFromUrl(verifyToken, action);
  }, []);

  const processVerificationFromUrl = async (token, action) => {
    try {
      const response = await base44.functions.invoke('processWorkplaceVerification', { token, action });
      if (response.data?.success) {
        setVerificationResult({ success: true, action: response.data.action, company: response.data.company, userName: response.data.userName });
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
        setVerificationResult({ success: false, error: response.data?.error || 'Verification failed' });
      }
    } catch (error) {
      setVerificationResult({ success: false, error: error.message || 'Verification failed' });
    }
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
    setCompanyOptions([]);
    setSelectedEmail(null);
    setHrSearchFailed(false);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Search for companies matching "${companySearch}". Return the top 2-3 most likely matches with their official corporate email domains.`,
        add_context_from_internet: true,
        response_json_schema: { type: "object", properties: { companies: { type: "array", items: { type: "object", properties: { name: { type: "string" }, domain: { type: "string" } } } } } }
      });
      if (result.companies && result.companies.length > 0) {
        setCompanyOptions(result.companies.map(c => ({ company: c.name, domain: c.domain.startsWith('@') ? c.domain : `@${c.domain}` })));
      } else {
        const normalized = companySearch.toLowerCase().replace(/[^a-z0-9]/g, '');
        setCompanyOptions([{ company: companySearch, domain: `@${normalized}.com` }]);
      }
    } catch (error) {
      const normalized = companySearch.toLowerCase().replace(/[^a-z0-9]/g, '');
      setCompanyOptions([{ company: companySearch, domain: `@${normalized}.com` }]);
    }
    setSearching(false);
  };

  const handleDiscoverHREmail = async () => {
    if (!selectedEmail) return;
    setSendingVerification(true);
    setHrSearchFailed(false);
    try {
      const response = await base44.functions.invoke('discoverCompanyHREmail', { companyName: selectedEmail.company, companyDomain: selectedEmail.domain });
      if (response.data?.email) {
        setDiscoveredHREmail({ email: response.data.email, source: response.data.source, confidence: response.data.confidence });
      } else {
        setHrSearchFailed(true);
        setShowAltVerification(true);
      }
    } catch (error) {
      setHrSearchFailed(true);
      setShowAltVerification(true);
    }
    setSendingVerification(false);
  };

  const handleSendToDiscoveredEmail = async () => {
    if (!discoveredHREmail || !selectedEmail) return;
    setSendingVerification(true);
    try {
      const response = await base44.functions.invoke('sendWorkplaceVerificationEmail', { companyName: selectedEmail.company, companyDomain: selectedEmail.domain, hrEmail: discoveredHREmail.email });
      if (response.data?.success) {
        setPendingVerification({ company: selectedEmail.company, domain: selectedEmail.domain, company_email: response.data.sentTo, requested_date: new Date().toISOString(), status: 'pending' });
        resetVerificationState();
      } else {
        alert(response.data?.error || 'Failed to send verification email');
      }
    } catch (error) {
      alert('Failed to send verification email');
    }
    setSendingVerification(false);
  };

  const handleWorkEmailVerification = async () => {
    if (!workEmail || !selectedEmail) return;
    const emailDomain = '@' + workEmail.split('@')[1];
    if (emailDomain.toLowerCase() !== selectedEmail.domain.toLowerCase()) {
      alert(`Email must be from ${selectedEmail.domain}`);
      return;
    }
    setSendingVerification(true);
    try {
      const response = await base44.functions.invoke('sendWorkEmailVerification', { companyName: selectedEmail.company, companyDomain: selectedEmail.domain, workEmail: workEmail.trim() });
      if (response.data?.success) {
        setPendingVerification({ company: selectedEmail.company, domain: selectedEmail.domain, company_email: workEmail, requested_date: new Date().toISOString(), status: 'pending', method: 'work_email' });
        resetVerificationState();
      } else {
        alert(response.data?.error || 'Failed to send verification email');
      }
    } catch (error) {
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
      alert('Failed to upload document');
    }
    setUploadingDoc(false);
  };

  const handleDocumentVerification = async () => {
    if (!uploadedDoc || !selectedEmail) return;
    setSendingVerification(true);
    try {
      const response = await base44.functions.invoke('submitDocumentVerification', { companyName: selectedEmail.company, companyDomain: selectedEmail.domain, documentUrl: uploadedDoc.url, documentName: uploadedDoc.name });
      if (response.data?.success) {
        setPendingVerification({ company: selectedEmail.company, domain: selectedEmail.domain, requested_date: new Date().toISOString(), status: 'pending', method: 'document_review' });
        resetVerificationState();
      } else {
        alert(response.data?.error || 'Failed to submit for review');
      }
    } catch (error) {
      alert('Failed to submit for review');
    }
    setSendingVerification(false);
  };

  const resetVerificationState = () => {
    setCompanyOptions([]);
    setSelectedEmail(null);
    setCompanySearch('');
    setDiscoveredHREmail(null);
    setShowAltVerification(false);
    setAltVerificationMethod(null);
    setWorkEmail('');
    setUploadedDoc(null);
    setHrSearchFailed(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Lockout for non-enterprise users
  if (!user || user.subscription_tier !== 'enterprise') {
    return (
      <section className="relative min-h-screen bg-[#0a0a0a] overflow-hidden">
        <div className="absolute inset-0 z-0" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop")', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.15 }}>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/80 via-[#0a0a0a]/70 to-[#0a0a0a]" />
        </div>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-purple-500/[0.04] rounded-full blur-[150px]" />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto px-4 py-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-purple-500/30 overflow-hidden">
              <div className="px-5 py-3 border-b border-purple-500/20 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Access Required</span>
              </div>
              <div className="p-8 text-center">
                <div className="inline-flex p-4 rounded-2xl bg-red-500/10 mb-6">
                  <Lock className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-white text-2xl font-medium mb-3">Enterprise Feature</h3>
                <p className="text-white/50 mb-6 max-w-md mx-auto">
                  The Attestation Portal is available for Enterprise subscribers.
                </p>
                <Link to={createPageUrl('Pricing')}>
                  <Button className="bg-white hover:bg-white/90 text-black font-medium rounded-full px-8">
                    View Plans
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
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
            <Link2 className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Enterprise</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight leading-[1.1] mb-4">
            <span className="text-white/60">Attestation</span>
            <span className="text-white font-medium"> Portal</span>
          </h1>
          <p className="text-lg text-white/50 max-w-xl mx-auto">Verify your workplace and manage on-chain employment attestations</p>
        </motion.div>

        {/* Verification Result Banner */}
        {verificationResult && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`mb-6 rounded-2xl p-4 border ${verificationResult.success ? verificationResult.action === 'approved' ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-orange-900/20 border-orange-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
            {verificationResult.success ? (
              verificationResult.action === 'approved' ? (
                <div className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-emerald-400" /><p className="text-emerald-300"><strong>{verificationResult.userName}</strong> has been authorized to represent <strong>{verificationResult.company}</strong></p></div>
              ) : (
                <div className="flex items-center gap-3"><XCircle className="w-5 h-5 text-orange-400" /><p className="text-orange-300">Authorization request for <strong>{verificationResult.company}</strong> was denied</p></div>
              )
            ) : (
              <div className="flex items-center gap-3"><XCircle className="w-5 h-5 text-red-400" /><p className="text-red-300">{verificationResult.error}</p></div>
            )}
          </motion.div>
        )}

        {/* Workplace Verification Box */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 overflow-hidden mb-6">
            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Workplace Verification</span>
              </div>
              {verified && <Badge className="bg-emerald-500/20 text-emerald-300 border-0"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>}
            </div>
            <div className="p-6">
              {verified && verifiedWorkplace ? (
                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-emerald-400" />
                      <div>
                        <p className="text-white font-medium">{verifiedWorkplace.company}</p>
                        <p className="text-white/60 text-sm">{verifiedWorkplace.domain}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={async () => { if (confirm('Unlink your workplace?')) { await base44.auth.updateMe({ verified_workplace: null }); setVerified(false); setVerifiedWorkplace(null); } }} className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl">
                      Unlink
                    </Button>
                  </div>
                  <p className="text-emerald-300/80 text-sm">Your workplace has been verified. You can now create and manage attestations.</p>
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
                  <div className="bg-white/[0.02] rounded-lg p-4 mb-4">
                    <p className="text-white/70 text-sm mb-2">Verification email sent to:</p>
                    <p className="text-blue-300 font-medium">{pendingVerification.company_email}</p>
                  </div>
                  <p className="text-blue-300/80 text-sm mb-4">Typically takes 1-2 business days.</p>
                  <Button variant="ghost" size="sm" onClick={async () => { if (confirm('Cancel request?')) { await base44.auth.updateMe({ pending_workplace_verification: null }); setPendingVerification(null); } }} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                    Cancel Request
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex gap-3 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <Input placeholder="Enter company name (e.g., Google, Microsoft)" value={companySearch} onChange={(e) => setCompanySearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearchCompany()} className="pl-10 bg-white/[0.02] border-white/10 text-white placeholder:text-white/30 rounded-xl" />
                    </div>
                    <Button onClick={handleSearchCompany} disabled={searching || !companySearch.trim()} className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl">
                      {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                    </Button>
                  </div>

                  {companyOptions.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-white/70 text-sm">Select your company:</p>
                      <div className="grid gap-2">
                        {companyOptions.map((option, idx) => (
                          <button key={idx} onClick={() => setSelectedEmail(option)} className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${selectedEmail?.domain === option.domain ? 'bg-blue-500/20 border-blue-500/50' : 'bg-white/[0.02] border-white/10 hover:border-white/20'}`}>
                            <Building2 className={`w-5 h-5 ${selectedEmail?.domain === option.domain ? 'text-blue-400' : 'text-white/40'}`} />
                            <div className="text-left">
                              <p className="text-white font-medium">{option.company}</p>
                              <p className="text-white/60 text-sm">{option.domain}</p>
                            </div>
                            {selectedEmail?.domain === option.domain && <CheckCircle className="w-5 h-5 text-blue-400 ml-auto" />}
                          </button>
                        ))}
                      </div>

                      {selectedEmail && !discoveredHREmail && !showAltVerification && (
                        <Button onClick={handleDiscoverHREmail} disabled={sendingVerification} className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl">
                          {sendingVerification ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Finding HR Contact...</> : <><Search className="w-4 h-4 mr-2" />Find {selectedEmail.company}'s HR Contact</>}
                        </Button>
                      )}

                      {selectedEmail && discoveredHREmail && !showAltVerification && (
                        <div className="space-y-4">
                          <div className="bg-white/[0.02] rounded-xl p-4 border border-white/10">
                            <p className="text-white/70 text-sm mb-2">We found this HR contact:</p>
                            <div className="flex items-center gap-3 bg-white/[0.02] rounded-lg p-3">
                              <Mail className="w-5 h-5 text-blue-400" />
                              <div className="flex-1">
                                <p className="text-white font-medium">{discoveredHREmail.email}</p>
                                <p className="text-white/50 text-xs">{discoveredHREmail.source}</p>
                              </div>
                            </div>
                          </div>
                          <Button onClick={handleSendToDiscoveredEmail} disabled={sendingVerification} className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl">
                            {sendingVerification ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <><Send className="w-4 h-4 mr-2" />Send Verification Request</>}
                          </Button>
                          <button onClick={() => { setDiscoveredHREmail(null); setShowAltVerification(true); }} className="w-full text-center text-white/50 hover:text-white/70 text-sm py-2">
                            Not your company's email? Try alternative verification →
                          </button>
                        </div>
                      )}

                      {selectedEmail && showAltVerification && (
                        <div className="space-y-4">
                          {hrSearchFailed && (
                            <div className="bg-orange-900/20 border border-orange-500/30 rounded-xl p-4">
                              <div className="flex items-center gap-2 text-orange-300">
                                <XCircle className="w-4 h-4" />
                                <p className="text-sm font-medium">Couldn't find HR contact for {selectedEmail.company}</p>
                              </div>
                            </div>
                          )}
                          <button onClick={() => { setShowAltVerification(false); setAltVerificationMethod(null); setWorkEmail(''); setUploadedDoc(null); setHrSearchFailed(false); }} className="text-white/50 hover:text-white flex items-center gap-1 text-sm">
                            <ArrowLeft className="w-4 h-4" /> Back
                          </button>

                          {!altVerificationMethod && (
                            <div className="space-y-3">
                              <button onClick={() => setAltVerificationMethod('work_email')} className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 text-left">
                                <div className="p-2 rounded-lg bg-blue-500/20"><Mail className="w-5 h-5 text-blue-400" /></div>
                                <div><p className="text-white font-medium">Work Email Verification</p><p className="text-white/50 text-sm">Verify using your {selectedEmail.domain} email</p></div>
                              </button>
                              <button onClick={() => setAltVerificationMethod('document')} className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 text-left">
                                <div className="p-2 rounded-lg bg-purple-500/20"><FileText className="w-5 h-5 text-purple-400" /></div>
                                <div><p className="text-white font-medium">Document Verification</p><p className="text-white/50 text-sm">Upload business documents for manual review</p></div>
                              </button>
                            </div>
                          )}

                          {altVerificationMethod === 'work_email' && (
                            <div className="space-y-4">
                              <button onClick={() => setAltVerificationMethod(null)} className="text-white/50 hover:text-white text-sm flex items-center gap-1"><ArrowLeft className="w-3 h-3" /> Back</button>
                              <div className="bg-white/[0.02] rounded-xl p-4 border border-white/10">
                                <p className="text-white/70 text-sm mb-3">Enter your work email at <span className="text-white font-medium">{selectedEmail.company}</span>:</p>
                                <Input type="email" placeholder={`you${selectedEmail.domain}`} value={workEmail} onChange={(e) => setWorkEmail(e.target.value)} className="bg-white/[0.02] border-white/10 text-white placeholder:text-white/30 rounded-xl" />
                              </div>
                              <Button onClick={handleWorkEmailVerification} disabled={sendingVerification || !workEmail.includes('@')} className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl">
                                {sendingVerification ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <><Send className="w-4 h-4 mr-2" />Send Verification Link</>}
                              </Button>
                            </div>
                          )}

                          {altVerificationMethod === 'document' && (
                            <div className="space-y-4">
                              <button onClick={() => setAltVerificationMethod(null)} className="text-white/50 hover:text-white text-sm flex items-center gap-1"><ArrowLeft className="w-3 h-3" /> Back</button>
                              <div className="bg-white/[0.02] rounded-xl p-4 border border-white/10">
                                <p className="text-white/70 text-sm mb-3">Upload official business documentation:</p>
                                {!uploadedDoc ? (
                                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-white/20 bg-white/[0.01]">
                                    <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleDocumentUpload} className="hidden" />
                                    {uploadingDoc ? <Loader2 className="w-6 h-6 text-white/40 animate-spin" /> : <><Upload className="w-6 h-6 text-white/40 mb-2" /><p className="text-white/50 text-sm">Click to upload</p></>}
                                  </label>
                                ) : (
                                  <div className="flex items-center gap-3 bg-white/[0.02] rounded-lg p-3">
                                    <FileText className="w-5 h-5 text-emerald-400" />
                                    <p className="text-white text-sm flex-1 truncate">{uploadedDoc.name}</p>
                                    <button onClick={() => setUploadedDoc(null)} className="text-white/50 hover:text-white"><XCircle className="w-4 h-4" /></button>
                                  </div>
                                )}
                              </div>
                              <Button onClick={handleDocumentVerification} disabled={sendingVerification || !uploadedDoc} className="w-full bg-purple-600 hover:bg-purple-500 text-white rounded-xl">
                                {sendingVerification ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : <><FileText className="w-4 h-4 mr-2" />Submit for Review</>}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!companyOptions.length && !searching && <p className="text-white/30 text-sm text-center py-4">Search for your company to begin verification</p>}
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Add Employee & Attestations - Only when verified */}
        {verified && (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 overflow-hidden mb-6">
                <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Add Employee</span>
                  </div>
                  <Button onClick={() => setShowAddEmployee(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl">
                    <UserPlus className="w-4 h-4 mr-2" />Add Employee
                  </Button>
                </div>
                {attestedEmployees.length > 0 && (
                  <div className="p-6">
                    <p className="text-white/50 text-sm mb-3">Attested by {verifiedWorkplace?.company} ({attestedEmployees.length})</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {attestedEmployees.map((candidate, idx) => {
                        const employer = candidate.employers?.find(emp => emp.manual_employer_attestation?.attested_by_company?.toLowerCase().includes(verifiedWorkplace?.company?.toLowerCase()));
                        const ma = employer?.manual_employer_attestation;
                        return (
                          <div key={candidate.id || idx} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                            <div>
                              <p className="text-white font-medium text-sm">{candidate.name}</p>
                              <p className="text-white/40 text-xs">{ma?.job_title && `${ma.job_title} • `}{new Date(ma?.attested_date).toLocaleDateString()}</p>
                            </div>
                            {ma?.attestation_uid && <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs"><CheckCircle className="w-3 h-3 mr-1" />On-chain</Badge>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="rounded-2xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-1">My Attestations</h3>
                    <p className="text-white/40 text-sm">View all on-chain attestations you've created</p>
                  </div>
                  <Link to={createPageUrl('MyAttestations')}>
                    <Button className="bg-white hover:bg-white/90 text-black font-medium rounded-xl">
                      View Attestations<ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* Info Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 p-6 mt-6">
            <h3 className="text-white font-medium mb-4 text-sm">About On-Chain Attestations</h3>
            <div className="space-y-2 text-white/40 text-sm">
              <p>On-chain attestations are permanent, tamper-proof records stored on Base blockchain using EAS.</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Cannot be altered or deleted</li>
                <li>Publicly verifiable by anyone</li>
                <li>Cryptographic proof of verification</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>

      <AddEmployeeModal isOpen={showAddEmployee} onClose={() => setShowAddEmployee(false)} verifiedWorkplace={verifiedWorkplace} onSuccess={() => { if (verifiedWorkplace?.company) fetchAttestedEmployees(verifiedWorkplace.company); }} />
    </section>
  );
}