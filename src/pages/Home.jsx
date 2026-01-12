import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, History, User, Briefcase, GraduationCap, Sparkles, ArrowLeft, ExternalLink, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import UploadZone from '@/components/upload/UploadZone';
import ScoreCircle from '@/components/score/ScoreCircle';
import AnalysisCard from '@/components/score/AnalysisCard';
import FlagsList from '@/components/score/FlagsList';
import CandidateCard from '@/components/candidates/CandidateCard';
import UpgradePrompt from '@/components/paywall/UpgradePrompt';

const TIER_LIMITS = {
  free: 3,
  starter: 50,
  professional: 200,
  enterprise: 999999
};

export default function Home() {
  const [currentView, setCurrentView] = useState('upload'); // 'upload', 'result', 'history'
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isRedirectingToLogin, setIsRedirectingToLogin] = useState(false);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      setIsAuthenticated(authenticated);
      if (authenticated) {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      }
      setAuthLoading(false);
    };
    checkAuth();
  }, []);
  
  const { data: userTeams = [] } = useQuery({
    queryKey: ['userTeams'],
    queryFn: async () => {
      if (!user) return [];
      const memberships = await base44.entities.TeamMember.filter({ 
        user_email: user.email,
        status: 'active'
      });
      return memberships;
    },
    enabled: isAuthenticated && !!user,
  });

  const { data: candidates = [], isLoading: candidatesLoading } = useQuery({
    queryKey: ['candidates', userTeams],
    queryFn: async () => {
      // Get personal scans
      const personalScans = await base44.entities.Candidate.list('-created_date', 50);
      
      // If enterprise user with team, get team scans too
      if (user?.subscription_tier === 'enterprise' && userTeams.length > 0) {
        const teamScans = await Promise.all(
          userTeams.map(membership => 
            base44.entities.Candidate.filter({ team_id: membership.team_id }, '-created_date', 50)
          )
        );
        const allTeamScans = teamScans.flat();
        
        // Combine and deduplicate
        const allScans = [...personalScans, ...allTeamScans];
        const uniqueScans = Array.from(new Map(allScans.map(s => [s.id, s])).values());
        return uniqueScans.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      }
      
      return personalScans;
    },
    enabled: isAuthenticated && !!user,
  });

  const analyzeResume = async (file) => {
    setIsUploading(true);
    
    try {
      // Check scan limit
      const userTier = user?.subscription_tier || 'free';
      const scansUsed = user?.scans_used || 0;
      const scanLimit = TIER_LIMITS[userTier];

      if (scansUsed >= scanLimit) {
        setIsUploading(false);
        setCurrentView('upgrade');
        return;
      }

      // Upload the file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Get team ID if enterprise user has a team
      let teamId = null;
      if (user?.subscription_tier === 'enterprise' && userTeams.length > 0) {
        teamId = userTeams[0].team_id;
      }

      // Create candidate record
      const candidate = await base44.entities.Candidate.create({
        resume_url: file_url,
        status: 'pending',
        team_id: teamId
      });
    
      // Determine analysis depth based on tier
      let analysisPrompt;
      
      if (userTier === 'free') {
        // Free tier: Very limited screening only
        analysisPrompt = `You are an initial resume screening assistant. Provide a VERY BASIC preliminary assessment of this resume.

        Provide ONLY:
        1. A simple overall legitimacy score (0-100)
        2. Brief scores for: consistency, experience, education, skills (all around 50-70 range unless something is obviously wrong)
        3. Identify 1-2 MAJOR red flags only (if any critical issues exist)
        4. Note 1-2 obvious green flags (if any clear positives exist)

        Keep ALL details EXTREMELY brief (1 short sentence each). This is a FREE tier scan with limited analysis.
        Summary should mention: "Limited free scan completed. Upgrade to Professional or Enterprise for comprehensive fraud detection, deep background checks, and detailed verification."`;
      } else if (userTier === 'starter') {
        // Starter tier: Basic analysis
        analysisPrompt = `You are an HR screening assistant. Provide a BASIC analysis of this resume for initial screening purposes.

        Evaluate these key aspects:
        1. **Overall Impression**: General legitimacy assessment
        2. **Basic Consistency**: Check for obvious timeline issues
        3. **Experience Overview**: High-level view of work history
        4. **Education Check**: Basic verification of educational background

        Identify obvious RED FLAGS such as:
        - Major timeline inconsistencies
        - Clearly unrealistic claims
        - Missing essential information

        Note positive GREEN FLAGS such as:
        - Clear career history
        - Recognized institutions
        - Measurable achievements

        Provide a basic overview analysis with moderate detail.`;
      } else {
        // Professional/Enterprise tier: Advanced analysis
        analysisPrompt = `You are an expert HR analyst and background verification specialist. Perform a COMPREHENSIVE and DETAILED analysis of this resume for legitimacy and authenticity.

        Evaluate the following aspects with DEEP ANALYSIS:
        1. **Consistency Score**: Thoroughly check for timeline gaps, overlapping dates, logical career progression, employment duration patterns
        2. **Experience Verification**: Deep assessment of job titles, responsibilities, achievements, company sizes, industry alignment, role complexity
        3. **Education Verification**: Comprehensive check of degrees, institutions reputation, graduation dates, academic achievements, certifications validity
        4. **Skills Alignment**: Detailed verification of skills matching experience, skill progression over time, technology stack currency, domain expertise

        Conduct ADVANCED CHECKS for:
        - Career trajectory analysis with industry benchmarks
        - Salary expectations vs experience level
        - Leadership progression indicators
        - Technical skill depth assessment
        - Cultural fit indicators
        - Potential overqualification or underqualification
        - Writing quality and attention to detail
        - Achievements quantification and believability
        - Reference quality indicators

        Look for RED FLAGS (comprehensive list):
        - Unrealistic career progression (e.g., Junior to CEO in 2 years)
        - Vague company descriptions or roles
        - Too many jobs in short periods (job hopping patterns)
        - Exaggerated achievements without specifics or metrics
        - Generic or buzzword-heavy descriptions
        - Mismatched skills and experience
        - Spelling/grammar inconsistencies in professional claims
        - Unverifiable institutions or certifications
        - Employment gaps without explanation
        - Inconsistent formatting or presentation
        - Outdated skills for claimed seniority
        - Missing critical information

        Look for GREEN FLAGS (comprehensive list):
        - Specific, measurable achievements with clear metrics
        - Consistent and logical career progression
        - Recognized institutions and reputable companies
        - Detailed, well-articulated role descriptions
        - Relevant, current certifications from known providers
        - Clear, professional contact information
        - Quantified results and business impact
        - Awards, publications, or patents
        - Demonstrated continuous learning
        - Strong online presence indicators
        - Recommendations or endorsements mentioned

        Provide an EXTENSIVE analysis with percentage scores, detailed reasoning, and actionable insights for each category.`;
      }

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          candidate_name: { type: "string" },
          candidate_email: { type: "string" },
          overall_score: { type: "number", description: "Overall legitimacy percentage 0-100" },
          consistency_score: { type: "number" },
          consistency_details: { type: "string", description: "Detailed explanation of the consistency score" },
          experience_verification: { type: "number" },
          experience_details: { type: "string", description: "Detailed explanation of the experience verification" },
          education_verification: { type: "number" },
          education_details: { type: "string", description: "Detailed explanation of the education verification" },
          skills_alignment: { type: "number" },
          skills_details: { type: "string", description: "Detailed explanation of the skills alignment" },
          red_flags: { type: "array", items: { type: "string" } },
          green_flags: { type: "array", items: { type: "string" } },
          summary: { type: "string", description: "Brief summary of the analysis" }
        },
        required: ["overall_score", "consistency_score", "experience_verification", "education_verification", "skills_alignment", "red_flags", "green_flags", "summary"]
      }
    });
    
      // Update candidate with analysis
      const updatedCandidate = await base44.entities.Candidate.update(candidate.id, {
        name: analysis.candidate_name || 'Unknown Candidate',
        email: analysis.candidate_email || '',
        legitimacy_score: analysis.overall_score,
        analysis: {
          consistency_score: analysis.consistency_score,
          consistency_details: analysis.consistency_details,
          experience_verification: analysis.experience_verification,
          experience_details: analysis.experience_details,
          education_verification: analysis.education_verification,
          education_details: analysis.education_details,
          skills_alignment: analysis.skills_alignment,
          skills_details: analysis.skills_details,
          red_flags: analysis.red_flags,
          green_flags: analysis.green_flags,
          summary: analysis.summary,
          is_basic: userTier === 'free' || userTier === 'starter'
        },
        status: 'analyzed'
      });
      
      // Increment scan count
      await base44.auth.updateMe({
        scans_used: (user?.scans_used || 0) + 1
      });

      // Refresh user data
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
      
      setIsUploading(false);
      setSelectedCandidate(updatedCandidate);
      setCurrentView('result');
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    } catch (error) {
      console.error('Analysis error:', error);
      setIsUploading(false);
      alert('Failed to analyze resume. Please try again.');
    }
  };

  const handleUpload = async (file) => {
    await analyzeResume(file);
  };

  const handleViewHistory = () => {
    const userTier = user?.subscription_tier || 'free';
    if (userTier === 'free') {
      setCurrentView('upgrade');
      return;
    }
    setCurrentView('history');
  };

  const handleSelectCandidate = (candidate) => {
    const userTier = user?.subscription_tier || 'free';
    if (userTier === 'free') {
      setCurrentView('upgrade');
      return;
    }
    setSelectedCandidate(candidate);
    setCurrentView('result');
  };

  const handleBack = () => {
    setCurrentView('upload');
    setSelectedCandidate(null);
  };

  const canUpload = () => {
    const userTier = user?.subscription_tier || 'free';
    const scansUsed = user?.scans_used || 0;
    const scanLimit = TIER_LIMITS[userTier];
    return scansUsed < scanLimit;
  };

  const handleLoginRedirect = () => {
    window.location.href = createPageUrl('Login');
  };

  if (authLoading || isRedirectingToLogin) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-4xl font-black bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent"
        >
          Indexios
        </motion.div>
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Landing page for non-authenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 pointer-events-none" />
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mb-8"
            >
              <span className="text-6xl md:text-7xl font-black bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent tracking-tight">
                Indexios
              </span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-3xl md:text-4xl font-bold text-white mb-4"
            >
              Resume Verification Platform
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-lg text-white/70 mb-8 leading-relaxed"
            >
              AI-powered verification to detect inconsistencies, validate credentials, 
              and score candidate legitimacy in seconds.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button
                onClick={handleLoginRedirect}
                size="lg"
                className="bg-white hover:bg-gray-100 text-black px-8 py-6 text-lg font-semibold rounded-xl shadow-lg"
              >
                Get Started
              </Button>
              <Button
                onClick={handleLoginRedirect}
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:text-white hover:bg-white/10 hover:border-white/40 px-8 py-6 text-lg rounded-xl"
              >
                Sign In
              </Button>
            </motion.div>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-16 grid sm:grid-cols-3 gap-6"
            >
              {[
                { icon: Shield, title: 'Fraud Detection', desc: 'Identify red flags and inconsistencies' },
                { icon: Sparkles, title: 'AI Analysis', desc: 'Powered by advanced language models' },
                { icon: Lock, title: 'Secure', desc: 'Your data stays private and protected' },
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                  className="bg-zinc-900/70 border border-zinc-700 rounded-xl p-6 text-center hover:border-zinc-600 transition-colors"
                >
                  <div className="inline-flex p-3 rounded-xl bg-white/5 mb-3">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                  <p className="text-zinc-400 text-sm">{feature.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h2 className="text-xl md:text-2xl font-semibold text-white mb-2">
            Resume Verification Platform
          </h2>
          <p className="text-white/60 max-w-md mx-auto">
            Upload a resume to scan for legitimacy
          </p>
        </motion.div>

        {/* Navigation */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="flex justify-center gap-3">
            <Button
              variant={currentView === 'upload' ? 'default' : 'outline'}
              onClick={handleBack}
              className={currentView === 'upload' 
                ? 'bg-white hover:bg-gray-100 text-black font-medium' 
                : 'border-white/20 bg-transparent text-white hover:text-white hover:bg-white/10 hover:border-white/40 [&_svg]:text-white'}
            >
              <Shield className="w-4 h-4 mr-2" />
              Scan Resume
            </Button>
            <Button
              variant={currentView === 'history' ? 'default' : 'outline'}
              onClick={handleViewHistory}
              className={currentView === 'history' 
                ? 'bg-white hover:bg-gray-100 text-black font-medium' 
                : 'border-white/20 bg-transparent text-white hover:text-white hover:bg-white/10 hover:border-white/40 [&_svg]:text-white'}
            >
              <History className="w-4 h-4 mr-2" />
              History
              {candidates.length > 0 && (
                <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs text-white">
                  {candidates.length}
                </span>
              )}
            </Button>
          </div>
          
          {/* Usage indicator */}
          <div className="text-center">
            <p className="text-white/60 text-sm">
              Scans used: <span className="font-bold text-white">{user?.scans_used || 0}</span> / {TIER_LIMITS[user?.subscription_tier || 'free']}
            </p>
            <Link to={createPageUrl('Pricing')}>
              <Button variant="link" className="text-white/80 hover:text-white text-xs p-0 h-auto">
                Upgrade Plan
              </Button>
            </Link>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Upload View */}
          {currentView === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {canUpload() ? (
                <UploadZone onUpload={handleUpload} isUploading={isUploading} />
              ) : (
                <UpgradePrompt
                  scansUsed={user?.scans_used || 0}
                  scansLimit={TIER_LIMITS[user?.subscription_tier || 'free']}
                  onUpgrade={() => window.location.href = createPageUrl('Pricing')}
                />
              )}
              
              {/* Recent scans preview - only for paid users */}
              {candidates.length > 0 && (user?.subscription_tier && user.subscription_tier !== 'free') && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-8"
                >
                  <h3 className="text-white/60 text-sm font-medium mb-3">Recent Scans</h3>
                  <div className="grid gap-3">
                    {candidates.slice(0, 3).map((candidate, index) => (
                      <CandidateCard
                        key={candidate.id}
                        candidate={candidate}
                        onClick={() => handleSelectCandidate(candidate)}
                        delay={index * 0.1}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Result View */}
          {currentView === 'result' && selectedCandidate && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <Button
                variant="ghost"
                onClick={handleBack}
                className="text-white hover:text-white hover:bg-white/10 -ml-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              
              {/* Candidate Header */}
              <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-800">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <ScoreCircle score={selectedCandidate.legitimacy_score || 0} />

                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {selectedCandidate.name || 'Unknown Candidate'}
                    </h2>
                    {selectedCandidate.email && (
                      <p className="text-white/60">{selectedCandidate.email}</p>
                    )}
                    {selectedCandidate.analysis?.is_basic && (
                      <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <p className="text-yellow-400 text-sm font-medium flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          Basic Analysis - Upgrade for comprehensive fraud detection and deep insights
                        </p>
                      </div>
                    )}
                    {selectedCandidate.analysis?.summary && (
                      <p className="text-white/70 mt-3 text-sm leading-relaxed">
                        {selectedCandidate.analysis.summary}
                      </p>
                    )}
                    {selectedCandidate.resume_url && (
                      <a
                        href={selectedCandidate.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-4 text-white hover:text-white/80 text-sm font-medium transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Resume
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Analysis Breakdown */}
              {selectedCandidate.analysis && (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <AnalysisCard
                      title="Consistency"
                      score={selectedCandidate.analysis.consistency_score || 0}
                      details={selectedCandidate.analysis.consistency_details}
                      icon={User}
                      delay={0}
                      isBasic={selectedCandidate.analysis.is_basic}
                    />
                    <AnalysisCard
                      title="Experience"
                      score={selectedCandidate.analysis.experience_verification || 0}
                      details={selectedCandidate.analysis.experience_details}
                      icon={Briefcase}
                      delay={0.1}
                      isBasic={selectedCandidate.analysis.is_basic}
                    />
                    <AnalysisCard
                      title="Education"
                      score={selectedCandidate.analysis.education_verification || 0}
                      details={selectedCandidate.analysis.education_details}
                      icon={GraduationCap}
                      delay={0.2}
                      isBasic={selectedCandidate.analysis.is_basic}
                    />
                    <AnalysisCard
                      title="Skills Alignment"
                      score={selectedCandidate.analysis.skills_alignment || 0}
                      details={selectedCandidate.analysis.skills_details}
                      icon={Sparkles}
                      delay={0.3}
                      isBasic={selectedCandidate.analysis.is_basic}
                    />
                  </div>

                  {selectedCandidate.analysis.is_basic && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-r from-emerald-900/20 to-teal-900/20 border border-emerald-500/30 rounded-xl p-6 text-center"
                    >
                      <Lock className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                      <h3 className="text-white font-semibold mb-2">Unlock Advanced Analysis</h3>
                      <p className="text-white/70 text-sm mb-4">
                        Get comprehensive fraud detection, deep background verification, career trajectory analysis, and risk assessment
                      </p>
                      <Link to={createPageUrl('Pricing')}>
                        <Button className="bg-white hover:bg-gray-100 text-black font-medium">
                          Upgrade Now
                        </Button>
                      </Link>
                    </motion.div>
                  )}

                  <FlagsList
                    redFlags={selectedCandidate.analysis.red_flags || []}
                    greenFlags={selectedCandidate.analysis.green_flags || []}
                    isBasic={selectedCandidate.analysis.is_basic}
                  />
                </>
              )}
            </motion.div>
          )}

          {/* Upgrade View */}
          {currentView === 'upgrade' && (
            <motion.div
              key="upgrade"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Button
                variant="ghost"
                onClick={handleBack}
                className="mb-6 text-white hover:text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <UpgradePrompt
                scansUsed={user?.scans_used || 0}
                scansLimit={TIER_LIMITS[user?.subscription_tier || 'free']}
                onUpgrade={() => window.location.href = createPageUrl('Pricing')}
                reason={(user?.scans_used || 0) >= TIER_LIMITS[user?.subscription_tier || 'free'] ? 'scan limit' : 'feature access'}
              />
            </motion.div>
          )}

          {/* History View */}
          {currentView === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {candidatesLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              ) : candidates.length > 0 ? (
                <div className="grid gap-3">
                  {candidates.map((candidate, index) => (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      onClick={() => handleSelectCandidate(candidate)}
                      delay={index * 0.05}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="p-4 rounded-2xl bg-zinc-900 inline-block mb-4">
                    <History className="w-8 h-8 text-white/40" />
                  </div>
                  <p className="text-white/60">No scanned resumes yet</p>
                  <Button
                    onClick={handleBack}
                    className="mt-4 bg-white hover:bg-gray-100 text-black font-medium"
                  >
                    Scan your first resume
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}