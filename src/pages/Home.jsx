import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Shield, Zap, Target, CheckCircle2, ArrowRight, User, Briefcase, GraduationCap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ScoreCircle from '@/components/score/ScoreCircle';

export default function Home() {
  // Example scan data for demonstration
  const exampleScan = {
    name: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    legitimacy_score: 87,
    analysis: {
      consistency_score: 92,
      experience_verification: 85,
      education_verification: 88,
      skills_alignment: 83,
      red_flags: [
        "Minor 2-month gap between roles in 2023",
        "One certification lacks verification details"
      ],
      green_flags: [
        "5+ years consistent tenure at Fortune 500 companies",
        "Quantified achievements with specific metrics (30% revenue increase)",
        "Top-tier university credentials (MIT, Computer Science)",
        "Clear skill progression aligned with career trajectory",
        "Published research papers and patents cited"
      ],
      summary: "Strong candidate with verifiable credentials and impressive track record. Minor gaps are well within acceptable range and don't indicate fraud risk. Demonstrates genuine expertise with quantifiable achievements."
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
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 md:py-20">
          
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6"
            >
              <span className="text-purple-300 text-sm font-medium">AI-Powered Resume Verification</span>
            </motion.div>
            
            <h1 className="text-5xl md:text-7xl font-black bg-gradient-to-r from-purple-400 via-white to-purple-400 bg-clip-text text-transparent mb-6 leading-tight">
              Detect Resume Fraud<br />Instantly
            </h1>
            
            <p className="text-xl md:text-2xl text-white/70 max-w-3xl mx-auto mb-8 leading-relaxed">
              Make confident hiring decisions with AI-powered resume verification. Get instant legitimacy scores and detailed fraud analysis.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to={createPageUrl('Scan')}>
                <Button size="lg" className="bg-white hover:bg-gray-100 text-black font-semibold text-lg px-8 py-6">
                  Scan Resume Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to={createPageUrl('Pricing')}>
                <Button size="lg" variant="outline" className="border-white/20 bg-transparent text-white hover:text-white hover:bg-white/10 hover:border-white/40 text-lg px-8 py-6">
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
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                See How It Works
              </h2>
              <p className="text-white/60 text-lg">
                Here's an example of our detailed resume analysis
              </p>
            </div>

            <div className="bg-zinc-900/80 backdrop-blur-sm rounded-3xl p-6 md:p-10 border border-zinc-800 shadow-2xl">
              {/* Example Header */}
              <div className="flex flex-col md:flex-row items-center gap-6 mb-8 pb-8 border-b border-zinc-800">
                <ScoreCircle score={exampleScan.legitimacy_score} />
                
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-flex px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-2">
                    <span className="text-emerald-300 text-xs font-medium">Example Analysis</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-1">
                    {exampleScan.name}
                  </h3>
                  <p className="text-white/60 mb-3">{exampleScan.email}</p>
                  <p className="text-white/70 text-sm leading-relaxed">
                    {exampleScan.analysis.summary}
                  </p>
                </div>
              </div>

              {/* Analysis Breakdown */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <User className="w-5 h-5 text-blue-400" />
                    </div>
                    <h4 className="font-semibold text-white">Consistency</h4>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{exampleScan.analysis.consistency_score}%</div>
                  <div className="w-full bg-zinc-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${exampleScan.analysis.consistency_score}%` }}
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Briefcase className="w-5 h-5 text-purple-400" />
                    </div>
                    <h4 className="font-semibold text-white">Experience</h4>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{exampleScan.analysis.experience_verification}%</div>
                  <div className="w-full bg-zinc-700 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${exampleScan.analysis.experience_verification}%` }}
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <GraduationCap className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h4 className="font-semibold text-white">Education</h4>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{exampleScan.analysis.education_verification}%</div>
                  <div className="w-full bg-zinc-700 rounded-full h-2">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${exampleScan.analysis.education_verification}%` }}
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-yellow-500/10">
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                    </div>
                    <h4 className="font-semibold text-white">Skills</h4>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{exampleScan.analysis.skills_alignment}%</div>
                  <div className="w-full bg-zinc-700 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${exampleScan.analysis.skills_alignment}%` }}
                    />
                  </div>
                </motion.div>
              </div>

              {/* Flags */}
              <div className="grid md:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                  className="bg-emerald-500/5 rounded-xl p-5 border border-emerald-500/20"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <h4 className="font-semibold text-white">Green Flags ({exampleScan.analysis.green_flags.length})</h4>
                  </div>
                  <ul className="space-y-2">
                    {exampleScan.analysis.green_flags.map((flag, i) => (
                      <li key={i} className="flex items-start gap-2 text-white/80 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                        <span>{flag}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                  className="bg-yellow-500/5 rounded-xl p-5 border border-yellow-500/20"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-yellow-400" />
                    <h4 className="font-semibold text-white">Red Flags ({exampleScan.analysis.red_flags.length})</h4>
                  </div>
                  <ul className="space-y-2">
                    {exampleScan.analysis.red_flags.map((flag, i) => (
                      <li key={i} className="flex items-start gap-2 text-white/80 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                        <span>{flag}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>

              <div className="mt-8 text-center">
                <Link to={createPageUrl('Scan')}>
                  <Button size="lg" className="bg-white hover:bg-gray-100 text-black font-semibold">
                    Try It With Your Resume
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Features Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-20"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                Why Choose Indexios?
              </h2>
              <p className="text-white/60 text-lg">
                Advanced AI technology meets hiring expertise
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <div className="inline-flex p-3 rounded-xl bg-purple-500/10 mb-4">
                  <Shield className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Fraud Detection</h3>
                <p className="text-white/70">
                  Identify inconsistencies, fabricated credentials, and inflated claims with AI-powered analysis
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <div className="inline-flex p-3 rounded-xl bg-emerald-500/10 mb-4">
                  <Zap className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Instant Results</h3>
                <p className="text-white/70">
                  Get comprehensive verification reports in seconds, not days. Make faster hiring decisions
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <div className="inline-flex p-3 rounded-xl bg-blue-500/10 mb-4">
                  <Target className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Actionable Insights</h3>
                <p className="text-white/70">
                  Receive detailed recommendations and interview questions tailored to each candidate
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-2 border-purple-500/60 rounded-3xl p-10 md:p-16 text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Make Smarter Hiring Decisions?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
              Join teams already using Indexios to verify resumes and protect against fraud
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={createPageUrl('Scan')}>
                <Button size="lg" className="bg-white hover:bg-gray-100 text-black font-semibold text-lg px-8">
                  Start Free Scan
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to={createPageUrl('About')}>
                <Button size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:text-white hover:bg-white/10 text-lg px-8">
                  Learn More
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}