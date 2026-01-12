import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, History, User, Briefcase, GraduationCap, Sparkles, ArrowLeft, ExternalLink, Lock, Download, Share2, FolderPlus, CheckCircle2, Mail } from 'lucide-react';
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
import { toast } from 'sonner';

const TIER_LIMITS = {
  free: 3,
  starter: 50,
  professional: 200,
  enterprise: 999999
};

export default function Home() {
  const [currentView, setCurrentView] = useState('upload'); // 'upload', 'result', 'history', 'bulk-results'
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [bulkResults, setBulkResults] = useState([]);
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
      
      // Load bulk results from localStorage if available
      const stored = localStorage.getItem('bulkResults');
      if (stored) {
        setBulkResults(JSON.parse(stored));
      }
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
        analysisPrompt = `You are an expert fraud detection analyst. Perform RIGOROUS, REPRODUCIBLE analysis with strict consistency. BE HARSH ON SPARSE/GENERIC RESUMES.

CURRENT DATE FOR CONTEXT: ${new Date().toISOString().split('T')[0]} (use this to evaluate if dates are past, present, or future)

CRITICAL CONSISTENCY RULES FOR REPRODUCIBILITY:
- ALWAYS extract exact name/email from resume text
- Apply IDENTICAL methodology to every resume
- Score independently before reviewing
- Use explicit rubric - removes subjectivity
- Scoring should be 100% reproducible
- BE RIGOROUS: Only high scores (75+) for candidates with rich, specific, verifiable details

DETAILED SCORING RUBRIC (BE HARSH ON SPARSE/VAGUE CANDIDATES):

OVERALL LEGITIMACY SCORE (0-100):
90-100: Exceptional. Multiple specific achievements with metrics, clear career progression, elite/verified institutions, zero inconsistencies. Demonstrates genuine expertise depth.
75-89: Strong. Specific achievements with some metrics, logical progression, recognized institutions, minor gaps <1 month. Clearly qualified.
60-74: Acceptable. Some specific details, mostly logical progression, identifiable institutions, minor timeline issues. Credible but not exceptional.
45-59: Concerning. Generic descriptions dominate, vague claims, unverifiable companies, gaps/overlaps, inconsistencies present.
30-44: High Risk. Multiple red flags, inflated claims, unverifiable institutions, major timeline issues, poor narrative.
<30: Critical. Likely fraud - fabricated credentials, impossible timeline, severe inconsistencies.

CONSISTENCY SCORE (0-100):
90-100: Perfect alignment - precise dates, no gaps/overlaps, clear logical transitions between all roles. Dates align with education end date.
75-89: Very good - gaps <1 month clearly explained or contextual, consistent narrative, no role overlaps
60-74: Acceptable - gaps 1-3 months present, mostly logical transitions
45-59: Problematic - gaps 3-6 months, role overlaps, narrative jumps
30-44: Serious - major gaps >6 months, significant overlaps, education/employment conflicts
<30: Critical - impossible timeline, severe overlaps, fabrication indicators

EXPERIENCE VERIFICATION (0-100):
90-100: Rich specific metrics (increased X by 30%, managed $5M+ budget, led team of 20+), quantified impact evident, achievements appropriate for tenure and level
75-89: Multiple measurable results (improved processes, shipped products, led initiatives), impact clear
60-74: Some specific achievements, limited metrics, basic impact description
45-59: Mostly generic language (responsible for, involved in), minimal quantification, questionable for tenure
30-44: Vague achievements, inflated claims relative to role, no evidence of impact
<30: Fabricated achievements, impossible claims, or zero demonstrable impact

EDUCATION VERIFICATION (0-100):
90-100: Top 50 university globally, graduation dates align perfectly with work timeline, degree directly relevant to career
75-89: Well-known university (top 200 globally), dates reasonable, relevant degree
60-74: Recognized university, dates mostly clear, degree related to career
45-59: Lesser-known institution, date ambiguity, weak degree/career alignment
30-44: Difficult to verify, credential issues, major conflicts with work history
<30: Non-existent institution, fabricated degree, or impossible timeline

SKILLS ALIGNMENT (0-100):
90-100: Clear skill progression through roles, tools/languages match era/industry, demonstrated depth (projects, certifications), expertise evident
75-89: Skills align with roles, reasonable progression, some depth shown
60-74: Basic skill/role alignment, limited evidence of progression
45-59: Weak skill/role connections, gaps in claimed expertise
30-44: Major mismatches, unexplained skill claims
<30: Contradictory skills/experience, false expertise claims

METHODOLOGY:
1. Map employment timeline with exact dates - identify gaps/overlaps (be strict)
2. Extract specific metrics from achievements - count generic vs quantified claims
3. Verify education institutions and dates - cross-reference with employment
4. Track skill introduction - do skills logically appear when claimed?
5. Assess narrative coherence - does career flow make logical sense?
6. Look for inflation indicators - claims beyond realistic scope

RED FLAGS TO IDENTIFY:
- Any timeline gaps >3 months unexplained (be strict)
- Employment date overlaps at 2+ companies
- Generic job descriptions with no quantified impact
- Vague language dominating the resume
- Skills listed without supporting experience in timeline
- Lesser-known or unverifiable institutions
- Inflated achievements for job level/tenure
- Career progression that seems unrealistic
- Minimal detail/sparse descriptions across roles
- Education dates conflicting with employment history

GREEN FLAGS TO IDENTIFY (ONLY flag if truly impressive):
- Specific quantified metrics (X% growth, $Y revenue, Z team members)
- Clear, logical career progression with pattern
- Elite/recognized institutions verifiable
- Skills clearly demonstrated through dated roles
- Rich detail and specificity throughout
- Published work, rare certifications, recognized awards
- Consistent 2+ year tenure showing stability
- Measurable project outcomes

CRITICAL: Most resumes should score 50-70 range unless exceptionally detailed.

Provide scores for all 4 categories. Thoroughly justify each score with specific evidence.
NEXT STEPS: 3-5 verification actions (reference checks, credential verification, etc.)
INTERVIEW QUESTIONS: 5-7 questions targeting any red flags or verifying impressive claims`;
      } else if (userTier === 'starter') {
        // Starter tier: Basic analysis
        analysisPrompt = `You are an HR screening specialist. Score this resume with STRICT, CONSISTENT methodology. BE RIGOROUS - ONLY STRONG CANDIDATES DESERVE HIGH SCORES.

      CURRENT DATE FOR CONTEXT: ${new Date().toISOString().split('T')[0]} (use this to evaluate if dates are past, present, or future)

      CRITICAL CONSISTENCY RULES:
      - ALWAYS extract exact name from resume
      - ALWAYS extract email if present
      - Apply identical scoring approach to every resume
      - Use explicit rubric below
      - Identical resume = identical scores every time

      DETAILED SCORING RUBRIC (BE HARSH ON SPARSE/VAGUE RESUMES):
      OVERALL SCORE (0-100):
      - 85-100: Exceptional. Multiple specific achievements with metrics, clear progression, elite institutions. Clearly qualified.
      - 70-84: Strong. Specific achievements, measurable results, recognized companies, minor gaps. Genuinely impressive.
      - 55-69: Acceptable. Some specifics, mostly logical, identifiable companies, minor issues present.
      - 40-54: Concerning. Generic descriptions, vague claims, multiple gaps/inconsistencies, weak evidence.
      - 0-39: Critical. Sparse resume, inflated claims, major inconsistencies, unverifiable information.

      CATEGORY SCORES (0-100 each):
      Consistency Score:
      - 80+: Perfect timeline, no gaps/overlaps, clear transitions, education aligns
      - 60-79: Minor gaps <2 months explained, mostly logical
      - 40-59: Gaps 2-6 months, role overlaps, narrative issues
      - 20-39: Major gaps >6 months, significant overlaps
      - <20: Impossible timeline, fabrication indicators

      Experience Verification:
      - 80+: Rich specific metrics (grew X by %, managed budgets, led teams), clear impact
      - 60-79: Multiple measurable results, specific accomplishments
      - 40-59: Some achievements, minimal metrics, vague impact
      - 20-39: Mostly generic language, inflated for role level
      - <20: Zero demonstrable impact or fabricated claims

      Education Verification:
      - 80+: Top university, dates align perfectly, relevant degree
      - 60-79: Well-known institution, clear dates, relevant
      - 40-59: Recognized school, some ambiguity, weak alignment
      - 20-39: Lesser-known school, credential issues
      - <20: Unverifiable or fabricated education

      Skills Alignment:
      - 80+: Clear progression through roles, demonstrated depth/expertise
      - 60-79: Skills align with roles, some progression shown
      - 40-59: Basic alignment, limited evidence
      - 20-39: Major mismatches, unexplained claims
      - <20: Contradictory to experience

      Flag sparse/vague resumes heavily. Generic descriptions should lower all scores. Identify 3-5 red flags. Note green flags only if truly impressive.`;
      } else {
        // Professional/Enterprise tier: Advanced analysis
        analysisPrompt = `You are an expert fraud detection analyst. Perform RIGOROUS, REPRODUCIBLE analysis with strict consistency. BE HARSH ON SPARSE/GENERIC RESUMES.

CURRENT DATE FOR CONTEXT: ${new Date().toISOString().split('T')[0]} (use this to evaluate if dates are past, present, or future)

CRITICAL CONSISTENCY RULES FOR REPRODUCIBILITY:
- ALWAYS extract exact name/email from resume text
- Apply IDENTICAL methodology to every resume
- Score independently before reviewing
- Use explicit rubric - removes subjectivity
- Scoring should be 100% reproducible
- BE RIGOROUS: Only high scores (75+) for candidates with rich, specific, verifiable details

DETAILED SCORING RUBRIC (BE HARSH ON SPARSE/VAGUE CANDIDATES):

OVERALL LEGITIMACY SCORE (0-100):
90-100: Exceptional. Multiple specific achievements with metrics, clear career progression, elite/verified institutions, zero inconsistencies. Demonstrates genuine expertise depth.
75-89: Strong. Specific achievements with some metrics, logical progression, recognized institutions, minor gaps <1 month. Clearly qualified.
60-74: Acceptable. Some specific details, mostly logical progression, identifiable institutions, minor timeline issues. Credible but not exceptional.
45-59: Concerning. Generic descriptions dominate, vague claims, unverifiable companies, gaps/overlaps, inconsistencies present.
30-44: High Risk. Multiple red flags, inflated claims, unverifiable institutions, major timeline issues, poor narrative.
<30: Critical. Likely fraud - fabricated credentials, impossible timeline, severe inconsistencies.

CONSISTENCY SCORE (0-100):
90-100: Perfect alignment - precise dates, no gaps/overlaps, clear logical transitions between all roles. Dates align with education end date.
75-89: Very good - gaps <1 month clearly explained or contextual, consistent narrative, no role overlaps
60-74: Acceptable - gaps 1-3 months present, mostly logical transitions
45-59: Problematic - gaps 3-6 months, role overlaps, narrative jumps
30-44: Serious - major gaps >6 months, significant overlaps, education/employment conflicts
<30: Critical - impossible timeline, severe overlaps, fabrication indicators

EXPERIENCE VERIFICATION (0-100):
90-100: Rich specific metrics (increased X by 30%, managed $5M+ budget, led team of 20+), quantified impact evident, achievements appropriate for tenure and level
75-89: Multiple measurable results (improved processes, shipped products, led initiatives), impact clear
60-74: Some specific achievements, limited metrics, basic impact description
45-59: Mostly generic language (responsible for, involved in), minimal quantification, questionable for tenure
30-44: Vague achievements, inflated claims relative to role, no evidence of impact
<30: Fabricated achievements, impossible claims, or zero demonstrable impact

EDUCATION VERIFICATION (0-100):
90-100: Top 50 university globally, graduation dates align perfectly with work timeline, degree directly relevant to career
75-89: Well-known university (top 200 globally), dates reasonable, relevant degree
60-74: Recognized university, dates mostly clear, degree related to career
45-59: Lesser-known institution, date ambiguity, weak degree/career alignment
30-44: Difficult to verify, credential issues, major conflicts with work history
<30: Non-existent institution, fabricated degree, or impossible timeline

SKILLS ALIGNMENT (0-100):
90-100: Clear skill progression through roles, tools/languages match era/industry, demonstrated depth (projects, certifications), expertise evident
75-89: Skills align with roles, reasonable progression, some depth shown
60-74: Basic skill/role alignment, limited evidence of progression
45-59: Weak skill/role connections, gaps in claimed expertise
30-44: Major mismatches, unexplained skill claims
<30: Contradictory skills/experience, false expertise claims

METHODOLOGY:
1. Map employment timeline with exact dates - identify gaps/overlaps (be strict)
2. Extract specific metrics from achievements - count generic vs quantified claims
3. Verify education institutions and dates - cross-reference with employment
4. Track skill introduction - do skills logically appear when claimed?
5. Assess narrative coherence - does career flow make logical sense?
6. Look for inflation indicators - claims beyond realistic scope

RED FLAGS TO IDENTIFY:
- Any timeline gaps >3 months unexplained (be strict)
- Employment date overlaps at 2+ companies
- Generic job descriptions with no quantified impact
- Vague language dominating the resume
- Skills listed without supporting experience in timeline
- Lesser-known or unverifiable institutions
- Inflated achievements for job level/tenure
- Career progression that seems unrealistic
- Minimal detail/sparse descriptions across roles
- Education dates conflicting with employment history

GREEN FLAGS TO IDENTIFY (ONLY flag if truly impressive):
- Specific quantified metrics (X% growth, $Y revenue, Z team members)
- Clear, logical career progression with pattern
- Elite/recognized institutions verifiable
- Skills clearly demonstrated through dated roles
- Rich detail and specificity throughout
- Published work, rare certifications, recognized awards
- Consistent 2+ year tenure showing stability
- Measurable project outcomes

CRITICAL: Most resumes should score 50-70 range unless exceptionally detailed.

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
    
      // Build the analysis object
      const analysisData = {
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
      };

      let updatedCandidate;
      
      if (isAuthenticated && candidate) {
        // Update candidate with analysis for authenticated users
        updatedCandidate = await base44.entities.Candidate.update(candidate.id, {
          name: analysis.candidate_name || 'Unknown Candidate',
          email: analysis.candidate_email || '',
          legitimacy_score: analysis.overall_score,
          analysis: analysisData,
          status: 'analyzed'
        });

        // Increment scan count for authenticated users
        await base44.auth.updateMe({
          scans_used: (user?.scans_used || 0) + 1
        });

        // Refresh user data
        const updatedUser = await base44.auth.me();
        setUser(updatedUser);
      } else {
        // For anonymous users, create a temporary candidate object (not saved to DB)
        updatedCandidate = {
          id: 'temp-' + Date.now(),
          name: analysis.candidate_name || 'Unknown Candidate',
          email: analysis.candidate_email || '',
          legitimacy_score: analysis.overall_score,
          analysis: analysisData,
          status: 'analyzed',
          resume_url: file_url,
          created_date: new Date().toISOString()
        };
      }
      
      setIsUploading(false);
       setSelectedCandidate(updatedCandidate);
       setCurrentView('result');
       if (isAuthenticated) {
         queryClient.invalidateQueries({ queryKey: ['candidates'] });

         // Send email notification
         try {
           await base44.integrations.Core.SendEmail({
             to: user.email,
             subject: `Resume Analysis Complete: ${updatedCandidate.name}`,
             body: `Your resume analysis for ${updatedCandidate.name} is ready!\n\nLegitimacy Score: ${updatedCandidate.legitimacy_score}%\n\nLog in to Indexios to view the full analysis.`
           });
         } catch (error) {
           console.error('Error sending email:', error);
         }
       }

       // Show toast notification
       toast.success('Analysis complete!', {
         description: `${updatedCandidate.name} scored ${updatedCandidate.legitimacy_score}%`,
         icon: <CheckCircle2 className="w-4 h-4" />
       });
    } catch (error) {
       console.error('Analysis error:', error);
       setIsUploading(false);
       toast.error('Analysis failed', {
         description: 'Please check your resume and try again'
       });
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
                        Upload 5+ resumes at once. Results display ordered by legitimacy score.
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

                            // Store bulk results and navigate to bulk results view
                            localStorage.setItem('bulkResults', JSON.stringify(response.data.analyses));
                            setCurrentView('bulk-results');
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

              {/* Session Management for Non-Enterprise */}
              {isAuthenticated && user?.subscription_tier !== 'enterprise' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-900/40 border border-blue-500/60 rounded-xl p-4 mb-6"
                >
                  <p className="text-blue-200 text-sm">
                    <span className="font-semibold">Note:</span> Only one device can access your account at a time. Upgrade to Enterprise for concurrent multi-device access.
                  </p>
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

          {/* Bulk Results View */}
          {currentView === 'bulk-results' && (
            <motion.div
              key="bulk-results"
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

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Bulk Analysis Results</h2>
                <p className="text-white/60">Sorted by legitimacy score (highest to lowest)</p>
              </div>

              <div className="space-y-4">
                {bulkResults.map((candidate, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-zinc-900/80 backdrop-blur-sm rounded-xl p-6 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors"
                    onClick={() => {
                      setSelectedCandidate({
                        id: `bulk-${index}`,
                        name: candidate.name,
                        email: candidate.email,
                        legitimacy_score: candidate.overall_score,
                        analysis: {
                          consistency_score: candidate.consistency_score,
                          consistency_details: candidate.consistency_details,
                          experience_verification: candidate.experience_verification,
                          experience_details: candidate.experience_details,
                          education_verification: candidate.education_verification,
                          education_details: candidate.education_details,
                          skills_alignment: candidate.skills_alignment,
                          skills_details: candidate.skills_details,
                          red_flags: candidate.red_flags || [],
                          green_flags: candidate.green_flags || [],
                          summary: candidate.summary
                        }
                      });
                      setCurrentView('result');
                    }}
                  >
                    <div className="flex items-start gap-6">
                      <div className="flex-shrink-0">
                        <ScoreCircle score={candidate.overall_score || 0} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-1">
                          {candidate.name || 'Unknown'}
                        </h3>
                        {candidate.email && (
                          <p className="text-white/60 mb-2">{candidate.email}</p>
                        )}
                        {candidate.summary && (
                          <p className="text-white/70 text-sm leading-relaxed">
                            {candidate.summary}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
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