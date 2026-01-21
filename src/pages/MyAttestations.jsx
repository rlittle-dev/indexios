import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Shield, ExternalLink, User, Building2, Calendar, ArrowLeft, Loader2, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function MyAttestations() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attestations, setAttestations] = useState([]);
  const [fetchingAttestations, setFetchingAttestations] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          const currentUser = await base44.auth.me();
          setUser(currentUser);
          
          if (currentUser.subscription_tier === 'enterprise') {
            await fetchAttestations(currentUser.email);
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const fetchAttestations = async (userEmail) => {
    setFetchingAttestations(true);
    try {
      // Fetch all UniqueCandidate records that have attestations
      const candidates = await base44.entities.UniqueCandidate.filter({});
      
      // Filter candidates that have attestation UIDs and group attestations
      const attestationData = [];
      
      for (const candidate of candidates) {
        // Check for candidate-level attestation
        if (candidate.attestation_uid) {
          attestationData.push({
            candidateId: candidate.id,
            candidateName: candidate.name,
            candidateEmail: candidate.email,
            attestationUID: candidate.attestation_uid,
            attestationDate: candidate.attestation_date,
            employers: candidate.employers?.filter(emp => emp.attestation_uid || emp.call_verification_status !== 'not_called') || [],
            type: 'candidate'
          });
        }
        
        // Check for employer-level attestations
        if (candidate.employers) {
          for (const employer of candidate.employers) {
            if (employer.attestation_uid && employer.attestation_uid !== candidate.attestation_uid) {
              attestationData.push({
                candidateId: candidate.id,
                candidateName: candidate.name,
                candidateEmail: candidate.email,
                employerName: employer.employer_name,
                attestationUID: employer.attestation_uid,
                attestationDate: employer.call_verified_date || employer.email_verified_date,
                verificationStatus: employer.call_verification_status || employer.email_verification_status,
                type: 'employer'
              });
            }
          }
        }
      }
      
      // Sort by date, most recent first
      attestationData.sort((a, b) => {
        const dateA = a.attestationDate ? new Date(a.attestationDate) : new Date(0);
        const dateB = b.attestationDate ? new Date(b.attestationDate) : new Date(0);
        return dateB - dateA;
      });
      
      setAttestations(attestationData);
    } catch (error) {
      console.error('Error fetching attestations:', error);
    }
    setFetchingAttestations(false);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      yes: { color: 'bg-green-500/20 text-green-300', icon: CheckCircle, label: 'Verified' },
      no: { color: 'bg-red-500/20 text-red-300', icon: XCircle, label: 'Denied' },
      refused_to_disclose: { color: 'bg-orange-500/20 text-orange-300', icon: HelpCircle, label: 'Refused' },
      inconclusive: { color: 'bg-zinc-500/20 text-zinc-300', icon: HelpCircle, label: 'Inconclusive' }
    };
    
    const config = statusMap[status?.toLowerCase()] || statusMap.inconclusive;
    const Icon = config.icon;
    
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
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
            
            <p className="text-white/70 text-lg mb-8">
              My Attestations is available for Enterprise plan subscribers only.
            </p>
            
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
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
        {/* Back Button */}
        <Link to={createPageUrl('AttestationPortal')}>
          <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Portal
          </Button>
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex p-3 rounded-full bg-purple-500/20 mb-4">
            <Shield className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            My Attestations
          </h1>
          <p className="text-white/60 max-w-xl mx-auto">
            All on-chain employment verifications created through your account
          </p>
        </motion.div>

        {/* Attestations List */}
        {fetchingAttestations ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        ) : attestations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-12 text-center"
          >
            <Shield className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-white text-lg font-medium mb-2">No Attestations Yet</h3>
            <p className="text-white/60 text-sm mb-6">
              You haven't created any on-chain attestations yet. Start by verifying employment for a candidate.
            </p>
            <Link to={createPageUrl('Scan')}>
              <Button className="bg-purple-600 hover:bg-purple-500 text-white">
                Scan a Resume
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {attestations.map((attestation, index) => (
              <motion.div
                key={attestation.attestationUID || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Candidate Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-purple-400" />
                      <span className="text-white font-medium">{attestation.candidateName}</span>
                      {attestation.candidateEmail && (
                        <span className="text-white/50 text-sm">({attestation.candidateEmail})</span>
                      )}
                    </div>
                    
                    {attestation.employerName && (
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-4 h-4 text-blue-400" />
                        <span className="text-white/80">{attestation.employerName}</span>
                        {attestation.verificationStatus && getStatusBadge(attestation.verificationStatus)}
                      </div>
                    )}
                    
                    {attestation.attestationDate && (
                      <div className="flex items-center gap-2 text-white/50 text-sm">
                        <Calendar className="w-3 h-3" />
                        {new Date(attestation.attestationDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    )}
                  </div>

                  {/* Attestation UID & Link */}
                  <div className="flex flex-col items-end gap-2">
                    <Badge className="bg-green-500/20 text-green-300 font-mono text-xs">
                      On-Chain
                    </Badge>
                    <a
                      href={`https://base.easscan.org/attestation/view/${attestation.attestationUID}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm transition-colors"
                    >
                      View on EAS
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <code className="text-white/40 text-xs font-mono truncate max-w-[200px]">
                      {attestation.attestationUID?.slice(0, 10)}...{attestation.attestationUID?.slice(-8)}
                    </code>
                  </div>
                </div>

                {/* Employer list for candidate-type attestations */}
                {attestation.type === 'candidate' && attestation.employers?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <p className="text-white/50 text-xs mb-2">Verified Employers:</p>
                    <div className="flex flex-wrap gap-2">
                      {attestation.employers.map((emp, idx) => (
                        <Badge 
                          key={idx} 
                          variant="outline" 
                          className="text-white/70 border-zinc-700"
                        >
                          {emp.employer_name}
                          {emp.call_verification_status === 'yes' && (
                            <CheckCircle className="w-3 h-3 ml-1 text-green-400" />
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {attestations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
          >
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-white">{attestations.length}</p>
                <p className="text-white/50 text-sm">Total Attestations</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">
                  {attestations.filter(a => a.verificationStatus === 'yes').length}
                </p>
                <p className="text-white/50 text-sm">Verified</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-400">
                  {new Set(attestations.map(a => a.candidateId)).size}
                </p>
                <p className="text-white/50 text-sm">Unique Candidates</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}