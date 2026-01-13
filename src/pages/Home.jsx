import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Shield, Zap, CheckCircle2, Users, ArrowRight, Sparkles, User, Briefcase, GraduationCap, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ScoreCircle from '@/components/score/ScoreCircle';

export default function Home() {
  // Example scan data to display
  const exampleScan = {
    name: "Sarah Chen",
    email: "sarah.chen@example.com",
    legitimacy_score: 82,
    analysis: {
      consistency_score: 85,
      experience_verification: 78,
      education_verification: 88,
      skills_alignment: 80,
      red_flags: [
        "3-month gap between jobs (Nov 2022 - Feb 2023)",
        "One role description lacks specific metrics"
      ],
      green_flags: [
        "Clear career progression from Junior to Senior roles",
        "Strong quantified achievements (increased revenue by 35%)",
        "Top-tier university education (MIT)",
        "Consistent 3+ year tenure at each company"
      ],
      summary: "Strong candidate with verifiable credentials and clear career progression. Minor gap explained by skill development period. Overall credibility is high with concrete achievements and recognized institutions."
    }
  };

  return (
    <>
      <Helmet>
        <title>Indexios - AI Resume Verification | Detect Fraudulent Resumes Instantly</title>
        <meta name="description" content="Verify resume authenticity with AI-powered fraud detection. Indexios analyzes credentials, experience, and education to provide instant legitimacy scores. Start with 3 free scans." />
        <link rel="canonical" href="https://indexios.me/" />
        <meta property="og:title" content="Indexios - AI Resume Verification Platform" />
        <meta property="og:description" content="Detect fraudulent resumes instantly with AI-powered verification. Free scans available." />
        <meta property="og:url" content="https://indexios.me/" />
        <meta property="og:type" content="website" />
      </Helmet>
      
      <div className="min-h-screen bg-zinc-950">
        {/* Background gradients */}
        <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 pointer-events-none" />
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-12 md:py-20">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-20"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-purple-200 text-sm font-medium">AI-Powered Resume Verification</span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-black bg-gradient-to-r from-purple-400 via-white to-purple-400 bg-clip-text text-transparent mb-6 leading-tight">
              Hire with Confidence
            </h1>
            
            <p className="text-xl md:text-2xl text-white/70 max-w-3xl mx-auto mb-10 leading-relaxed">
              Detect fraudulent resumes instantly with advanced AI analysis. Verify credentials, experience, and education in seconds.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to={createPageUrl('Scan')}>
                <Button size="lg" className="bg-white hover:bg-gray-100 text-black font-bold text-lg px-8 py-6 h-auto">
                  Scan Resume Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to={createPageUrl('Pricing')}>
                <Button size="lg" variant="outline" className="border-white/20 bg-transparent text-white hover:text-white hover:bg-white/10 hover:border-white/40 text-lg px-8 py-6 h-auto">
                  View Pricing
                </Button>
              </Link>
            </div>

            <p className="text-white/50 text-sm mt-6">
              Start with 3 free scans • No credit card required
            </p>
          </motion.div>

          {/* Example Scan Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-20"
          >
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                See It In Action
              </h2>
              <p className="text-white/60 text-lg">
                Here's what a typical resume analysis looks like
              </p>
            </div>

            <div className="bg-zinc-900/80 backdrop-blur-sm rounded-3xl p-6 md:p-10 border border-zinc-800 shadow-2xl">
              {/* Candidate Header */}
              <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
                <ScoreCircle score={exampleScan.legitimacy_score} />
                
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-3xl font-bold text-white mb-2">
                    {exampleScan.name}
                  </h3>
                  <p className="text-white/60 mb-4">{exampleScan.email}</p>
                  <p className="text-white/70 leading-relaxed">
                    {exampleScan.analysis.summary}
                  </p>
                </div>
              </div>

              {/* Analysis Breakdown */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-zinc-800/50 rounded-xl p-5 border border-zinc-700">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <User className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="text-white/80 font-medium">Consistency</span>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">
                    {exampleScan.analysis.consistency_score}%
                  </div>
                  <div className="w-full bg-zinc-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full"
                      style={{ width: `${exampleScan.analysis.consistency_score}%` }}
                    />
                  </div>
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-5 border border-zinc-700">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Briefcase className="w-5 h-5 text-purple-400" />
                    </div>
                    <span className="text-white/80 font-medium">Experience</span>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">
                    {exampleScan.analysis.experience_verification}%
                  </div>
                  <div className="w-full bg-zinc-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full"
                      style={{ width: `${exampleScan.analysis.experience_verification}%` }}
                    />
                  </div>
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-5 border border-zinc-700">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <GraduationCap className="w-5 h-5 text-emerald-400" />
                    </div>
                    <span className="text-white/80 font-medium">Education</span>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">
                    {exampleScan.analysis.education_verification}%
                  </div>
                  <div className="w-full bg-zinc-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full"
                      style={{ width: `${exampleScan.analysis.education_verification}%` }}
                    />
                  </div>
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-5 border border-zinc-700">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-yellow-500/10">
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                    </div>
                    <span className="text-white/80 font-medium">Skills</span>
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">
                    {exampleScan.analysis.skills_alignment}%
                  </div>
                  <div className="w-full bg-zinc-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-yellow-500 to-yellow-400 h-2 rounded-full"
                      style={{ width: `${exampleScan.analysis.skills_alignment}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Flags */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <h4 className="text-white font-semibold">Red Flags ({exampleScan.analysis.red_flags.length})</h4>
                  </div>
                  <ul className="space-y-2">
                    {exampleScan.analysis.red_flags.map((flag, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-white/70 text-sm">
                        <span className="text-red-400 mt-0.5">•</span>
                        <span>{flag}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <h4 className="text-white font-semibold">Green Flags ({exampleScan.analysis.green_flags.length})</h4>
                  </div>
                  <ul className="space-y-2">
                    {exampleScan.analysis.green_flags.map((flag, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-white/70 text-sm">
                        <span className="text-emerald-400 mt-0.5">•</span>
                        <span>{flag}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 text-center">
                <Link to={createPageUrl('Scan')}>
                  <Button size="lg" className="bg-white hover:bg-gray-100 text-black font-semibold">
                    Try It Yourself - Scan Now
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Features Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="grid md:grid-cols-3 gap-8 mb-20"
          >
            <div className="bg-zinc-900/60 backdrop-blur-sm rounded-2xl p-8 border border-zinc-800">
              <div className="inline-flex p-3 rounded-xl bg-purple-500/10 mb-4">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Advanced Detection</h3>
              <p className="text-white/70 leading-relaxed">
                AI analyzes every aspect of a resume to detect inconsistencies, verify credentials, and flag potential fraud.
              </p>
            </div>

            <div className="bg-zinc-900/60 backdrop-blur-sm rounded-2xl p-8 border border-zinc-800">
              <div className="inline-flex p-3 rounded-xl bg-indigo-500/10 mb-4">
                <Zap className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Instant Results</h3>
              <p className="text-white/70 leading-relaxed">
                Get comprehensive verification reports in seconds. Make faster hiring decisions without compromising accuracy.
              </p>
            </div>

            <div className="bg-zinc-900/60 backdrop-blur-sm rounded-2xl p-8 border border-zinc-800">
              <div className="inline-flex p-3 rounded-xl bg-emerald-500/10 mb-4">
                <Users className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Team Collaboration</h3>
              <p className="text-white/70 leading-relaxed">
                Share reports with your team, collaborate on evaluations, and streamline your entire hiring workflow.
              </p>
            </div>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-2 border-purple-500/60 rounded-3xl p-12 text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Transform Your Hiring Process?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
              Join teams already using Indexios to make smarter, safer hiring decisions with confidence.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to={createPageUrl('Scan')}>
                <Button size="lg" className="bg-white hover:bg-gray-100 text-black font-bold text-lg px-8 py-6 h-auto">
                  Start Scanning Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to={createPageUrl('Pricing')}>
                <Button size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:text-white hover:bg-white/10 hover:border-white/60 text-lg px-8 py-6 h-auto">
                  View Plans
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}