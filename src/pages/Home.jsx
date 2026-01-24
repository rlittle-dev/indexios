import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Shield, Phone, Link2, Target, ArrowRight, User, Briefcase, GraduationCap, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ScoreCircle from '@/components/score/ScoreCircle';
import AnalysisCard from '@/components/score/AnalysisCard';
import FlagsList from '@/components/score/FlagsList';
import NextSteps from '@/components/score/NextSteps';
import GradientBackground from '@/components/ui/GradientBackground';
import GlassCard from '@/components/ui/GlassCard';
import SectionHeader from '@/components/ui/SectionHeader';
import FeatureCard from '@/components/ui/FeatureCard';

export default function Home() {
  const exampleScan = {
    name: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    legitimacy_score: 87,
    analysis: {
      consistency_score: 92,
      consistency_details: "Sarah's employment timeline demonstrates excellent consistency throughout her career. She maintained continuous employment from June 2018 to present with only one minor 2-month gap between her position at TechCorp (ended March 2023) and her current role at InnovateLabs (started May 2023). This brief gap is well within acceptable industry standards.",
      experience_verification: 85,
      experience_details: "Sarah demonstrates strong verifiable experience with concrete, quantifiable achievements. At TechCorp, she led the development of a payment processing system that handled $50M+ in transactions and increased processing speed by 35%.",
      education_verification: 88,
      education_details: "Sarah holds a Bachelor of Science in Computer Science from MIT, graduating in May 2018 with a 3.8 GPA. MIT is a top-tier, globally recognized institution (#1-5 for Computer Science programs).",
      skills_alignment: 83,
      skills_details: "Skills demonstrate clear progression and strong alignment with her roles. She lists Python, Java, and JavaScript as primary languages, all standard for backend/full-stack engineering.",
      red_flags: [
        "Minor 2-month gap between TechCorp and InnovateLabs (Mar-May 2023)",
        "One AWS certification mentioned but lacks specific credential ID"
      ],
      green_flags: [
        "✅ Employment verified via automated HR phone call (TechCorp confirmed)",
        "✅ Verification attestation recorded on blockchain",
        "5+ years consistent tenure at each company",
        "Quantified achievements with specific metrics (35% speed increase)",
        "Elite university credentials from MIT with strong GPA (3.8)",
        "Clear career progression from Junior to Senior Software Engineer"
      ],
      summary: "Sarah Johnson presents as a strong candidate with highly verifiable credentials. Her MIT Computer Science degree combined with 5+ years of progressive experience establishes excellent credibility.",
      next_steps: [
        "Verify MIT degree with university registrar",
        "Conduct reference checks with managers at TechCorp",
        "Request AWS certification credential ID"
      ],
      interview_questions: [
        "Walk me through the architecture of the $50M+ payment processing system",
        "How did you achieve the 35% speed improvement?",
        "What did you focus on during the gap between TechCorp and InnovateLabs?"
      ]
    }
  };

  return (
    <>
      <Helmet>
        <title>Indexios - AI Resume Verification | Detect Fraudulent Resumes Instantly</title>
        <meta name="description" content="Verify resume authenticity with AI-powered fraud detection. Indexios analyzes credentials, experience, and education to provide instant legitimacy scores." />
        <link rel="canonical" href="https://indexios.me/" />
        <meta property="og:title" content="Indexios - AI Resume Verification Platform" />
        <meta property="og:description" content="Detect fraudulent resumes instantly with AI-powered verification." />
        <meta property="og:url" content="https://indexios.me/" />
        <meta property="og:type" content="website" />
      </Helmet>
      
      <GradientBackground variant="purple">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mb-20"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 mb-8"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-purple-300/90 text-sm font-medium tracking-wide">AI-Powered Verification</span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
            >
              <span className="bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent">
                Verify Resume
              </span>
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-purple-300 to-blue-400 bg-clip-text text-transparent">
                Authenticity
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg md:text-xl text-white/40 max-w-2xl mx-auto mb-10 leading-relaxed font-light"
            >
              Make confident hiring decisions with advanced fraud detection, 
              automated employment verification, and blockchain-backed attestations.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link to={createPageUrl('Scan')}>
                <Button size="lg" className="bg-white hover:bg-white/90 text-black font-semibold text-base px-8 h-12 rounded-xl shadow-lg shadow-white/10 transition-all hover:shadow-xl hover:shadow-white/20">
                  Scan Resume Now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to={createPageUrl('Pricing')}>
                <Button size="lg" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/5 font-medium text-base px-8 h-12 rounded-xl">
                  View Pricing
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </motion.div>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-white/30 text-sm mt-8 font-light"
            >
              3 free scans • No credit card • No login required
            </motion.p>
          </motion.div>

          {/* Example Scan Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-24"
          >
            <SectionHeader
              title="See It In Action"
              subtitle="Real-time analysis with detailed verification insights"
              className="mb-10"
            />

            <GlassCard className="p-6 md:p-10" gradient>
              {/* Example Header */}
              <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
                <ScoreCircle score={exampleScan.legitimacy_score} />
                
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-flex px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-3">
                    <span className="text-emerald-400/90 text-xs font-medium">Example Analysis</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-1 tracking-tight">
                    {exampleScan.name}
                  </h3>
                  <p className="text-white/40 text-sm mb-4">{exampleScan.email}</p>
                  <p className="text-white/50 text-sm leading-relaxed">
                    {exampleScan.analysis.summary}
                  </p>
                </div>
              </div>

              {/* Analysis Breakdown */}
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <AnalysisCard
                  title="Consistency"
                  score={exampleScan.analysis.consistency_score}
                  details={exampleScan.analysis.consistency_details}
                  icon={User}
                  delay={0}
                />
                <AnalysisCard
                  title="Experience"
                  score={exampleScan.analysis.experience_verification}
                  details={exampleScan.analysis.experience_details}
                  icon={Briefcase}
                  delay={0.1}
                />
                <AnalysisCard
                  title="Education"
                  score={exampleScan.analysis.education_verification}
                  details={exampleScan.analysis.education_details}
                  icon={GraduationCap}
                  delay={0.2}
                />
                <AnalysisCard
                  title="Skills Alignment"
                  score={exampleScan.analysis.skills_alignment}
                  details={exampleScan.analysis.skills_details}
                  icon={Sparkles}
                  delay={0.3}
                />
              </div>

              <FlagsList
                redFlags={exampleScan.analysis.red_flags}
                greenFlags={exampleScan.analysis.green_flags}
              />

              <NextSteps
                nextSteps={exampleScan.analysis.next_steps}
                interviewQuestions={exampleScan.analysis.interview_questions}
              />

              <div className="text-center pt-6">
                <Link to={createPageUrl('Scan')}>
                  <Button className="bg-white hover:bg-white/90 text-black font-semibold px-8 h-11 rounded-xl">
                    Try With Your Resume
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </GlassCard>
          </motion.div>

          {/* Features Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-24"
          >
            <SectionHeader
              title="Why Indexios?"
              subtitle="Advanced verification technology that goes beyond the résumé"
              className="mb-12"
            />

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              <FeatureCard
                icon={Shield}
                title="Fraud Detection"
                description="Identify inconsistencies, fabricated credentials, and inflated claims with AI analysis"
                color="purple"
                delay={0.1}
              />
              <FeatureCard
                icon={Phone}
                title="Phone Verification"
                description="Automated calls to HR departments verify employment history directly"
                color="green"
                delay={0.15}
              />
              <FeatureCard
                icon={Link2}
                title="Blockchain Attestations"
                description="Verified records permanently stored on-chain for tamper-proof credentials"
                color="blue"
                delay={0.2}
              />
              <FeatureCard
                icon={Target}
                title="Actionable Insights"
                description="Receive tailored recommendations and interview questions for each candidate"
                color="orange"
                delay={0.25}
              />
            </div>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <GlassCard className="p-10 md:p-16 text-center" gradient>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                Ready to Make Smarter Hiring Decisions?
              </h2>
              <p className="text-white/40 text-lg mb-8 max-w-xl mx-auto font-light">
                Join teams already using Indexios to verify resumes and protect against fraud
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to={createPageUrl('Scan')}>
                  <Button size="lg" className="bg-white hover:bg-white/90 text-black font-semibold px-8 h-12 rounded-xl">
                    Start Free Scan
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to={createPageUrl('About')}>
                  <Button size="lg" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/5 font-medium px-8 h-12 rounded-xl">
                    Learn More
                  </Button>
                </Link>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </GradientBackground>
    </>
  );
}