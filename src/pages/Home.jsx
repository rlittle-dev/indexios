import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, History, User, Briefcase, GraduationCap, Sparkles, ArrowLeft, ExternalLink, Lock, Download, Share2, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import UploadZone from '@/components/upload/UploadZone';
import ScoreCircle from '@/components/score/ScoreCircle';
import AnalysisCard from '@/components/score/AnalysisCard';
import FlagsList from '@/components/score/FlagsList';
import CandidateCard from '@/components/candidates/CandidateCard';
import UpgradePrompt from '@/components/paywall/UpgradePrompt';
import NextSteps from '@/components/score/NextSteps';

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
      } else {
        // Get anonymous scan count
        try {
          const { data } = await base44.functions.invoke('getAnonymousScans');
          setUser({ scans_used: data.scansUsed, subscription_tier: 'free' });
        } catch (error) {
          console.error('Error fetching anonymous scans:', error);
          setUser({ scans_used: 0, subscription_tier: 'free' });
        }
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
      // Get personal scans created by this user
      const personalScans = await base44.entities.Candidate.filter({ created_by: user.email }, '-created_date', 50);
      
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
      // Check scan limit for anonymous users
      if (!isAuthenticated) {
        const trackResponse = await base44.functions.invoke('trackAnonymousScan');
        if (!trackResponse.data.allowed) {
          setIsUploading(false);
          alert('Free scan limit reached. Please sign up to continue scanning resumes.');
          setCurrentView('upgrade');
          return;
        }
        // Update local user state
        setUser(prev => ({ ...prev, scans_used: trackResponse.data.scansUsed }));
      } else {
        // Check scan limit for authenticated users
        const userTier = user?.subscription_tier || 'free';
        const scansUsed = user?.scans_used || 0;
        const scanLimit = TIER_LIMITS[userTier];

        if (scansUsed >= scanLimit) {
          setIsUploading(false);
          setCurrentView('upgrade');
          return;
        }
      }

      // Upload the file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Get team ID if enterprise user has a team
      let teamId = null;
      if (user?.subscription_tier === 'enterprise' && userTeams.length > 0) {
        teamId = userTeams[0].team_id;
      }

      // Only create candidate record for authenticated users
      let candidate = null;
      if (isAuthenticated) {
        candidate = await base44.entities.Candidate.create({
          resume_url: file_url,
          status: 'pending',
          team_id: teamId
        });
      }
    
      // Determine analysis depth based on tier
      const userTier = user?.subscription_tier || 'free';
      let analysisPrompt;
      
      if (userTier === 'free') {
        // Free tier: Same rigorous analysis, but frontend will limit detail visibility
        analysisPrompt = `You are an expert fraud detection analyst. Perform RIGOROUS, REPRODUCIBLE analysis with strict consistency.

CRITICAL CONSISTENCY RULES FOR REPRODUCIBILITY:
- ALWAYS extract exact name/email from resume text
- Apply IDENTICAL methodology to every resume
- Score independently before reviewing
- Use explicit rubric - removes subjectivity
- Scoring should be 100% reproducible

DETAILED SCORING RUBRIC:

OVERALL LEGITIMACY SCORE (0-100):
90-100: Exceptional. Clear progression, specific achievements, verified institutions, consistent narrative
75-89: Strong. Good progression, measurable results, recognized orgs, minor gaps <2 months
60-74: Acceptable. Decent progression, some vagueness, identifiable institutions, gaps 2-6 months
45-59: Concerning. Inconsistencies, vague claims, generic descriptions, gaps 6+ months or overlapping dates
30-44: High Risk. Multiple red flags, unrealistic claims, unverifiable info, poor narrative cohesion
<30: Critical. Likely fraud indicators, fabricated credentials, severe inconsistencies

CONSISTENCY SCORE (0-100):
90-100: Perfect alignment - all dates, companies, roles form logical narrative, no overlaps
75-89: Very good - minor gaps <1 month, clear transitions, credible narrative
60-74: Acceptable - gaps 1-3 months, logical but some unexplained transitions
45-59: Problematic - gaps 3-6 months, role overlaps, some narrative issues
30-44: Serious - major gaps >6 months, significant overlaps, unclear progressions
<30: Critical - impossible timeline, severe overlaps, fabrication indicators

EXPERIENCE VERIFICATION (0-100):
90-100: Specific metrics (20% growth, $5M revenue), quantified impact, realistic scope for tenure
75-89: Clear measurable results (improved processes, led teams), appropriate complexity
60-74: Decent descriptions with some metrics, reasonable achievements for level
45-59: Generic descriptions (responsible for...), limited metrics, questionable impact
30-44: Vague claims without evidence, inflated for experience level, unclear value-add
<30: Clearly fabricated achievements, impossible claims, nonsensical responsibilities

EDUCATION VERIFICATION (0-100):
90-100: Ivy League/Top 100 schools, graduation dates align with experience, relevant degrees
75-89: Well-known regional schools, dates reasonable, degree/experience aligned
60-74: Recognized schools, dates mostly clear, some timeline questions
45-59: Lesser-known institutions, date ambiguity, degree/experience misalignment
30-44: Difficult to verify schools, likely credential issues, major timeline conflicts
<30: Likely fabricated degrees, non-existent institutions, impossible timeline

SKILLS ALIGNMENT (0-100):
90-100: Skills progression evident, tools/languages match role/era, expertise depth shown
75-89: Skills mostly align with roles, reasonable progression, appropriate for level
60-74: Skills generally match, some gaps in progression, adequate for experience
45-59: Skills poorly explained, gaps between claimed expertise and evidence
30-44: Major mismatches (claims Java expert with no relevant roles), unexplained skills
<30: Contradictory skills/experience, likely false proficiency claims

METHODOLOGY:
1. Map employment timeline with exact dates - identify gaps/overlaps
2. Extract specific metrics from achievements - count generic vs quantified claims
3. Verify education institutions and dates - cross-reference with employment
4. Track skill introduction - do skills logically appear when claimed?
5. Assess narrative coherence - does career flow make logical sense?
6. Look for inflation indicators - claims beyond realistic scope

RED FLAGS TO IDENTIFY:
- Timeline gaps >6 months without explanation
- Employment date overlaps (same dates at 2+ companies)
- Unrealistic career leaps (junior→CEO in 2 years)
- Vague descriptions hiding lack of real achievement
- Skills appearing without relevant experience
- Unverifiable companies/institutions
- Inconsistent formatting suggesting edits/fabrication
- Generic buzzwords replacing specifics
- Achievements too grand for tenure/role
- Educational timeline conflicting with employment

GREEN FLAGS TO IDENTIFY:
- Specific metrics and quantified results
- Clear career progression with logical transitions
- Recognizable, verifiable companies/institutions
- Skills demonstrated through relevant roles
- Consistent, detailed formatting
- Publications, certifications, awards
- Professional development trajectory
- Realistic tenure at companies (2+ years typical)
- Detailed project/achievement descriptions

Provide scores for all 4 categories. Thoroughly justify each score with specific evidence.
NEXT STEPS: 3-5 verification actions (reference checks, credential verification, etc.)
INTERVIEW QUESTIONS: 5-7 questions targeting any red flags or verifying impressive claims`;
      } else if (userTier === 'starter') {
        // Starter tier: Basic analysis
        analysisPrompt = `You are an HR screening specialist. Score this resume with STRICT, CONSISTENT methodology.

CRITICAL CONSISTENCY RULES:
- ALWAYS extract exact name from resume
- ALWAYS extract email if present
- Apply identical scoring approach to every resume
- Use explicit rubric below
- Identical resume = identical scores every time

DETAILED SCORING RUBRIC:
OVERALL SCORE (0-100):
- 85-100: Strong candidate, no major red flags, clear progression
- 70-84: Good candidate, minor inconsistencies/gaps acceptable
- 55-69: Acceptable but concerns present, needs clarification
- 40-54: Significant concerns, multiple issues present
- 0-39: Critical issues, likely fraudulent or severely problematic

CATEGORY SCORES (0-100 each):
Consistency Score:
- 80+: Perfect timeline, clear career progression, all dates align
- 60-79: Minor gaps <3 months or slight role overlaps, logical flow
- 40-59: Unexplained gaps 3-6 months, questionable transitions
- 20-39: Major gaps >6 months, unrealistic progression
- <20: Severe inconsistencies, overlapping employment

Experience Verification:
- 80+: Specific metrics, measurable results, realistic scope
- 60-79: Clear job descriptions, some specifics, appropriate seniority
- 40-59: Generic descriptions, limited metrics, vague responsibilities
- 20-39: Highly vague, questionable achievements, role mismatch
- <20: Fabricated or unrealistic claims

Education Verification:
- 80+: Recognizable institutions, clear dates, aligned with experience
- 60-79: Known schools, realistic dates, mostly verifiable
- 40-59: Less known institutions, dates unclear, some misalignment
- 20-39: Unverifiable institutions, degree/date issues
- <20: Likely fabricated education

Skills Alignment:
- 80+: Skills perfectly match experience, progression clear
- 60-79: Skills mostly align, reasonable development shown
- 40-59: Some skill gaps, limited evidence of claimed proficiency
- 20-39: Major skill mismatches, claimed expertise unsupported
- <20: Skills contradictory to experience

Identify 3-5 red flags if present. Note 2-3 green flags if strong.`;
      } else {
        // Professional/Enterprise tier: Advanced analysis
        analysisPrompt = `You are an expert fraud detection analyst. Perform RIGOROUS, REPRODUCIBLE analysis with strict consistency.

CRITICAL CONSISTENCY RULES FOR REPRODUCIBILITY:
- ALWAYS extract exact name/email from resume text
- Apply IDENTICAL methodology to every resume
- Score independently before reviewing
- Use explicit rubric - removes subjectivity
- Scoring should be 100% reproducible

DETAILED SCORING RUBRIC:

OVERALL LEGITIMACY SCORE (0-100):
90-100: Exceptional. Clear progression, specific achievements, verified institutions, consistent narrative
75-89: Strong. Good progression, measurable results, recognized orgs, minor gaps <2 months
60-74: Acceptable. Decent progression, some vagueness, identifiable institutions, gaps 2-6 months
45-59: Concerning. Inconsistencies, vague claims, generic descriptions, gaps 6+ months or overlapping dates
30-44: High Risk. Multiple red flags, unrealistic claims, unverifiable info, poor narrative cohesion
<30: Critical. Likely fraud indicators, fabricated credentials, severe inconsistencies

CONSISTENCY SCORE (0-100):
90-100: Perfect alignment - all dates, companies, roles form logical narrative, no overlaps
75-89: Very good - minor gaps <1 month, clear transitions, credible narrative
60-74: Acceptable - gaps 1-3 months, logical but some unexplained transitions
45-59: Problematic - gaps 3-6 months, role overlaps, some narrative issues
30-44: Serious - major gaps >6 months, significant overlaps, unclear progressions
<30: Critical - impossible timeline, severe overlaps, fabrication indicators

EXPERIENCE VERIFICATION (0-100):
90-100: Specific metrics (20% growth, $5M revenue), quantified impact, realistic scope for tenure
75-89: Clear measurable results (improved processes, led teams), appropriate complexity
60-74: Decent descriptions with some metrics, reasonable achievements for level
45-59: Generic descriptions (responsible for...), limited metrics, questionable impact
30-44: Vague claims without evidence, inflated for experience level, unclear value-add
<30: Clearly fabricated achievements, impossible claims, nonsensical responsibilities

EDUCATION VERIFICATION (0-100):
90-100: Ivy League/Top 100 schools, graduation dates align with experience, relevant degrees
75-89: Well-known regional schools, dates reasonable, degree/experience aligned
60-74: Recognized schools, dates mostly clear, some timeline questions
45-59: Lesser-known institutions, date ambiguity, degree/experience misalignment
30-44: Difficult to verify schools, likely credential issues, major timeline conflicts
<30: Likely fabricated degrees, non-existent institutions, impossible timeline

SKILLS ALIGNMENT (0-100):
90-100: Skills progression evident, tools/languages match role/era, expertise depth shown
75-89: Skills mostly align with roles, reasonable progression, appropriate for level
60-74: Skills generally match, some gaps in progression, adequate for experience
45-59: Skills poorly explained, gaps between claimed expertise and evidence
30-44: Major mismatches (claims Java expert with no relevant roles), unexplained skills
<30: Contradictory skills/experience, likely false proficiency claims

METHODOLOGY:
1. Map employment timeline with exact dates - identify gaps/overlaps
2. Extract specific metrics from achievements - count generic vs quantified claims
3. Verify education institutions and dates - cross-reference with employment
4. Track skill introduction - do skills logically appear when claimed?
5. Assess narrative coherence - does career flow make logical sense?
6. Look for inflation indicators - claims beyond realistic scope

RED FLAGS TO IDENTIFY:
- Timeline gaps >6 months without explanation
- Employment date overlaps (same dates at 2+ companies)
- Unrealistic career leaps (junior→CEO in 2 years)
- Vague descriptions hiding lack of real achievement
- Skills appearing without relevant experience
- Unverifiable companies/institutions
- Inconsistent formatting suggesting edits/fabrication
- Generic buzzwords replacing specifics
- Achievements too grand for tenure/role
- Educational timeline conflicting with employment

GREEN FLAGS TO IDENTIFY:
- Specific metrics and quantified results
- Clear career progression with logical transitions
- Recognizable, verifiable companies/institutions
- Skills demonstrated through relevant roles
- Consistent, detailed formatting
- Publications, certifications, awards
- Professional development trajectory
- Realistic tenure at companies (2+ years typical)
- Detailed project/achievement descriptions

Provide scores for all 4 categories. Thoroughly justify each score with specific evidence.
NEXT STEPS: 3-5 verification actions (reference checks, credential verification, etc.)
INTERVIEW QUESTIONS: 5-7 questions targeting any red flags or verifying impressive claims`;
      }

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          candidate_name: { 
            type: "string",
            description: "Extract the candidate's full name EXACTLY as written on the resume. Look in header, top section, or contact area. ALWAYS provide this field."
          },
          candidate_email: { 
            type: "string",
            description: "Extract the email address EXACTLY as written if it appears anywhere on the resume (header, contact, footer, signature). If no email found, return empty string."
          },
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
          summary: { type: "string", description: "Brief summary of the analysis" },
          next_steps: { type: "array", items: { type: "string" }, description: "Recommended next steps for hiring process" },
          interview_questions: { type: "array", items: { type: "string" }, description: "Suggested interview questions" }
        },
        required: ["overall_score", "consistency_score", "experience_verification", "education_verification", "skills_alignment", "red_flags", "green_flags", "summary", "next_steps", "interview_questions"]
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
          next_steps: analysis.next_steps || [],
          interview_questions: analysis.interview_questions || [],
          is_basic: userTier === 'free' || userTier === 'starter'
        },
        status: 'analyzed'
        });

        // Increment scan count for authenticated users only
        if (isAuthenticated) {
        await base44.auth.updateMe({
          scans_used: (user?.scans_used || 0) + 1
        });

        // Refresh user data
        const updatedUser = await base44.auth.me();
        setUser(updatedUser);
        }
      
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
    base44.auth.redirectToLogin();
  };

  const handleDownload = async (candidate) => {
    const userTier = user?.subscription_tier || 'free';
    if (userTier === 'free') {
      setCurrentView('upgrade');
      return;
    }

    // Create a text report
    const report = `
INDEXIOS RESUME ANALYSIS REPORT
================================

Candidate: ${candidate.name || 'Unknown'}
Email: ${candidate.email || 'N/A'}
Scan Date: ${new Date(candidate.created_date).toLocaleDateString()}

LEGITIMACY SCORE: ${candidate.legitimacy_score}%

ANALYSIS BREAKDOWN
------------------
Consistency: ${candidate.analysis?.consistency_score || 0}%
${candidate.analysis?.consistency_details || ''}

Experience: ${candidate.analysis?.experience_verification || 0}%
${candidate.analysis?.experience_details || ''}

Education: ${candidate.analysis?.education_verification || 0}%
${candidate.analysis?.education_details || ''}

Skills Alignment: ${candidate.analysis?.skills_alignment || 0}%
${candidate.analysis?.skills_details || ''}

RED FLAGS
---------
${candidate.analysis?.red_flags?.map((flag, i) => `${i + 1}. ${flag}`).join('\n') || 'None detected'}

GREEN FLAGS
-----------
${candidate.analysis?.green_flags?.map((flag, i) => `${i + 1}. ${flag}`).join('\n') || 'None detected'}

SUMMARY
-------
${candidate.analysis?.summary || 'N/A'}

---
Report generated by Indexios Resume Verification Platform
    `.trim();

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `indexios-scan-${candidate.name?.replace(/\s+/g, '-') || 'candidate'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async (candidate) => {
    const userTier = user?.subscription_tier || 'free';
    if (userTier === 'free') {
      setCurrentView('upgrade');
      return;
    }

    const shareUrl = `${window.location.origin}${createPageUrl('SharedReport')}?id=${candidate.id}`;
    const shareText = `Resume Analysis for ${candidate.name || 'Candidate'}\nLegitimacy Score: ${candidate.legitimacy_score}%\n\nView full report: ${shareUrl}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Indexios Scan - ${candidate.name || 'Candidate'}`,
          text: shareText,
          url: shareUrl
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Share failed:', error);
        }
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      alert('Report link copied to clipboard!');
    }
  };

  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => base44.entities.Folder.filter({ user_email: user?.email }),
    enabled: isAuthenticated && !!user,
  });

  const handleSaveToFolder = async (candidate, folderId) => {
    if (!isAuthenticated || !user) {
      alert('Please sign in to save candidates');
      return;
    }

    const userTier = user?.subscription_tier || 'free';
    if (userTier === 'free') {
      setCurrentView('upgrade');
      return;
    }

    try {
      await base44.entities.SavedCandidate.create({
        candidate_id: candidate.id,
        folder_id: folderId,
        user_email: user.email
      });
      alert('Candidate saved to folder!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save candidate');
    }
  };

  if (authLoading || isRedirectingToLogin) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-4xl font-black bg-gradient-to-r from-purple-400 to-white bg-clip-text text-transparent"
        >
          Indexios
        </motion.div>
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Free Tier Banner */}
        {(!user?.subscription_tier || user?.subscription_tier === 'free') && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-red-900/40 to-red-800/40 border-2 border-red-500/60 rounded-xl p-4 mb-6 shadow-lg"
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="bg-red-500 rounded-full p-2">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-red-200 font-bold text-sm">
                    {isAuthenticated ? 'FREE PLAN - Limited Analysis' : 'Try 3 Free Scans - No Login Required'}
                  </p>
                  <p className="text-white/80 text-xs">
                    {isAuthenticated ? 'Basic feedback only' : 'Sign up for unlimited access'}
                  </p>
                </div>
              </div>
              {isAuthenticated ? (
                <Link to={createPageUrl('Pricing')}>
                  <Button size="sm" className="bg-red-500 hover:bg-red-400 text-white font-bold">
                    Upgrade for Advanced Analysis →
                  </Button>
                </Link>
              ) : (
                <Button 
                  size="sm" 
                  onClick={handleLoginRedirect}
                  className="bg-white hover:bg-gray-100 text-black font-bold"
                >
                  Sign Up Free →
                </Button>
              )}
            </div>
          </motion.div>
        )}

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
              Scans used: <span className="font-bold text-white">{user?.scans_used || 0}</span> / {user?.subscription_tier === 'enterprise' ? '∞' : TIER_LIMITS[user?.subscription_tier || 'free']}
            </p>
            {isAuthenticated ? (
              <Link to={createPageUrl('Pricing')}>
                <Button variant="link" className="text-white/80 hover:text-white text-xs p-0 h-auto">
                  {user?.subscription_tier === 'enterprise' ? 'View Plans' : 'Upgrade Plan'}
                </Button>
              </Link>
            ) : (
              <Button 
                variant="link" 
                onClick={handleLoginRedirect}
                className="text-white/80 hover:text-white text-xs p-0 h-auto"
              >
                Sign Up for More
              </Button>
            )}
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
              {/* Bulk Upload for Enterprise */}
              {user?.subscription_tier === 'enterprise' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-2 border-purple-500/60 rounded-xl p-5 mb-6"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="bg-purple-500 rounded-full p-2">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-purple-200 font-bold text-sm mb-1">Enterprise Bulk Upload</p>
                      <p className="text-white/80 text-xs mb-3">
                        Upload 5+ resumes at once. Your analyses will be compiled into a downloadable document.
                      </p>
                      <input
                        type="file"
                        accept=".pdf"
                        multiple
                        onChange={async (e) => {
                          const files = Array.from(e.target.files);
                          if (files.length < 5) {
                            alert('Please select at least 5 files for bulk upload');
                            e.target.value = '';
                            return;
                          }
                          setIsUploading(true);
                          try {
                            // Upload all files first
                            const uploadPromises = files.map(file => 
                              base44.integrations.Core.UploadFile({ file })
                            );
                            const uploads = await Promise.all(uploadPromises);
                            const fileUrls = uploads.map(u => u.file_url);

                            // Send URLs for bulk analysis
                            const response = await base44.functions.invoke('bulkAnalyze', { fileUrls });

                            const blob = new Blob([response.data], { type: 'application/pdf' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `bulk-analysis-${Date.now()}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                            alert('Bulk analysis complete! Download started.');
                          } catch (error) {
                            console.error('Bulk analysis error:', error);
                            alert('Failed to process bulk upload. Please try again.');
                          }
                          setIsUploading(false);
                          e.target.value = '';
                        }}
                        className="hidden"
                        id="bulk-upload"
                      />
                      <label htmlFor="bulk-upload">
                        <Button 
                          size="sm" 
                          className="bg-purple-500 hover:bg-purple-400 text-white font-semibold cursor-pointer"
                          asChild
                        >
                          <span>Select 5+ Files for Bulk Analysis</span>
                        </Button>
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}

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
                        onDownload={handleDownload}
                        onShare={handleShare}
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
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  className="text-white hover:text-white hover:bg-white/10 -ml-2"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                
                <div className="flex gap-2">
                  {folders.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleSaveToFolder(selectedCandidate, e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="bg-zinc-800 border border-white/20 text-white rounded-md px-3 py-2 text-sm hover:bg-zinc-700"
                    >
                      <option value="">Save to folder...</option>
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => handleShare(selectedCandidate)}
                    className="border-white/20 bg-transparent text-white hover:text-white hover:bg-white/10 hover:border-white/40"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(selectedCandidate)}
                    className="border-white/20 bg-transparent text-white hover:text-white hover:bg-white/10 hover:border-white/40"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>

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
                    {selectedCandidate.analysis?.is_basic && user?.subscription_tier !== 'free' && (
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

              {/* Free Tier Upgrade Prompt */}
              {selectedCandidate.analysis?.is_basic && (
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

                  <FlagsList
                    redFlags={selectedCandidate.analysis.red_flags || []}
                    greenFlags={selectedCandidate.analysis.green_flags || []}
                    isBasic={selectedCandidate.analysis.is_basic}
                  />

                  <NextSteps
                    nextSteps={selectedCandidate.analysis.next_steps}
                    interviewQuestions={selectedCandidate.analysis.interview_questions}
                    isLocked={user?.subscription_tier === 'free' || user?.subscription_tier === 'starter'}
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
                  <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : candidates.length > 0 ? (
                <div className="grid gap-3">
                  {candidates.map((candidate, index) => (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      onClick={() => handleSelectCandidate(candidate)}
                      onDownload={handleDownload}
                      onShare={handleShare}
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