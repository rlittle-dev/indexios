import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, History, User, Briefcase, GraduationCap, Sparkles, ArrowLeft, ExternalLink, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UploadZone from '@/components/upload/UploadZone';
import ScoreCircle from '@/components/score/ScoreCircle';
import AnalysisCard from '@/components/score/AnalysisCard';
import FlagsList from '@/components/score/FlagsList';
import CandidateCard from '@/components/candidates/CandidateCard';

export default function Home() {
  const [currentView, setCurrentView] = useState('upload'); // 'upload', 'result', 'history'
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      setIsAuthenticated(authenticated);
      setAuthLoading(false);
    };
    checkAuth();
  }, []);
  
  const { data: candidates = [], isLoading: candidatesLoading } = useQuery({
    queryKey: ['candidates'],
    queryFn: () => base44.entities.Candidate.list('-created_date', 50),
    enabled: isAuthenticated,
  });

  const analyzeResume = async (file) => {
    setIsUploading(true);
    
    // Upload the file
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    
    // Create candidate record
    const candidate = await base44.entities.Candidate.create({
      resume_url: file_url,
      status: 'pending'
    });
    
    // Analyze with LLM
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert HR analyst and background verification specialist. Analyze this resume for legitimacy and authenticity.

Evaluate the following aspects:
1. **Consistency Score**: Check for timeline gaps, overlapping dates, logical career progression
2. **Experience Verification**: Assess if job titles, responsibilities, and achievements seem realistic and verifiable
3. **Education Verification**: Check if degrees, institutions, and graduation dates seem legitimate
4. **Skills Alignment**: Verify if listed skills match the claimed experience and roles

Look for RED FLAGS such as:
- Unrealistic career progression (e.g., Junior to CEO in 2 years)
- Vague company descriptions or roles
- Too many jobs in short periods
- Exaggerated achievements without specifics
- Generic or buzzword-heavy descriptions
- Mismatched skills and experience
- Spelling/grammar inconsistencies in professional claims
- Unverifiable institutions or certifications

Look for GREEN FLAGS such as:
- Specific, measurable achievements
- Consistent career progression
- Recognized institutions and companies
- Detailed role descriptions
- Relevant certifications from known providers
- Clear contact information
- Quantified results and metrics

Provide a detailed analysis with percentage scores for each category and an overall legitimacy score.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          candidate_name: { type: "string" },
          candidate_email: { type: "string" },
          overall_score: { type: "number", description: "Overall legitimacy percentage 0-100" },
          consistency_score: { type: "number" },
          experience_verification: { type: "number" },
          education_verification: { type: "number" },
          skills_alignment: { type: "number" },
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
        experience_verification: analysis.experience_verification,
        education_verification: analysis.education_verification,
        skills_alignment: analysis.skills_alignment,
        red_flags: analysis.red_flags,
        green_flags: analysis.green_flags,
        summary: analysis.summary
      },
      status: 'analyzed'
    });
    
    setIsUploading(false);
    setSelectedCandidate(updatedCandidate);
    setCurrentView('result');
    queryClient.invalidateQueries({ queryKey: ['candidates'] });
  };

  const handleUpload = async (file) => {
    await analyzeResume(file);
  };

  const handleViewHistory = () => {
    setCurrentView('history');
  };

  const handleSelectCandidate = (candidate) => {
    setSelectedCandidate(candidate);
    setCurrentView('result');
  };

  const handleBack = () => {
    setCurrentView('upload');
    setSelectedCandidate(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
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
              className="text-lg text-zinc-400 mb-8 leading-relaxed"
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
                onClick={() => base44.auth.redirectToLogin()}
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-lg font-semibold rounded-xl"
              >
                Get Started
              </Button>
              <Button
                onClick={() => base44.auth.redirectToLogin()}
                size="lg"
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 px-8 py-6 text-lg rounded-xl"
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
                  className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center"
                >
                  <div className="inline-flex p-3 rounded-xl bg-emerald-500/10 mb-3">
                    <feature.icon className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                  <p className="text-zinc-500 text-sm">{feature.desc}</p>
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
          <p className="text-zinc-400 max-w-md mx-auto">
            Upload a resume to scan for legitimacy
          </p>
        </motion.div>

        {/* Navigation */}
        <div className="flex justify-center gap-3 mb-8">
          <Button
            variant={currentView === 'upload' ? 'default' : 'outline'}
            onClick={handleBack}
            className={currentView === 'upload' 
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
              : 'border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800'}
          >
            <Shield className="w-4 h-4 mr-2" />
            Scan Resume
          </Button>
          <Button
            variant={currentView === 'history' ? 'default' : 'outline'}
            onClick={handleViewHistory}
            className={currentView === 'history' 
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
              : 'border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800'}
          >
            <History className="w-4 h-4 mr-2" />
            History
            {candidates.length > 0 && (
              <span className="ml-2 bg-zinc-700 px-2 py-0.5 rounded-full text-xs">
                {candidates.length}
              </span>
            )}
          </Button>
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
              <UploadZone onUpload={handleUpload} isUploading={isUploading} />
              
              {/* Recent scans preview */}
              {candidates.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-8"
                >
                  <h3 className="text-zinc-500 text-sm font-medium mb-3">Recent Scans</h3>
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
                className="text-zinc-400 hover:text-white -ml-2"
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
                      <p className="text-zinc-400">{selectedCandidate.email}</p>
                    )}
                    {selectedCandidate.analysis?.summary && (
                      <p className="text-zinc-500 mt-3 text-sm leading-relaxed">
                        {selectedCandidate.analysis.summary}
                      </p>
                    )}
                    {selectedCandidate.resume_url && (
                      <a
                        href={selectedCandidate.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-4 text-emerald-500 hover:text-emerald-400 text-sm font-medium transition-colors"
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
                      icon={User}
                      delay={0}
                    />
                    <AnalysisCard
                      title="Experience"
                      score={selectedCandidate.analysis.experience_verification || 0}
                      icon={Briefcase}
                      delay={0.1}
                    />
                    <AnalysisCard
                      title="Education"
                      score={selectedCandidate.analysis.education_verification || 0}
                      icon={GraduationCap}
                      delay={0.2}
                    />
                    <AnalysisCard
                      title="Skills Alignment"
                      score={selectedCandidate.analysis.skills_alignment || 0}
                      icon={Sparkles}
                      delay={0.3}
                    />
                  </div>

                  <FlagsList
                    redFlags={selectedCandidate.analysis.red_flags || []}
                    greenFlags={selectedCandidate.analysis.green_flags || []}
                  />
                </>
              )}
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
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
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
                    <History className="w-8 h-8 text-zinc-600" />
                  </div>
                  <p className="text-zinc-500">No scanned resumes yet</p>
                  <Button
                    onClick={handleBack}
                    className="mt-4 bg-emerald-600 hover:bg-emerald-700"
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