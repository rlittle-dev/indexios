import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, FolderPlus, Upload, Folder, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import UploadZone from '@/components/upload/UploadZone';

const TIER_LIMITS = {
  free: 3,
  starter: 50,
  professional: 200,
  enterprise: 999999
};

export default function TeamDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teamId, setTeamId] = useState(null);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [view, setView] = useState('folders'); // 'folders' or 'scans'

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Get user's team membership
        const memberships = await base44.entities.TeamMember.filter({
          user_email: currentUser.email,
          status: 'active'
        });

        if (memberships.length > 0) {
          setTeamId(memberships[0].team_id);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const { data: team = null } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => base44.entities.Team.filter({ id: teamId }),
    enabled: !!teamId,
    select: (data) => data[0]
  });

  const { data: teamFolders = [] } = useQuery({
    queryKey: ['teamFolders', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      // Get all team members and their folders
      const members = await base44.entities.TeamMember.filter({ team_id: teamId });
      const allFolders = [];
      
      for (const member of members) {
        const folders = await base44.entities.Folder.filter({ user_email: member.user_email });
        allFolders.push(...folders.map(f => ({ ...f, owner_email: member.user_email })));
      }
      return allFolders;
    },
    enabled: !!teamId
  });

  const { data: teamScans = [] } = useQuery({
    queryKey: ['teamScans', teamId, selectedFolderId],
    queryFn: async () => {
      if (!teamId) return [];
      
      if (selectedFolderId) {
        // Get candidates saved to this folder
        const saved = await base44.entities.SavedCandidate.filter({ folder_id: selectedFolderId });
        const candidates = await Promise.all(
          saved.map(s => base44.entities.Candidate.filter({ id: s.candidate_id }))
        );
        return candidates.flat();
      } else {
        // Get team's one-off scans (no folder)
        return await base44.entities.Candidate.filter({ team_id: teamId });
      }
    },
    enabled: !!teamId
  });

  const uploadToTeam = async (file) => {
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Determine analysis depth
      const analysisPrompt = `You are an expert fraud detection analyst. Perform RIGOROUS, REPRODUCIBLE analysis with strict consistency. BE HARSH ON SPARSE/GENERIC RESUMES.

CURRENT DATE FOR CONTEXT: ${new Date().toISOString().split('T')[0]}

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

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        file_urls: [file_url],
        response_json_schema: {
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
            interview_questions: { type: "array", items: { type: "string" } }
          },
          required: ["overall_score", "consistency_score", "experience_verification", "education_verification", "skills_alignment", "red_flags", "green_flags", "summary", "next_steps", "interview_questions"]
        }
      });

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
        interview_questions: analysis.interview_questions || []
      };

      // Create candidate record for the team
      await base44.entities.Candidate.create({
        name: analysis.candidate_name || 'Unknown Candidate',
        email: analysis.candidate_email || '',
        resume_url: file_url,
        legitimacy_score: analysis.overall_score,
        analysis: analysisData,
        status: 'analyzed',
        team_id: teamId
      });

      queryClient.invalidateQueries({ queryKey: ['teamScans'] });
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to analyze resume');
    }
    setIsUploading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" className="mb-6 text-white hover:text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="text-center">
            <p className="text-white/60">Team not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 md:py-12">
        <Link to={createPageUrl('Home')}>
          <Button variant="ghost" className="mb-6 text-white hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{team.name}</h1>
          <p className="text-white/60">Team collaboration workspace</p>
        </motion.div>

        <div className="flex gap-3 mb-8">
          <Button
            variant={view === 'folders' ? 'default' : 'outline'}
            onClick={() => setView('folders')}
            className={
              view === 'folders'
                ? 'bg-white hover:bg-gray-100 text-black font-medium'
                : 'border-white/20 bg-transparent text-white hover:text-white hover:bg-white/10'
            }
          >
            <Folder className="w-4 h-4 mr-2" />
            Shared Folders
          </Button>
          <Button
            variant={view === 'scans' ? 'default' : 'outline'}
            onClick={() => setView('scans')}
            className={
              view === 'scans'
                ? 'bg-white hover:bg-gray-100 text-black font-medium'
                : 'border-white/20 bg-transparent text-white hover:text-white hover:bg-white/10'
            }
          >
            <FileText className="w-4 h-4 mr-2" />
            One-off Scans
          </Button>
        </div>

        {view === 'folders' && (
          <div className="grid gap-4">
            <div className="text-white/60 text-sm">
              Members' personal saved candidate folders available for team collaboration
            </div>
            {teamFolders.length > 0 ? (
              teamFolders.map((folder) => (
                <motion.div
                  key={folder.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => {
                    setSelectedFolderId(folder.id);
                    setView('scans');
                  }}
                  className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 cursor-pointer hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-white/5">
                      <Folder className="w-6 h-6 text-white/60" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{folder.name}</p>
                      <p className="text-white/50 text-sm">By {folder.owner_email}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-white/60">No shared folders yet. Team members can save candidates from their personal workspace.</p>
              </div>
            )}
          </div>
        )}

        {view === 'scans' && selectedFolderId === null && (
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-xl font-semibold text-white mb-4">Team One-off Scans</h2>
              <UploadZone onUpload={uploadToTeam} isUploading={isUploading} />
            </motion.div>

            {teamScans.length > 0 && (
              <div className="space-y-4">
                {teamScans.map((scan, index) => (
                  <motion.div
                    key={scan.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{scan.name}</p>
                        <p className="text-white/50 text-sm">{scan.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-white">{scan.legitimacy_score}%</p>
                        <p className="text-white/50 text-xs">Legitimacy</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'scans' && selectedFolderId && (
          <div className="space-y-6">
            <Button
              variant="ghost"
              onClick={() => setSelectedFolderId(null)}
              className="text-white hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Folders
            </Button>

            <h2 className="text-xl font-semibold text-white">
              {teamFolders.find(f => f.id === selectedFolderId)?.name}
            </h2>

            {teamScans.length > 0 ? (
              <div className="space-y-4">
                {teamScans.map((scan, index) => (
                  <motion.div
                    key={scan.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{scan.name}</p>
                        <p className="text-white/50 text-sm">{scan.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-white">{scan.legitimacy_score}%</p>
                        <p className="text-white/50 text-xs">Legitimacy</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-white/60">No candidates in this folder</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}