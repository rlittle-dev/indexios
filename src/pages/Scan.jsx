import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, History, User, Briefcase, GraduationCap, Sparkles, ArrowLeft, ExternalLink, Lock, Download, Share2, CheckCircle2, ArrowRight, BookOpen } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
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
import EmploymentVerificationBox from '@/components/score/EmploymentVerificationBox';
import { toast } from 'sonner';

const TIER_LIMITS = { free: 1, starter: 50, professional: 200, corporate: 1000, enterprise: 999999 };

export default function Scan() {
  const [currentView, setCurrentView] = useState('upload');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [bulkResults, setBulkResults] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isUniversityMode, setIsUniversityMode] = useState(false);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      setIsAuthenticated(authenticated);
      if (authenticated) {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } else {
        try {
          const { data } = await base44.functions.invoke('getAnonymousScans');
          setUser({ scans_used: data.scansUsed, subscription_tier: 'free' });
        } catch (error) {
          setUser({ scans_used: 0, subscription_tier: 'free' });
        }
      }
      setAuthLoading(false);
      const stored = localStorage.getItem('bulkResults');
      if (stored) setBulkResults(JSON.parse(stored));
    };
    checkAuth();
  }, []);
  
  const { data: userTeams = [] } = useQuery({
    queryKey: ['userTeams'],
    queryFn: async () => {
      if (!user) return [];
      const memberships = await base44.entities.TeamMember.filter({ user_email: user.email, status: 'active' });
      return memberships;
    },
    enabled: isAuthenticated && !!user,
  });

  const { data: candidates = [], isLoading: candidatesLoading } = useQuery({
    queryKey: ['candidates', userTeams],
    queryFn: async () => {
      const personalScans = await base44.entities.Candidate.filter({ created_by: user.email }, '-created_date', 50);
      if ((user?.subscription_tier === 'professional' || user?.subscription_tier === 'corporate' || user?.subscription_tier === 'enterprise') && userTeams.length > 0) {
        const teamScans = await Promise.all(userTeams.map(membership => base44.entities.Candidate.filter({ team_id: membership.team_id }, '-created_date', 50)));
        const allTeamScans = teamScans.flat();
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
      if (!isAuthenticated) {
        const trackResponse = await base44.functions.invoke('trackAnonymousScan');
        if (!trackResponse.data.allowed) {
          setIsUploading(false);
          alert('Free scan limit reached. Please sign up to continue scanning resumes.');
          setCurrentView('upgrade');
          return;
        }
        setUser(prev => ({ ...prev, scans_used: trackResponse.data.scansUsed }));
      } else {
        const userTier = user?.subscription_tier || 'free';
        const scansUsed = user?.scans_used || 0;
        const scanLimit = TIER_LIMITS[userTier];
        if (scansUsed >= scanLimit) {
          setIsUploading(false);
          setCurrentView('upgrade');
          return;
        }
      }

      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      let teamId = null;
      if ((user?.subscription_tier === 'professional' || user?.subscription_tier === 'corporate' || user?.subscription_tier === 'enterprise') && userTeams.length > 0) {
        teamId = userTeams[0].team_id;
      }

      let candidate = null;
      if (isAuthenticated) {
        candidate = await base44.entities.Candidate.create({ resume_url: file_url, status: 'pending', team_id: teamId });
      }
    
      const analysisPrompt = isUniversityMode 
          ? `You are an expert university admissions analyst evaluating student/applicant resumes for prospective students and transfer applicants. Perform RIGOROUS, DETAILED, COMPREHENSIVE analysis calibrated for students and recent graduates.

      CONTEXT: This is a UNIVERSITY APPLICANT (prospective student or transfer student) - expect internships, part-time jobs, volunteer work, academic projects, research positions, and extracurriculars rather than full-time professional experience.

      COMPANY/ORGANIZATION EXTRACTION (CRITICAL):
      Extract the organization name for EACH position listed (internships, part-time jobs, volunteer organizations, research labs, schools, etc).
      Return company_names as an array.

      CURRENT DATE FOR CONTEXT: ${new Date().toISOString().split('T')[0]}

      STUDENT-CALIBRATED SCORING RUBRIC:
      OVERALL LEGITIMACY SCORE (0-100):
      90-100: Outstanding student. Verifiable internships at recognized companies, specific project outcomes, leadership roles in real organizations, consistent timeline, strong academic record.
      75-89: Strong applicant. Good mix of internships/volunteer work, specific achievements, recognized institutions, logical progression.
      60-74: Solid applicant. Some internships or part-time work, academic projects with details, extracurriculars that can be verified.
      45-59: Average applicant. Limited experience but what's listed seems plausible, mostly academic achievements.
      30-44: Weak/Concerning. Vague claims, unverifiable organizations, inflated responsibilities for student roles.
      <30: High Risk. Fabricated internships, impossible timelines, fake organizations.

      IMPORTANT FOR STUDENT EVALUATION:
      - Don't penalize for lack of full-time work experience
      - Value quality internships, research experience, and meaningful volunteer work
      - Academic projects and coursework ARE valid experience for students
      - Leadership in clubs/organizations shows initiative
      - Part-time jobs (retail, food service, etc.) show work ethic - don't dismiss them
      - Gap years or study abroad are normal, not red flags
      - Consider community service and extracurricular depth

      CATEGORIES TO SCORE (provide DETAILED, THOROUGH analysis for each - at least 3-4 sentences per category):

      1. TIMELINE & PROGRESSION (consistency_score, consistency_details):
      - Evaluate the logical flow from high school through current education
      - Check for realistic timelines between schools, activities, and positions
      - Assess progression in responsibilities and leadership roles over time
      - Look for gaps or overlaps that need explanation
      - Consider study abroad, gap years as normal parts of student journeys

      2. EXPERIENCE & ACTIVITIES (experience_verification, experience_details):
      - Evaluate internships: Are they at real companies? Are responsibilities appropriate for intern level?
      - Assess research positions: Are the labs/professors verifiable? Are claimed contributions realistic?
      - Review volunteer work: Are the organizations real? Are hours/impact claims reasonable?
      - Consider part-time employment: Shows work ethic and time management
      - Look for specific, measurable outcomes vs. vague descriptions

      3. ACADEMIC BACKGROUND (education_verification, education_details):
      - Verify institution recognition and accreditation
      - Assess GPA claims against typical distributions
      - Evaluate honors, awards, and academic achievements
      - Check relevance and rigor of coursework mentioned
      - Consider test scores, AP/IB courses, academic competitions

      4. SKILLS & LEADERSHIP (skills_alignment, skills_details):
      - Evaluate club memberships and leadership positions
      - Assess sports, arts, or other extracurricular commitments
      - Review certifications, technical skills, and languages
      - Consider community involvement and civic engagement
      - Look for depth over breadth - sustained commitment vs. resume padding

      BE THOROUGH AND DETAILED in your analysis. Each details field should be 3-5 sentences minimum explaining your assessment.

      NEXT STEPS: 5-7 verification actions appropriate for student applicants (contacting schools, verifying organizations, checking awards)
      INTERVIEW QUESTIONS: 7-10 questions suited for admissions interviews (about motivations, experiences, goals)`
        : `You are an expert fraud detection analyst. Perform RIGOROUS, REPRODUCIBLE analysis with strict consistency. BE HARSH ON SPARSE/GENERIC RESUMES.

COMPANY EXTRACTION (CRITICAL):
Extract the company name for EACH position listed in the work experience section.
Return company_names as an array.

CURRENT DATE FOR CONTEXT: ${new Date().toISOString().split('T')[0]}

CRITICAL CONSISTENCY RULES FOR REPRODUCIBILITY:
- ALWAYS extract exact name/email from resume text
- Apply IDENTICAL methodology to every resume
- Score independently before reviewing
- Use explicit rubric - removes subjectivity
- Scoring should be 100% reproducible
- BE RIGOROUS: Only high scores (75+) for candidates with rich, specific, verifiable details

DETAILED SCORING RUBRIC:
OVERALL LEGITIMACY SCORE (0-100):
90-100: Exceptional. Multiple specific achievements with metrics, clear career progression, elite/verified institutions, zero inconsistencies.
75-89: Strong. Specific achievements with some metrics, logical progression, recognized institutions.
60-74: Acceptable. Some specific details, mostly logical progression, identifiable institutions.
45-59: Concerning. Generic descriptions dominate, vague claims, gaps/overlaps.
30-44: High Risk. Multiple red flags, inflated claims, unverifiable institutions.
<30: Critical. Likely fraud - fabricated credentials, impossible timeline.

Provide detailed scores for all 4 categories (consistency, experience, education, skills) with EXTENSIVE justifications.

NEXT STEPS: 5-7 verification actions
INTERVIEW QUESTIONS: 7-10 targeted questions`;
    
      const analysisSchema = isUniversityMode ? {
          type: "object",
          properties: {
            candidate_name: { type: "string", description: "Student's full name" },
            candidate_email: { type: "string", description: "Student's email if found" },
            overall_score: { type: "number", description: "Overall legitimacy score 0-100" },
            consistency_score: { type: "number", description: "Timeline & Progression score 0-100" },
            consistency_details: { type: "string", description: "Detailed 3-5 sentence analysis of timeline, progression through education, gaps, and logical flow" },
            experience_verification: { type: "number", description: "Experience & Activities score 0-100" },
            experience_details: { type: "string", description: "Detailed 3-5 sentence analysis of internships, research, volunteer work, and part-time jobs" },
            education_verification: { type: "number", description: "Academic Background score 0-100" },
            education_details: { type: "string", description: "Detailed 3-5 sentence analysis of institution, GPA, honors, coursework, and academic achievements" },
            skills_alignment: { type: "number", description: "Skills & Leadership score 0-100" },
            skills_details: { type: "string", description: "Detailed 3-5 sentence analysis of clubs, sports, certifications, extracurriculars, and leadership roles" },
            red_flags: { type: "array", items: { type: "string" }, description: "List of concerns or issues found" },
            green_flags: { type: "array", items: { type: "string" }, description: "List of positive indicators and strengths" },
            summary: { type: "string", description: "2-3 sentence overall assessment of the applicant" },
            next_steps: { type: "array", items: { type: "string" }, description: "5-7 verification actions for admissions" },
            interview_questions: { type: "array", items: { type: "string" }, description: "7-10 questions for admissions interview" },
            company_names: { type: "array", items: { type: "string" }, description: "All organizations, schools, companies mentioned" }
          },
          required: ["overall_score", "consistency_score", "consistency_details", "experience_verification", "experience_details", "education_verification", "education_details", "skills_alignment", "skills_details", "red_flags", "green_flags", "summary", "next_steps", "interview_questions", "company_names"]
        } : {
          type: "object",
          properties: {
            candidate_name: { type: "string" },
            candidate_email: { type: "string" },
            overall_score: { type: "number" },
            consistency_score: { type: "number" },
            consistency_details: { type: "string" },
            experience_verification: { type: "number" },
            experience_details: { type: "string" },
            education_verification: { type: "number" },
            education_details: { type: "string" },
            skills_alignment: { type: "number" },
            skills_details: { type: "string" },
            red_flags: { type: "array", items: { type: "string" } },
            green_flags: { type: "array", items: { type: "string" } },
            summary: { type: "string" },
            next_steps: { type: "array", items: { type: "string" } },
            interview_questions: { type: "array", items: { type: "string" } },
            company_names: { type: "array", items: { type: "string" } }
          },
          required: ["overall_score", "consistency_score", "experience_verification", "education_verification", "skills_alignment", "red_flags", "green_flags", "summary", "next_steps", "interview_questions", "company_names"]
        };

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        file_urls: [file_url],
        response_json_schema: analysisSchema
      });
        
      let companyNames = analysis.company_names && Array.isArray(analysis.company_names) ? analysis.company_names : [];

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
        company_names: companyNames,
        is_university_mode: isUniversityMode,
      };

      let updatedCandidate;
      if (isAuthenticated && candidate) {
        updatedCandidate = await base44.entities.Candidate.update(candidate.id, {
          name: analysis.candidate_name || 'Unknown Candidate',
          email: analysis.candidate_email || '',
          legitimacy_score: analysis.overall_score,
          analysis: analysisData,
          status: 'analyzed'
        });
        await base44.auth.updateMe({ scans_used: (user?.scans_used || 0) + 1 });
        const updatedUser = await base44.auth.me();
        setUser(updatedUser);
      } else {
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
        if (user?.email_notifications_enabled !== false) {
          try {
            await base44.integrations.Core.SendEmail({
              to: user.email,
              subject: `Resume Analysis Complete: ${updatedCandidate.name}`,
              body: `Your resume analysis for ${updatedCandidate.name} is ready!\n\nLegitimacy Score: ${updatedCandidate.legitimacy_score}%\n\nLog in to Indexios to view the full analysis.`
            });
          } catch (error) {}
        }
      }

      toast.success('Analysis complete!', { description: `${updatedCandidate.name} scored ${updatedCandidate.legitimacy_score}%`, icon: <CheckCircle2 className="w-4 h-4" /> });

      if (isAuthenticated && updatedCandidate.id && !updatedCandidate.id.startsWith('temp-')) {
        base44.functions.invoke('linkCandidateScan', { candidateId: updatedCandidate.id })
          .then(res => { if (res.data?.uniqueCandidateId) setSelectedCandidate(prev => ({ ...prev, unique_candidate_id: res.data.uniqueCandidateId })); })
          .catch(err => {});
      }
    } catch (error) {
      setIsUploading(false);
      toast.error('Analysis failed', { description: 'Please check your resume and try again' });
    }
  };

  const handleUpload = async (file) => await analyzeResume(file);
  const handleViewHistory = () => { if ((user?.subscription_tier || 'free') === 'free') { setCurrentView('history-locked'); return; } setCurrentView('history'); };
  const handleSelectCandidate = async (candidate) => {
    if ((user?.subscription_tier || 'free') === 'free') { setCurrentView('upgrade'); return; }
    setSelectedCandidate(candidate);
    setCurrentView('result');
    if (!candidate.unique_candidate_id && candidate.id && !candidate.id.startsWith('temp-') && !candidate.id.startsWith('bulk-')) {
      try {
        const res = await base44.functions.invoke('linkCandidateScan', { candidateId: candidate.id });
        if (res.data?.uniqueCandidateId) setSelectedCandidate(prev => ({ ...prev, unique_candidate_id: res.data.uniqueCandidateId }));
      } catch (error) {}
    }
  };
  const handleBack = () => { setCurrentView('upload'); setSelectedCandidate(null); };
  const canUpload = () => (user?.scans_used || 0) < TIER_LIMITS[user?.subscription_tier || 'free'];
  const handleLoginRedirect = () => base44.auth.redirectToLogin(createPageUrl('Scan'));

  const handleDownload = async (candidate) => {
    const report = `INDEXIOS RESUME ANALYSIS REPORT\n================================\n\nCandidate: ${candidate.name || 'Unknown'}\nEmail: ${candidate.email || 'N/A'}\nScan Date: ${new Date(candidate.created_date).toLocaleDateString()}\n\nLEGITIMACY SCORE: ${candidate.legitimacy_score}%\n\nANALYSIS BREAKDOWN\n------------------\nConsistency: ${candidate.analysis?.consistency_score || 0}%\n${candidate.analysis?.consistency_details || ''}\n\nExperience: ${candidate.analysis?.experience_verification || 0}%\n${candidate.analysis?.experience_details || ''}\n\nEducation: ${candidate.analysis?.education_verification || 0}%\n${candidate.analysis?.education_details || ''}\n\nSkills Alignment: ${candidate.analysis?.skills_alignment || 0}%\n${candidate.analysis?.skills_details || ''}\n\nRED FLAGS\n---------\n${candidate.analysis?.red_flags?.map((flag, i) => `${i + 1}. ${flag}`).join('\n') || 'None detected'}\n\nGREEN FLAGS\n-----------\n${candidate.analysis?.green_flags?.map((flag, i) => `${i + 1}. ${flag}`).join('\n') || 'None detected'}\n\nSUMMARY\n-------\n${candidate.analysis?.summary || 'N/A'}\n\n---\nReport generated by Indexios`.trim();
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
    const lastShareTime = localStorage.getItem(`lastShare_${candidate.id}`);
    const now = Date.now();
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    if (lastShareTime && now - parseInt(lastShareTime) < twelveHoursMs) {
      const timeRemaining = Math.ceil((twelveHoursMs - (now - parseInt(lastShareTime))) / (60 * 60 * 1000));
      alert(`You can share this report again in ${timeRemaining} hour${timeRemaining !== 1 ? 's' : ''}.`);
      return;
    }
    const shareUrl = `${window.location.origin}${createPageUrl('SharedReport')}?id=${candidate.id}`;
    localStorage.setItem(`lastShare_${candidate.id}`, now.toString());
    if (navigator.share) {
      try { await navigator.share({ title: `Indexios Scan - ${candidate.name || 'Candidate'}`, url: shareUrl }); } catch (error) {}
    } else {
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
    if (!isAuthenticated || !user) { alert('Please sign in to save candidates'); return; }
    try {
      await base44.entities.SavedCandidate.create({ candidate_id: candidate.id, folder_id: folderId, user_email: user.email });
      alert('Candidate saved to folder!');
    } catch (error) { alert('Failed to save candidate'); }
  };

  const handleSaveAllToFolder = async (results, folderId) => {
    if (!isAuthenticated || !user) { alert('Please sign in to save candidates'); return; }
    try {
      const savePromises = results.filter(r => r.id).map(result => base44.entities.SavedCandidate.create({ candidate_id: result.id, folder_id: folderId, user_email: user.email }));
      await Promise.all(savePromises);
      alert(`Saved ${savePromises.length} candidate${savePromises.length !== 1 ? 's' : ''} to folder!`);
    } catch (error) { alert('Failed to save candidates'); }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-4xl font-bold text-white">Indexios</motion.div>
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Scan Resume - Resume Verification & Fraud Detection | Indexios</title>
        <meta name="description" content="Upload and verify resume authenticity with advanced fraud detection." />
        <link rel="canonical" href="https://indexios.me/Scan" />
      </Helmet>
      
      <section className="relative min-h-screen bg-[#0a0a0a] overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop")', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.15 }}>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/80 via-[#0a0a0a]/70 to-[#0a0a0a]" />
        </div>
        <div className="absolute inset-0 pointer-events-none z-[2]" style={{ background: 'radial-gradient(70% 50%, transparent 0%, rgba(10, 10, 10, 0.5) 60%, rgba(10, 10, 10, 0.98) 100%)' }} />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-purple-500/[0.04] rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/[0.03] rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 py-12 md:py-20">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 mb-6">
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">Resume Verification</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight leading-[1.1] mb-4">
              <span className="text-white/60">Scan &</span>
              <span className="text-white font-medium"> Verify</span>
            </h1>
            <p className="text-lg md:text-xl text-white/50 max-w-xl mx-auto">Upload a resume to analyze for legitimacy and fraud detection</p>
          </motion.div>

          {/* Navigation */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col items-center gap-4 mb-10">
            <div className="flex justify-center gap-2 p-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
              <Button variant="ghost" onClick={handleBack} className={currentView === 'upload' ? 'bg-white text-black font-medium rounded-full hover:bg-white/90 px-6' : 'text-white/60 hover:text-white hover:bg-white/5 rounded-full px-6'}>
                <Shield className="w-4 h-4 mr-2" /> Scan
              </Button>
              <Button variant="ghost" onClick={handleViewHistory} className={currentView === 'history' ? 'bg-white text-black font-medium rounded-full hover:bg-white/90 px-6' : 'text-white/60 hover:text-white hover:bg-white/5 rounded-full px-6'}>
                <History className="w-4 h-4 mr-2" /> History
                {candidates.length > 0 && <span className="ml-2 bg-white/10 px-2 py-0.5 rounded-full text-xs">{candidates.length}</span>}
              </Button>
            </div>
            
            <div className="text-center">
              <p className="text-white/40 text-sm">
                <span className="font-semibold text-white/70">{user?.scans_used || 0}</span>
                <span className="mx-1">/</span>
                <span>{user?.subscription_tier === 'enterprise' ? '∞' : TIER_LIMITS[user?.subscription_tier || 'free'] || TIER_LIMITS.free}</span>
                <span className="ml-1">scans used</span>
              </p>
              {isAuthenticated ? (
                <Link to={createPageUrl('Home') + '#pricing'}><Button variant="link" className="text-purple-400/80 hover:text-purple-400 text-xs p-0 h-auto">Upgrade →</Button></Link>
              ) : (
                <Button variant="link" onClick={handleLoginRedirect} className="text-purple-400/80 hover:text-purple-400 text-xs p-0 h-auto">Sign up for more →</Button>
              )}
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {/* Upload View */}
            {currentView === 'upload' && (
              <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                {(user?.subscription_tier === 'corporate' || user?.subscription_tier === 'enterprise') && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/30 rounded-2xl p-5 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="bg-purple-500/20 rounded-full p-2"><Sparkles className="w-5 h-5 text-purple-400" /></div>
                      <div className="flex-1">
                        <p className="text-purple-300 font-medium text-sm mb-1">Enterprise Bulk Upload</p>
                        <p className="text-white/60 text-xs mb-3">Upload 5+ resumes at once. Results display ordered by legitimacy score.</p>
                        <input type="file" accept=".pdf" multiple onChange={async (e) => {
                          const files = Array.from(e.target.files);
                          if (files.length < 5) { alert('Please select at least 5 files for bulk upload'); e.target.value = ''; return; }
                          setIsUploading(true);
                          try {
                            const uploadPromises = files.map(file => base44.integrations.Core.UploadFile({ file }));
                            const uploads = await Promise.all(uploadPromises);
                            const fileUrls = uploads.map(u => u.file_url);
                            const response = await base44.functions.invoke('bulkAnalyze', { fileUrls });
                            const results = response.data.analyses;
                            localStorage.setItem('bulkResults', JSON.stringify(results));
                            setBulkResults(results);
                            setCurrentView('bulk-results');
                          } catch (error) { alert('Failed to process bulk upload. Please try again.'); }
                          setIsUploading(false);
                          e.target.value = '';
                        }} className="hidden" id="bulk-upload" />
                        <label htmlFor="bulk-upload"><Button size="sm" className="bg-purple-500 hover:bg-purple-400 text-white font-semibold cursor-pointer rounded-full" asChild><span>Select 5+ Files</span></Button></label>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* University Applicant Toggle */}
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="flex items-center justify-center gap-3 mb-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                >
                  <Briefcase className={`w-4 h-4 transition-colors ${!isUniversityMode ? 'text-purple-400' : 'text-white/30'}`} />
                  <span className={`text-sm transition-colors ${!isUniversityMode ? 'text-white' : 'text-white/40'}`}>Professional</span>
                  <Switch 
                    checked={isUniversityMode} 
                    onCheckedChange={setIsUniversityMode}
                    className="data-[state=checked]:bg-purple-500"
                  />
                  <span className={`text-sm transition-colors ${isUniversityMode ? 'text-white' : 'text-white/40'}`}>University Applicant</span>
                  <GraduationCap className={`w-4 h-4 transition-colors ${isUniversityMode ? 'text-purple-400' : 'text-white/30'}`} />
                </motion.div>

                {isUniversityMode && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }} 
                    className="mb-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20"
                  >
                    <div className="flex items-start gap-3">
                      <BookOpen className="w-5 h-5 text-purple-400 mt-0.5" />
                      <div>
                        <p className="text-purple-300 font-medium text-sm">University Applicant Mode</p>
                        <p className="text-white/50 text-xs mt-1">Scoring calibrated for students - values internships, research, volunteer work, and extracurriculars. Won't penalize for limited professional experience.</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {canUpload() ? (
                  <UploadZone onUpload={handleUpload} isUploading={isUploading} />
                ) : (
                  <UpgradePrompt scansUsed={user?.scans_used || 0} scansLimit={TIER_LIMITS[user?.subscription_tier || 'free']} onUpgrade={() => window.location.href = createPageUrl('Home') + '#pricing'} />
                )}
                
                {candidates.length > 0 && (user?.subscription_tier && user.subscription_tier !== 'free') && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-10">
                    <h3 className="text-white/50 text-sm font-medium mb-4 uppercase tracking-wider">Recent Scans</h3>
                    <div className="grid gap-3">
                      {candidates.slice(0, 3).map((candidate, index) => (
                        <CandidateCard key={candidate.id} candidate={candidate} onClick={() => handleSelectCandidate(candidate)} onDownload={handleDownload} onShare={handleShare} delay={index * 0.1} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Result View */}
            {currentView === 'result' && selectedCandidate && (
              <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" onClick={handleBack} className="text-white/60 hover:text-white hover:bg-white/5 rounded-full">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <div className="flex gap-2">
                    {folders.length > 0 && (
                      <select onChange={(e) => { if (e.target.value) { handleSaveToFolder(selectedCandidate, e.target.value); e.target.value = ''; } }} className="bg-white/5 border border-white/10 text-white rounded-full px-4 py-2 text-sm hover:bg-white/10">
                        <option value="">Save to folder...</option>
                        {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    )}
                    <Button variant="ghost" onClick={() => handleShare(selectedCandidate)} className="border border-white/10 text-white/70 hover:text-white hover:bg-white/5 rounded-full">
                      <Share2 className="w-4 h-4 mr-2" /> Share
                    </Button>
                    <Button variant="ghost" onClick={() => handleDownload(selectedCandidate)} className="border border-white/10 text-white/70 hover:text-white hover:bg-white/5 rounded-full">
                      <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                  </div>
                </div>

                {/* Candidate Header */}
                <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 md:p-8">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <ScoreCircle score={selectedCandidate.legitimacy_score || 0} />
                    <div className="flex-1 text-center md:text-left">
                      <h2 className="text-2xl font-medium text-white mb-1">{selectedCandidate.name || 'Unknown Candidate'}</h2>
                      {selectedCandidate.email && <p className="text-white/40 text-sm">{selectedCandidate.email}</p>}
                      {selectedCandidate.analysis?.summary && <p className="text-white/50 mt-3 text-sm leading-relaxed">{selectedCandidate.analysis.summary}</p>}
                      {selectedCandidate.resume_url && (
                        <a href={selectedCandidate.resume_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-4 text-purple-400/80 hover:text-purple-400 text-sm font-medium transition-colors">
                          <ExternalLink className="w-4 h-4" /> View Resume
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {(user?.subscription_tier === 'free' || !isAuthenticated) && (
                  <div className="rounded-2xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 p-5 text-center">
                    <p className="text-white/60 text-sm">Upgrade to save your scan history and unlock team features</p>
                    <Link to={createPageUrl('Home') + '#pricing'}><Button size="sm" className="mt-3 bg-white hover:bg-white/90 text-black font-medium rounded-full">View Plans</Button></Link>
                  </div>
                )}

                {selectedCandidate.analysis && (
                  <>
                    <EmploymentVerificationBox companyNames={selectedCandidate.analysis.company_names || []} candidateId={selectedCandidate.id} candidateName={selectedCandidate.name} uniqueCandidateId={selectedCandidate.unique_candidate_id} userTier={user?.subscription_tier || 'free'} />

                    <div className="grid sm:grid-cols-2 gap-4">
                        <AnalysisCard 
                          title={selectedCandidate.analysis.is_university_mode ? "Timeline & Progression" : "Consistency"} 
                          score={selectedCandidate.analysis.consistency_score || 0} 
                          details={selectedCandidate.analysis.consistency_details} 
                          icon={User} 
                          delay={0}
                          subtitle={selectedCandidate.analysis.is_university_mode ? "Academic & activity timeline" : undefined}
                        />
                        <AnalysisCard 
                          title={selectedCandidate.analysis.is_university_mode ? "Experience & Activities" : "Experience"} 
                          score={selectedCandidate.analysis.experience_verification || 0} 
                          details={selectedCandidate.analysis.experience_details} 
                          icon={Briefcase} 
                          delay={0.1}
                          subtitle={selectedCandidate.analysis.is_university_mode ? "Internships, research, volunteer work" : undefined}
                        />
                        <AnalysisCard 
                          title={selectedCandidate.analysis.is_university_mode ? "Academic Background" : "Education"} 
                          score={selectedCandidate.analysis.education_verification || 0} 
                          details={selectedCandidate.analysis.education_details} 
                          icon={GraduationCap} 
                          delay={0.2}
                          subtitle={selectedCandidate.analysis.is_university_mode ? "GPA, coursework, honors" : undefined}
                        />
                        <AnalysisCard 
                          title={selectedCandidate.analysis.is_university_mode ? "Skills & Leadership" : "Skills Alignment"} 
                          score={selectedCandidate.analysis.skills_alignment || 0} 
                          details={selectedCandidate.analysis.skills_details} 
                          icon={Sparkles} 
                          delay={0.3}
                          subtitle={selectedCandidate.analysis.is_university_mode ? "Clubs, sports, certifications" : undefined}
                        />
                      </div>

                    <FlagsList redFlags={selectedCandidate.analysis.red_flags || []} greenFlags={selectedCandidate.analysis.green_flags || []} />
                    <NextSteps nextSteps={selectedCandidate.analysis.next_steps} interviewQuestions={selectedCandidate.analysis.interview_questions} />
                  </>
                )}
              </motion.div>
            )}

            {/* Upgrade View */}
            {currentView === 'upgrade' && (
              <motion.div key="upgrade" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <Button variant="ghost" onClick={handleBack} className="mb-6 text-white/60 hover:text-white hover:bg-white/5 rounded-full"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                <UpgradePrompt scansUsed={user?.scans_used || 0} scansLimit={TIER_LIMITS[user?.subscription_tier || 'free']} onUpgrade={() => window.location.href = createPageUrl('Home') + '#pricing'} reason={(user?.scans_used || 0) >= TIER_LIMITS[user?.subscription_tier || 'free'] ? 'scan limit' : 'feature access'} />
              </motion.div>
            )}

            {/* Bulk Results View */}
            {currentView === 'bulk-results' && (
              <motion.div key="bulk-results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <Button variant="ghost" onClick={handleBack} className="mb-6 text-white/60 hover:text-white hover:bg-white/5 rounded-full"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-medium text-white mb-2">Bulk Analysis Results</h2>
                    <p className="text-white/50">Sorted by legitimacy score (highest to lowest)</p>
                  </div>
                  {folders.length > 0 && (
                    <select onChange={(e) => { if (e.target.value) { handleSaveAllToFolder(bulkResults, e.target.value); e.target.value = ''; } }} className="bg-white/5 border border-white/10 text-white rounded-full px-4 py-2 text-sm hover:bg-white/10">
                      <option value="">Save all to folder...</option>
                      {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  )}
                </div>
                <div className="space-y-4">
                  {bulkResults.map((candidate, index) => (
                    <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 cursor-pointer hover:border-white/[0.12] transition-colors" onClick={() => { setSelectedCandidate({ id: `bulk-${index}`, name: candidate.name, email: candidate.email, legitimacy_score: candidate.overall_score, analysis: { consistency_score: candidate.consistency_score, consistency_details: candidate.consistency_details, experience_verification: candidate.experience_verification, experience_details: candidate.experience_details, education_verification: candidate.education_verification, education_details: candidate.education_details, skills_alignment: candidate.skills_alignment, skills_details: candidate.skills_details, red_flags: candidate.red_flags || [], green_flags: candidate.green_flags || [], summary: candidate.summary } }); setCurrentView('result'); }}>
                      <div className="flex items-start gap-6">
                        <div className="flex-shrink-0"><ScoreCircle score={candidate.overall_score || 0} /></div>
                        <div className="flex-1">
                          <h3 className="text-xl font-medium text-white mb-1">{candidate.name || 'Unknown'}</h3>
                          {candidate.email && <p className="text-white/50 mb-2">{candidate.email}</p>}
                          {candidate.summary && <p className="text-white/60 text-sm leading-relaxed">{candidate.summary}</p>}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* History Locked */}
            {currentView === 'history-locked' && (
              <motion.div key="history-locked" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-12 text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="inline-flex p-4 rounded-2xl bg-red-500/10 mb-6"><Lock className="w-8 h-8 text-red-400" /></motion.div>
                  <h2 className="text-2xl font-medium text-white mb-4">History Locked</h2>
                  <p className="text-white/50 mb-6 max-w-md mx-auto">Upgrade to access your scan history and unlock advanced features</p>
                  <Link to={createPageUrl('Home') + '#pricing'}><Button className="bg-white hover:bg-white/90 text-black font-semibold rounded-full px-8 py-5">View Plans</Button></Link>
                </div>
              </motion.div>
            )}

            {/* History View */}
            {currentView === 'history' && (
              <motion.div key="history" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                {candidatesLoading ? (
                  <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /></div>
                ) : candidates.length > 0 ? (
                  <div className="grid gap-3">{candidates.map((candidate, index) => <CandidateCard key={candidate.id} candidate={candidate} onClick={() => handleSelectCandidate(candidate)} onDownload={handleDownload} onShare={handleShare} delay={index * 0.05} />)}</div>
                ) : (
                  <div className="text-center py-16">
                    <div className="p-4 rounded-2xl bg-white/5 inline-block mb-4"><History className="w-8 h-8 text-white/40" /></div>
                    <p className="text-white/50">No scanned resumes yet</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </>
  );
}