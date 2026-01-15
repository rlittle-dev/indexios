import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Shield, User, Briefcase, GraduationCap, Sparkles, ExternalLink, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ScoreCircle from '@/components/score/ScoreCircle';
import AnalysisCard from '@/components/score/AnalysisCard';
import FlagsList from '@/components/score/FlagsList';

export default function SharedReport() {
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCandidate = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const candidateId = urlParams.get('id');
        
        if (!candidateId) {
          setError('No report ID provided');
          setLoading(false);
          return;
        }

        // Use service role to fetch the candidate (no auth required)
        const response = await base44.functions.invoke('getSharedCandidate', { candidateId });
        
        if (response.data.error) {
          setError(response.data.error);
        } else {
          setCandidate(response.data.candidate);
        }
      } catch (err) {
        console.error('Error loading report:', err);
        setError('Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    loadCandidate();
  }, []);

  if (loading) {
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

  if (error || !candidate) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl mx-auto px-4 py-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-4xl font-black bg-gradient-to-r from-purple-400 to-white bg-clip-text text-transparent mb-8">
              Indexios
            </div>
            
            <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-8 border border-zinc-800">
              <Shield className="w-12 h-12 text-white/40 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Report Not Found</h2>
              <p className="text-white/60 mb-6">{error || 'This report is not available'}</p>
              <Link to={createPageUrl('Home')}>
                <Button className="bg-white hover:bg-gray-100 text-black font-medium">
                  Go to Indexios
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="text-3xl font-black bg-gradient-to-r from-purple-400 to-white bg-clip-text text-transparent mb-4">
            Indexios
          </div>
          <h2 className="text-xl md:text-2xl font-semibold text-white mb-2">
            Shared Resume Analysis
          </h2>
          <p className="text-white/60">
            AI-powered verification report
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Candidate Header */}
          <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-800">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <ScoreCircle score={candidate.legitimacy_score || 0} />

              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold text-white mb-1">
                  {candidate.name || 'Unknown Candidate'}
                </h2>
                {candidate.email && (
                  <p className="text-white/60">{candidate.email}</p>
                )}
                {candidate.analysis?.summary && (
                  <p className="text-white/70 mt-3 text-sm leading-relaxed">
                    {candidate.analysis.summary}
                  </p>
                )}
                {candidate.resume_url && (
                  <a
                    href={candidate.resume_url}
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
          {candidate.analysis && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <AnalysisCard
                  title="Consistency"
                  score={candidate.analysis.consistency_score || 0}
                  details={candidate.analysis.consistency_details}
                  icon={User}
                  delay={0}
                  isBasic={candidate.analysis.is_basic}
                />
                <AnalysisCard
                  title="Experience"
                  score={candidate.analysis.experience_verification || 0}
                  details={candidate.analysis.experience_details}
                  icon={Briefcase}
                  delay={0.1}
                  isBasic={candidate.analysis.is_basic}
                />
              </div>

              <FlagsList
                redFlags={candidate.analysis.red_flags || []}
                greenFlags={candidate.analysis.green_flags || []}
                isBasic={candidate.analysis.is_basic}
              />
            </>
          )}

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-2 border-purple-500/60 rounded-xl p-6 text-center"
          >
            <Shield className="w-8 h-8 text-purple-400 mx-auto mb-3" />
            <h3 className="text-white font-semibold mb-2">Create Your Own Analysis</h3>
            <p className="text-white/70 text-sm mb-4">
              Verify resumes instantly with AI-powered fraud detection
            </p>
            <Link to={createPageUrl('Home')}>
              <Button className="bg-white hover:bg-gray-100 text-black font-medium">
                Try Indexios Free
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}